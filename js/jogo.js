
const canvas = document.getElementById("canvas-jogo");
const ctx = canvas.getContext("2d");

// Configurações do jogo
const config = {
  arvoreInicialSize: 15,
  crescimentoPorClick: 0.5,
  maxArvores: 50,
  tempoCrescimento: 1000,
  cores: {
    fundo: "#E8F5E9",
    tronco: "#5D4037",
    copa: "#2E7D32",
    copaNova: "#81C784",
    solo: "#8D6E63",
    texto: "#1B5E20"
  }
};

// Estado do jogo
let arvores = [];
let pontos = 0;
let jogoAtivo = true;
let tempoRestante = 60;
let timer;

// Inicialização do jogo
function iniciarJogo() {
  // Configura o tamanho do canvas
  canvas.width = 800;
  canvas.height = 500;
  
  // Inicia o loop do jogo
  timer = setInterval(atualizarJogo, 1000);
  desenharCenario();
  adicionarEventos();
}

// Adiciona eventos
function adicionarEventos() {
  canvas.addEventListener("click", plantarArvore);
  document.getElementById("btn-reiniciar")?.addEventListener("click", reiniciarJogo);
}

// Função para plantar árvore
function plantarArvore(e) {
  if (!jogoAtivo || arvores.length >= config.maxArvores) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Verifica se está plantando no solo (parte inferior do canvas)
  if (y < canvas.height - 50) return;
  
  arvores.push({ 
    x, 
    y: canvas.height - 50, // Alinha com o solo
    size: config.arvoreInicialSize,
    age: 0,
    color: config.cores.copaNova
  });
  
  pontos += 10;
  desenharCenario();
}

// Atualiza o estado do jogo
function atualizarJogo() {
  if (!jogoAtivo) return;
  
  tempoRestante--;
  
  // Faz as árvores crescerem
  arvores.forEach(arv => {
    arv.size += config.crescimentoPorClick;
    arv.age++;
    
    // Muda a cor quando a árvore amadurece
    if (arv.age > 5) {
      arv.color = config.cores.copa;
    }
  });
  
  desenharCenario();
  
  // Verifica fim de jogo
  if (tempoRestante <= 0) {
    fimDeJogo();
  }
}

// Desenha todo o cenário
function desenharCenario() {
  // Limpa o canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Fundo
  ctx.fillStyle = config.cores.fundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Solo
  ctx.fillStyle = config.cores.solo;
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
  
  // Desenha árvores
  desenharArvores();
  
  // Desenha HUD
  desenharHUD();
}

// Desenha todas as árvores
function desenharArvores() {
  arvores.forEach(arv => {
    // Tronco
    ctx.fillStyle = config.cores.tronco;
    const troncoLargura = arv.size / 3;
    ctx.fillRect(
      arv.x - troncoLargura/2, 
      arv.y - arv.size, 
      troncoLargura, 
      arv.size
    );
    
    // Copa
    ctx.beginPath();
    ctx.arc(arv.x, arv.y - arv.size, arv.size, 0, Math.PI * 2);
    ctx.fillStyle = arv.color;
    ctx.fill();
    
    // Detalhes da copa
    if (arv.age > 3) {
      ctx.beginPath();
      ctx.arc(arv.x - arv.size/3, arv.y - arv.size - arv.size/3, arv.size/4, 0, Math.PI * 2);
      ctx.arc(arv.x + arv.size/3, arv.y - arv.size, arv.size/5, 0, Math.PI * 2);
      ctx.arc(arv.x, arv.y - arv.size + arv.size/4, arv.size/6, 0, Math.PI * 2);
      ctx.fillStyle = "#4CAF50";
      ctx.fill();
    }
  });
}

// Desenha a interface do usuário
function desenharHUD() {
  ctx.fillStyle = config.cores.texto;
  ctx.font = "18px Arial";
  ctx.fillText(`Pontos: ${pontos}`, 20, 30);
  ctx.fillText(`Árvores: ${arvores.length}/${config.maxArvores}`, 20, 60);
  ctx.fillText(`Tempo: ${tempoRestante}s`, 20, 90);
  
  // Mensagem especial quando atinge muitas árvores
  if (arvores.length >= config.maxArvores) {
    ctx.fillStyle = "#D32F2F";
    ctx.font = "24px Arial";
    ctx.fillText("Floresta completa! Parabéns!", canvas.width/2 - 150, 50);
  }
}

// Finaliza o jogo
function fimDeJogo() {
  jogoAtivo = false;
  clearInterval(timer);
  
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Fim de Jogo!", canvas.width/2, canvas.height/2 - 40);
  ctx.font = "24px Arial";
  ctx.fillText(`Você plantou ${arvores.length} árvores!`, canvas.width/2, canvas.height/2);
  ctx.fillText(`Pontuação final: ${pontos}`, canvas.width/2, canvas.height/2 + 40);
  
  // Mostra botão de reiniciar
  const btn = document.createElement("button");
  btn.id = "btn-reiniciar";
  btn.textContent = "Jogar Novamente";
  btn.style.position = "absolute";
  btn.style.left = (canvas.offsetLeft + canvas.width/2 - 75) + "px";
  btn.style.top = (canvas.offsetTop + canvas.height/2 + 80) + "px";
  canvas.parentNode.appendChild(btn);
}

// Reinicia o jogo
function reiniciarJogo() {
  // Remove o botão de reiniciar
  const btn = document.getElementById("btn-reiniciar");
  if (btn) btn.remove();
  
  // Reseta o estado do jogo
  arvores = [];
  pontos = 0;
  jogoAtivo = true;
  tempoRestante = 60;
  
  // Reinicia o jogo
  iniciarJogo();
}

// Inicia o jogo quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", iniciarJogo);