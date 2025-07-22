/**
 * Sistema de Monitoramento de Biomas Brasileiros - Versão 3.0
 * Melhorias implementadas:
 * 1. Sistema de autenticação e perfis de usuário
 * 2. Análise preditiva com machine learning
 * 3. Exportação de relatórios
 * 4. Monitoramento offline
 * 5. Integração com imagens de satélite históricas
 */

// Configurações globais ampliadas
const CONFIG = {
  API: {
    BASE_URL: 'https://api.brasilbiomes.org/v2',
    ENDPOINTS: {
      AUTH: '/auth',
      BIOMES: '/biomes',
      FIRES: '/fires',
      VEGETATION: '/vegetation',
      STATS: '/stats',
      PREDICTIONS: '/predictions',
      HISTORICAL: '/historical'
    },
    CACHE_TTL: 3600000,
    OFFLINE_THRESHOLD: 30000 // 30 segundos para timeout
  },
  MAP: {
    DEFAULT_VIEW: [-15.788, -47.879],
    DEFAULT_ZOOM: 4,
    TILE_LAYERS: {
      // ... (camadas anteriores mantidas)
      HISTORICAL: {
        url: 'https://tiles.brasilbiomes.org/historical/{year}/{z}/{x}/{y}.png',
        attribution: 'Imagens históricas © Brasil Biomes'
      }
    }
  },
  // ... (outras configurações mantidas)
  USER_ROLES: {
    ADMIN: 'admin',
    RESEARCHER: 'researcher',
    PUBLIC: 'public'
  }
};

class BiomaMonitor {
  constructor() {
    this.maps = {};
    this.dataCache = {};
    this.currentFilters = {};
    this.user = null;
    this.offline = false;
    this.predictiveModels = {};
    this.init();
  }

  async init() {
    this.checkConnectivity();
    this.setupServiceWorker();
    
    if (!this.checkDependencies()) return;
    
    try {
      await this.authenticate();
      await this.loadInitialData();
      this.initUI();
      this.setupRealTimeUpdates();
      this.loadPredictiveModels();
    } catch (error) {
      this.handleInitError(error);
    }
  }

  // Novos métodos de autenticação
  async authenticate() {
    const token = localStorage.getItem('biome-auth-token');
    if (token) {
      try {
        this.user = await this.validateToken(token);
        return;
      } catch (e) {
        console.warn('Token inválido', e);
      }
    }
    this.user = await this.anonymousLogin();
  }

