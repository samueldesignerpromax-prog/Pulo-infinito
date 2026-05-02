/**
 * Infinite Jumper - Jogo estilo Doodle Jump
 * Autor: Assistente IA
 * Descrição: Jogo onde o personagem sobe infinitamente em plataformas
 * Controles: Teclas A/D ou Setas ←/→ no desktop, botões no mobile
 */

// ==================== CONFIGURAÇÕES DO CANVAS ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajustar tamanho do canvas para responsividade
function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = 400;
    const maxHeight = 600;
    
    if (window.innerWidth <= 768) {
        const scale = Math.min(window.innerWidth / maxWidth, 1);
        canvas.style.width = `${maxWidth * scale}px`;
        canvas.style.height = `${maxHeight * scale}px`;
    } else {
        canvas.style.width = `${maxWidth}px`;
        canvas.style.height = `${maxHeight}px`;
    }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ==================== VARIÁVEIS GLOBAIS ====================
let gameRunning = true;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let cameraY = 0; // Posição da câmera (seguindo o personagem)

// Elementos da UI
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverlay = document.getElementById('gameOverlay');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Atualizar recorde na tela
highScoreElement.textContent = highScore;

// ==================== CLASSE DO PERSONAGEM ====================
class Player {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 100;
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.5;
        this.jumpPower = -10;
        this.isJumping = false;
    }
    
    // Movimento horizontal (input externo)
    move(direction) {
        if (!gameRunning) return;
        // direction: -1 = esquerda, 1 = direita
        this.velocityX += direction * 0.5;
        // Limitar velocidade máxima
        if (this.velocityX > 5) this.velocityX = 5;
        if (this.velocityX < -5) this.velocityX = -5;
    }
    
    // Aplicar física e atualizar posição
    update() {
        // Aplicar gravidade
        this.velocityY += this.gravity;
        
        // Atualizar posições
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Aplicar atrito no eixo X
        this.velocityX *= 0.98;
        
        // Limites laterais (não sair da tela)
        if (this.x < 0) {
            this.x = 0;
            this.velocityX = 0;
        }
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
            this.velocityX = 0;
        }
        
        // Verificar se caiu fora da tela (Game Over)
        if (this.y + this.height > canvas.height + 100) {
            gameOver();
        }
        
        // Verificar se passou do topo (câmera segue)
        if (this.y < canvas.height / 3) {
            const diff = canvas.height / 3 - this.y;
            cameraY += diff;
            this.y = canvas.height / 3;
            
            // Aumentar pontuação baseada na altura
            if (cameraY > 0) {
                const newScore = Math.floor(cameraY / 10);
                if (newScore > score) {
                    score = newScore;
                    scoreElement.textContent = score;
                    
                    // Atualizar recorde
                    if (score > highScore) {
                        highScore = score;
                        highScoreElement.textContent = highScore;
                        localStorage.setItem('highScore', highScore);
                    }
                }
            }
        }
        
        // Verificar se o personagem está subindo muito (câmera acompanha)
        if (this.y < 50 && cameraY > 0) {
            const diff = 50 - this.y;
            cameraY += diff;
            this.y = 50;
        }
    }
    
    // Método de pulo (chamado ao colidir com plataforma)
    jump() {
        if (!gameRunning) return;
        this.velocityY = this.jumpPower;
        playJumpSound();
        
        // Animação de pulo (efeito visual)
        this.jumpAnimation = true;
        setTimeout(() => { this.jumpAnimation = false; }, 200);
    }
    
    // Desenhar o personagem com animação
    draw() {
        // Efeito de pulo (mudança de escala)
        if (this.jumpAnimation) {
            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.scale(1.2, 0.8);
            ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
        }
        
        // Corpo redondo com estilo
        ctx.fillStyle = '#FF6B6B';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Olhos
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.35, this.y + this.height * 0.4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.65, this.y + this.height * 0.4, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.35, this.y + this.height * 0.4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.65, this.y + this.height * 0.4, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Sorriso
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height * 0.6, 8, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        if (this.jumpAnimation) {
            ctx.restore();
        }
    }
}