  async validateToken(token) {
    const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH}/validate`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Token inválido');
    return response.json();
  }

  async anonymousLogin() {
    const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH}/anonymous`);
    if (!response.ok) throw new Error('Falha no login anônimo');
    const data = await response.json();
    localStorage.setItem('biome-auth-token', data.token);
    return data.user;
  }

  // Verificação de conectividade aprimorada
  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.API.OFFLINE_THRESHOLD);
      
      await fetch(`${CONFIG.API.BASE_URL}/health`, { 
        signal: controller.signal 
      });
      
      clearTimeout(timeout);
      this.offline = false;
    } catch (error) {
      this.offline = true;
      this.showNotification('Modo offline ativado. Algumas funcionalidades podem estar limitadas.', 'warning', 10000);
    }
  }

  // Service Worker para funcionalidade offline
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registrado');
          this.serviceWorker = registration;
        })
        .catch(err => console.error('ServiceWorker falhou:', err));
    }
  }

  // Carregamento de modelos preditivos
  async loadPredictiveModels() {
    if (this.offline) return;
    
    try {
      const models = await this.fetchWithCache('predictions');
      this.predictiveModels = models;
      
      // Carrega TensorFlow.js apenas quando necessário
      if (models.useTFJS && !window.tf) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.0.0/dist/tf.min.js');
      }
    } catch (error) {
      console.error('Erro ao carregar modelos preditivos:', error);
    }
  }

  // Método para carregar scripts dinamicamente
  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Análise preditiva
  async predictRisk(biome, date) {
    if (!this.predictiveModels[biome]) {
      throw new Error('Modelo não disponível para este bioma');
    }

    if (this.predictiveModels[biome].type === 'regression') {
      // Implementação simplificada de modelo preditivo
      const baseRisk = CONFIG.BIOMES[biome].baseRisk || 0.5;
      const seasonalFactor = this.calculateSeasonalFactor(date);
      return baseRisk * seasonalFactor;
    } else if (this.predictiveModels[biome].type === 'tfjs') {
      // Implementação com TensorFlow.js
      return this.runTFJSPrediction(biome, date);
    }
  }

  // UI aprimorada com abas dinâmicas
  initUI() {
    this.initMaps();
    this.initCharts();
    this.setupEventListeners();
    this.setupDynamicTabs();
    this.setupExportButtons();
    this.updateUIBasedOnRole();
  }

  // Controle de acesso baseado em roles
  updateUIBasedOnRole() {
    const adminElements = document.querySelectorAll('.admin-only');
    const researcherElements = document.querySelectorAll('.researcher-only');
    
    adminElements.forEach(el => {
      el.style.display = this.user.role === CONFIG.USER_ROLES.ADMIN ? 'block' : 'none';
    });
    
    researcherElements.forEach(el => {
      el.style.display = 
        [CONFIG.USER_ROLES.ADMIN, CONFIG.USER_ROLES.RESEARCHER].includes(this.user.role) 
        ? 'block' : 'none';
    });
  }

  // Sistema de abas dinâmicas
  setupDynamicTabs() {
    const tabContainer = document.getElementById('dynamic-tabs');
    if (!tabContainer) return;

    const tabs = {
      "Visão Geral": this.createOverviewTab,
      "Análise Temporal": this.createTemporalAnalysisTab,
      "Risco Predito": this.createPredictionTab,
      "Histórico": this.createHistoricalTab
    };

    if (this.user.role === CONFIG.USER_ROLES.ADMIN) {
      tabs["Admin"] = this.createAdminTab;
    }

    Object.entries(tabs).forEach(([title, creator]) => {
      const tab = document.createElement('button');
      tab.className = 'tab-btn';
      tab.textContent = title;
      tab.addEventListener('click', () => this.handleTabChange(title, creator));
      tabContainer.appendChild(tab);
    });

    // Ativa a primeira aba
    this.handleTabChange(Object.keys(tabs)[0], tabs[Object.keys(tabs)[0]]);
  }

  // Exportação de dados
  setupExportButtons() {
    document.getElementById('export-png')?.addEventListener('click', () => this.exportAsPNG());
    document.getElementById('export-csv')?.addEventListener('click', () => this.exportAsCSV());
    document.getElementById('export-pdf')?.addEventListener('click', () => this.exportAsPDF());
  }

  async exportAsPNG() {
    // Implementação simplificada - usar biblioteca como html2canvas
    const mapElement = document.getElementById('satellite-map');
    if (window.html2canvas) {
      const canvas = await html2canvas(mapElement);
      const link = document.createElement('a');
      link.download = `biomas-${new Date().toISOString()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  }

  // Mapa histórico
  initHistoricalMap() {
    const map = this.initBaseMap('historical-map');
    
    const yearSelector = document.createElement('div');
    yearSelector.className = 'year-selector';
    yearSelector.innerHTML = `
      <input type="range" min="2000" max="${new Date().getFullYear()}" value="2020" id="year-slider">
      <span id="year-display">2020</span>
    `;
    
    map.getContainer().appendChild(yearSelector);
    
    let historicalLayer;
    const slider = yearSelector.querySelector('#year-slider');
    const display = yearSelector.querySelector('#year-display');
    
    slider.addEventListener('input', () => {
      const year = slider.value;
      display.textContent = year;
      
      if (historicalLayer) {
        map.removeLayer(historicalLayer);
      }
      
      historicalLayer = L.tileLayer(CONFIG.MAP.TILE_LAYERS.HISTORICAL.url.replace('{year}', year), {
        attribution: CONFIG.MAP.TILE_LAYERS.HISTORICAL.attribution
      }).addTo(map);
    });
    
    slider.dispatchEvent(new Event('input'));
  }

  // Métodos existentes aprimorados
  async fetchWithCache(endpoint) {
    if (this.offline) {
      const cached = this.getFromCache(endpoint);
      if (cached) return cached;
      throw new Error('Operação não disponível offline');
    }

    try {
      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS[endpoint] || endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('biome-auth-token')}`
        }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      this.saveToCache(endpoint, data);
      return data;
    } catch (error) {
      console.error(`Erro ao buscar ${endpoint}:`, error);
      const cached = this.getFromCache(endpoint);
      if (cached) {
        this.showNotification('Dados carregados do cache', 'info');
        return cached;
      }
      throw error;
    }
  }

  // ... (outros métodos existentes aprimorados)

  // Novo método para tratamento de erros
  handleInitError(error) {
    console.error('Erro na inicialização:', error);
    
    const errorMessage = this.offline 
      ? 'Sistema em modo offline. Algumas funcionalidades estarão limitadas.'
      : 'Falha ao carregar o sistema. Tente recarregar a página.';
    
    this.showError(errorMessage);
    
    if (!this.offline) {
      setTimeout(() => location.reload(), 5000);
    }
  }
}

// Inicialização com verificação de recursos
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!window.indexedDB) {
      throw new Error('Seu navegador não suporta armazenamento local necessário');
    }

    if (!window.fetch || !window.Promise) {
      throw new Error('Seu navegador não suporta todos os recursos necessários');
    }

    const monitor = new BiomaMonitor();
    window.biomeMonitor = monitor;

    // Carrega recursos adicionais após a renderização inicial
    requestIdleCallback(() => {
      monitor.loadAdditionalResources();
    });
  } catch (error) {
    document.getElementById('app-container').innerHTML = `
      <div class="error-screen">
        <h2>Erro no Sistema de Monitoramento</h2>
        <p>${error.message}</p>
        <p>Por favor, utilize um navegador moderno como Chrome, Firefox ou Edge.</p>
        <button onclick="window.location.reload()">Recarregar</button>
      </div>
    `;
  }
});