// ==================== CLASSE DA PLATAFORMA ====================
class Platform {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 15;
        this.type = type; // 'normal', 'moving'
        this.moveDirection = 1;
        this.moveSpeed = 1.5;
    }
    
    update() {
        if (this.type === 'moving') {
            this.x += this.moveSpeed * this.moveDirection;
            if (this.x < 0 || this.x + this.width > canvas.width) {
                this.moveDirection *= -1;
            }
        }
    }
    
    draw() {
        // Cores diferentes por tipo de plataforma
        if (this.type === 'normal') {
            ctx.fillStyle = '#8B4513';
            ctx.shadowBlur = 3;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Detalhes
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(this.x, this.y, this.width, 3);
            
            // Bordas
            ctx.strokeStyle = '#6B3410';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else if (this.type === 'moving') {
            ctx.fillStyle = '#4CAF50';
            ctx.shadowBlur = 3;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(this.x, this.y, this.width, 3);
            
            // Padrão de movimento
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
        ctx.shadowBlur = 0;
    }
    
    // Verificar colisão com o personagem
    checkCollision(player) {
        return (player.x < this.x + this.width &&
                player.x + player.width > this.x &&
                player.y + player.height > this.y &&
                player.y + player.height < this.y + this.height + 10 &&
                player.velocityY > 0);
    }
}

// ==================== GERENCIAMENTO DE PLATAFORMAS ====================
let platforms = [];
let player;

function generateInitialPlatforms() {
    platforms = [];
    // Plataforma inicial (fixa no chão virtual)
    platforms.push(new Platform(canvas.width/2 - 30, canvas.height - 50, 'normal'));
    
    // Gerar plataformas aleatórias subindo
    for (let i = 1; i <= 8; i++) {
        generatePlatformAtY(canvas.height - 50 - i * 70);
    }
}

function generatePlatformAtY(y) {
    const x = Math.random() * (canvas.width - 60);
    // 20% de chance de ser plataforma móvel
    const type = Math.random() < 0.2 ? 'moving' : 'normal';
    platforms.push(new Platform(x, y, type));
}

function updatePlatforms() {
    // Remover plataformas muito abaixo da câmera
    platforms = platforms.filter(p => p.y - cameraY < canvas.height + 100);
    
    // Gerar novas plataformas conforme o personagem sobe
    const highestPlatform = Math.min(...platforms.map(p => p.y));
    if (highestPlatform - cameraY > 100) {
        // Gerar plataforma acima da mais alta
        const newY = highestPlatform - 70;
        const x = Math.random() * (canvas.width - 60);
        const type = Math.random() < 0.2 ? 'moving' : 'normal';
        platforms.push(new Platform(x, newY, type));
    }
    
    // Atualizar e desenhar plataformas
    for (let platform of platforms) {
        platform.update();
        
        // Verificar colisão com o personagem
        if (platform.checkCollision(player)) {
            player.jump();
        }
    }
}

// ==================== SONS (Web Audio API) ====================
// Usando Web Audio API para gerar sons simples sem arquivos externos
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playJumpSound() {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 523.25; // Dó5
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch(e) {
        console.log('Audio error:', e);
    }
}

function playGameOverSound() {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 261.63; // Dó4
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch(e) {
        console.log('Audio error:', e);
    }
}

// ==================== SISTEMA DE INPUT ====================
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false
};

// Controles de teclado
document.addEventListener('keydown', (e) => {
    const code = e.code;
    if (keys.hasOwnProperty(code)) {
        keys[code] = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    const code = e.code;
    if (keys.hasOwnProperty(code)) {
        keys[code] = false;
        e.preventDefault();
    }
});

// Controles de toque (mobile)
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

let touchLeft = false;
let touchRight = false;

if (leftBtn) {
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchLeft = true;
    });
    leftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchLeft = false;
    });
    leftBtn.addEventListener('mousedown', () => { touchLeft = true; });
    leftBtn.addEventListener('mouseup', () => { touchLeft = false; });
}

if (rightBtn) {
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchRight = true;
    });
    rightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchRight = false;
    });
    rightBtn.addEventListener('mousedown', () => { touchRight = true; });
    rightBtn.addEventListener('mouseup', () => { touchRight = false; });
}

function handleInput() {
    let move = 0;
    
    // Teclado
    if (keys.ArrowLeft || keys.KeyA) move = -1;
    if (keys.ArrowRight || keys.KeyD) move = 1;
    
    // Toque
    if (touchLeft) move = -1;
    if (touchRight) move = 1;
    
    if (move !== 0) {
        player.move(move);
    }
}

// ==================== GAME OVER E REINÍCIO ====================
function gameOver() {
    if (!gameRunning) return;
    
    gameRunning = false;
    playGameOverSound();
    
    finalScoreElement.textContent = score;
    gameOverlay.classList.remove('hidden');
}

function restartGame() {
    gameRunning = true;
    score = 0;
    cameraY = 0;
    scoreElement.textContent = score;
    
    // Reiniciar objetos
    player = new Player();
    generateInitialPlatforms();
    
    // Esconder overlay
    gameOverlay.classList.add('hidden');
    
    // Iniciar áudio (necessário interação do usuário)
    initAudio();
}

restartButton.addEventListener('click', () => {
    restartGame();
});

// Iniciar áudio ao primeiro toque/clique
canvas.addEventListener('click', () => {
    if (!audioContext) {
        initAudio();
    }
});

// ==================== SISTEMA DE DESENHO ====================
function drawBackground() {
    // Céu gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Nuvens
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 3; i++) {
        const cloudX = (Date.now() * 0.05 + i * 200) % (canvas.width + 200) - 100;
        const cloudY = 50 + i * 150 - cameraY * 0.3;
        if (cloudY < canvas.height && cloudY > -50) {
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, 25, 0, Math.PI * 2);
            ctx.arc(cloudX + 30, cloudY - 10, 30, 0, Math.PI * 2);
            ctx.arc(cloudX + 60, cloudY, 25, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function draw() {
    if (!gameRunning) {
        drawBackground();
        player.draw();
        for (let platform of platforms) {
            platform.draw();
        }
        return;
    }
    
    // Limpar e desenhar cenário
    drawBackground();
    
    // Salvar estado do canvas para câmera
    ctx.save();
    ctx.translate(0, -cameraY);
    
    // Desenhar plataformas
    for (let platform of platforms) {
        platform.draw();
    }
    
    // Desenhar personagem
    player.draw();
    
    // Restaurar câmera
    ctx.restore();
    
    // Linha de perigo (parte inferior)
    ctx.fillStyle = 'rgba(255,0,0,0.3)';
    ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
}

// ==================== LOOP PRINCIPAL DO JOGO ====================
function update() {
    if (!gameRunning) return;
    
    handleInput();
    player.update();
    updatePlatforms();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ==================== INICIALIZAÇÃO ====================
function init() {
    player = new Player();
    generateInitialPlatforms();
    gameRunning = true;
    score = 0;
    cameraY = 0;
    scoreElement.textContent = score;
    gameLoop();
}

init();

// Prevenir scroll com setas
window.addEventListener('keydown', function(e) {
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
    }
});
