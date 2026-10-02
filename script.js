const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Elementos de UI
const mainMenu = document.getElementById("main-menu");
const gameScreen = document.getElementById("game-screen");
const pauseModal = document.getElementById("pause-modal");
const gameOverModal = document.getElementById("gameover-modal");

const studentNameInput = document.getElementById("student-name");
const operationSelect = document.getElementById("operation-select");
const modeSelect = document.getElementById("mode-select");
const difficultySelect = document.getElementById("difficulty-select");

const displayName = document.getElementById("display-name");
const displayScore = document.getElementById("display-score");
const displayLives = document.getElementById("display-lives");
const displayTimer = document.getElementById("display-timer");
const timerBox = document.getElementById("timer-box");
const mathQuestionText = document.getElementById("math-question");
const finalScoreSpan = document.getElementById("final-score");
const gameOverTitle = document.getElementById("gameover-title");

// Configurações e Estado do Jogo
let score = 0;
let lives = 3;
let timeLeft = 60;
let gameInterval = null;
let gameLoopId = null;
let isPaused = false;
let gameActive = false;

let settings = {
    name: "Estudante",
    operation: "all",
    mode: "time",
    difficulty: "medium"
};

let currentQuestion = { text: "", answer: 0 };

const SCALE = 30;

// Jogador (Math-Man)
let player = {
    x: 1.5 * SCALE,
    y: 1.5 * SCALE,
    size: 12,
    speed: 2,
    dx: 0,
    dy: 0,
    nextDx: 0,
    nextDy: 0
};

let ghosts = [];
const ghostColors = ["#ff5555", "#ff79c6", "#8be9fd", "#50fa7b"];

// Mapa do Labirinto (1 = Parede, 0 = Caminho livre)
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,0,0,0,0,0,0,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,1,1],
    [0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0],
    [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,0,0,0,0,0,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// --- SISTEMA DE ÁUDIO (Web Audio API) ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playApplauseSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
    });
}

function playErrorSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250 - i * 30, now + i * 0.12);
        osc.frequency.linearRampToValueAtTime(150 - i * 20, now + i * 0.12 + 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.1);
    }
}

// --- GERAÇÃO DE PERGUNTAS MATEMÁTICAS ---
function generateQuestion() {
    let ops = [];
    if (settings.operation === "all") {
        ops = ["addition", "subtraction", "multiplication", "division"];
    } else {
        ops = [settings.operation];
    }
    let chosenOp = ops[Math.floor(Math.random() * ops.length)];
    
    let maxNum = 10;
    if (settings.difficulty === "medium") maxNum = 50;
    if (settings.difficulty === "hard" || settings.difficulty === "insane") maxNum = 100;

    let n1 = Math.floor(Math.random() * maxNum) + 1;
    let n2 = Math.floor(Math.random() * maxNum) + 1;

    if (chosenOp === "addition") {
        currentQuestion.answer = n1 + n2;
        currentQuestion.text = `${n1} + ${n2} = ?`;
    } else if (chosenOp === "subtraction") {
        if (n1 < n2) [n1, n2] = [n2, n1];
        currentQuestion.answer = n1 - n2;
        currentQuestion.text = `${n1} - ${n2} = ?`;
    } else if (chosenOp === "multiplication") {
        let limit = settings.difficulty === "easy" ? 5 : 12;
        n1 = Math.floor(Math.random() * limit) + 1;
        n2 = Math.floor(Math.random() * limit) + 1;
        currentQuestion.answer = n1 * n2;
        currentQuestion.text = `${n1} × ${n2} = ?`;
    } else if (chosenOp === "division") {
        let limit = settings.difficulty === "easy" ? 5 : 10;
        n2 = Math.floor(Math.random() * limit) + 1;
        let multiplier = Math.floor(Math.random() * limit) + 1;
        n1 = n2 * multiplier;
        currentQuestion.answer = multiplier;
        currentQuestion.text = `${n1} ÷ ${n2} = ?`;
    }

    mathQuestionText.textContent = currentQuestion.text;
    spawnGhosts();
}

// --- SPAWN DOS FANTASMAS (Com respostas visíveis no tabuleiro) ---
function spawnGhosts() {
    ghosts = [];
    let correctAns = currentQuestion.answer;
    
    let options = [correctAns];
    while (options.length < 4) {
        let offset = (Math.floor(Math.random() * 6) + 1) * (Math.random() < 0.5 ? 1 : -1);
        let wrongAns = correctAns + offset;
        if (wrongAns >= 0 && !options.includes(wrongAns)) {
            options.push(wrongAns);
        }
    }
    options.sort(() => Math.random() - 0.5);

    // Posições espalhadas pelo labirinto livre
    let spawnSpots = [
        { x: 9.5 * SCALE, y: 7.5 * SCALE },
        { x: 5.5 * SCALE, y: 3.5 * SCALE },
        { x: 13.5 * SCALE, y: 3.5 * SCALE },
        { x: 9.5 * SCALE, y: 11.5 * SCALE }
    ];

    for (let i = 0; i < 4; i++) {
        ghosts.push({
            x: spawnSpots[i].x,
            y: spawnSpots[i].y,
            size: 13,
            speed: settings.difficulty === "insane" ? 1.5 : 0.8,
            value: options[i],
            color: ghostColors[i],
            dx: (Math.random() < 0.5 ? 1 : -1),
            dy: 0
        });
    }
}

// --- CONTROLES E EVENTOS ---
window.addEventListener("keydown", (e) => {
    if (!gameActive || isPaused) return;
    initAudio();
    if (e.key === "ArrowUp" || e.key === "w") { player.nextDx = 0; player.nextDy = -1; }
    if (e.key === "ArrowDown" || e.key === "s") { player.nextDx = 0; player.nextDy = 1; }
    if (e.key === "ArrowLeft" || e.key === "a") { player.nextDx = -1; player.nextDy = 0; }
    if (e.key === "ArrowRight" || e.key === "d") { player.nextDx = 1; player.nextDy = 0; }
});

document.querySelectorAll(".ctrl-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        if (!gameActive || isPaused) return;
        initAudio();
        let dir = btn.getAttribute("data-dir");
        if (dir === "UP") { player.nextDx = 0; player.nextDy = -1; }
        if (dir === "DOWN") { player.nextDx = 0; player.nextDy = 1; }
        if (dir === "LEFT") { player.nextDx = -1; player.nextDy = 0; }
        if (dir === "RIGHT") { player.nextDx = 1; player.nextDy = 0; }
    });
});

// --- COLISÃO COM PAREDES ---
function isWall(x, y, size) {
    let corners = [
        { x: x - size, y: y - size },
        { x: x + size, y: y - size },
        { x: x - size, y: y + size },
        { x: x + size, y: y + size }
    ];

    for (let c of corners) {
        let gridX = Math.floor(c.x / SCALE);
        let gridY = Math.floor(c.y / SCALE);

        if (gridY < 0 || gridY >= map.length || gridX < 0 || gridX >= map[0].length) {
            return true;
        }
        if (map[gridY][gridX] === 1) {
            return true;
        }
    }
    return false;
}

// --- ATUALIZAÇÃO DA LÓGICA DO JOGO ---
function update() {
    if (!gameActive || isPaused) return;

    let pSpeed = settings.difficulty === "insane" ? 2.5 : 2;

    if (player.nextDx !== 0 || player.nextDy !== 0) {
        let testX = player.x + player.nextDx * pSpeed;
        let testY = player.y + player.nextDy * pSpeed;
        if (!isWall(testX, testY, player.size)) {
            player.dx = player.nextDx;
            player.dy = player.nextDy;
        }
    }

    let nextX = player.x + player.dx * pSpeed;
    let nextY = player.y + player.dy * pSpeed;
    if (!isWall(nextX, nextY, player.size)) {
        player.x = nextX;
        player.y = nextY;
    }

    if (player.x < -10) player.x = canvas.width + 10;
    if (player.x > canvas.width + 10) player.x = -10;

    // Movimentação dos Fantasmas e Checagem de Resposta
    ghosts.forEach(ghost => {
        let gX = ghost.x + ghost.dx * ghost.speed;
        let gY = ghost.y + ghost.dy * ghost.speed;

        if (isWall(gX, gY, ghost.size) || Math.random() < 0.03) {
            let dirs = [{dx:0, dy:-1}, {dx:0, dy:1}, {dx:-1, dy:0}, {dx:1, dy:0}];
            let validDirs = dirs.filter(d => !isWall(ghost.x + d.dx * 12, ghost.y + d.dy * 12, ghost.size));
            if (validDirs.length > 0) {
                let chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                ghost.dx = chosenDir.dx;
                ghost.dy = chosenDir.dy;
            } else {
                ghost.dx *= -1;
                ghost.dy *= -1;
            }
        } else {
            ghost.x = gX;
            ghost.y = gY;
        }

        // Colisão Jogador <-> Fantasma
        let dist = Math.hypot(player.x - ghost.x, player.y - ghost.y);
        if (dist < player.size + ghost.size + 4) {
            if (ghost.value === currentQuestion.answer) {
                playApplauseSound();
                score += settings.difficulty === "insane" ? 20 : 10;
                displayScore.textContent = score;
                generateQuestion();
            } else {
                playErrorSound();
                lives--;
                updateLivesDisplay();
                if (lives <= 0) {
                    endGame(false);
                } else {
                    player.x = 1.5 * SCALE;
                    player.y = 1.5 * SCALE;
                    player.dx = 0; player.dy = 0;
                    spawnGhosts();
                }
            }
        }
    });
}

// --- RENDERIZAÇÃO GRÁFICA (Fantasmas e Números nas Costas) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar Labirinto
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = "#1d2130";
                ctx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE);
                ctx.strokeStyle = "#6272a4";
                ctx.strokeRect(c * SCALE, r * SCALE, SCALE, SCALE);
            }
        }
    }

    // Desenhar Math-Man
    ctx.fillStyle = "#f1fa8c";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(player.x, player.y);
    ctx.fill();

    // Desenhar Fantasmas e Respostas Numéricas Habilitadas
    ghosts.forEach(ghost => {
        // Corpo do Fantasma
        ctx.fillStyle = ghost.color;
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y - 2, ghost.size, Math.PI, 0, false);
        ctx.lineTo(ghost.x + ghost.size, ghost.y + ghost.size);
        ctx.lineTo(ghost.x - ghost.size, ghost.y + ghost.size);
        ctx.closePath();
        ctx.fill();

        // Olhos do fantasma
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ghost.x - 4, ghost.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(ghost.x + 4, ghost.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0000ff";
        ctx.beginPath();
        ctx.arc(ghost.x - 4, ghost.y - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(ghost.x + 4, ghost.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Número visível em destaque nas costas
        ctx.fillStyle = "#ffff00";
        ctx.font = "bold 15px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText(ghost.value, ghost.x, ghost.y - ghost.size - 6);
    });
}

function mainLoop() {
    update();
    draw();
    if (gameActive) {
        gameLoopId = requestAnimationFrame(mainLoop);
    }
}

function updateLivesDisplay() {
    let hearts = "";
    for (let i = 0; i < lives; i++) hearts += "❤️";
    displayLives.textContent = hearts;
}

function startGame() {
    initAudio();
    settings.name = studentNameInput.value.trim() || "Estudante";
    settings.operation = operationSelect.value;
    settings.mode = modeSelect.value;
    settings.difficulty = difficultySelect.value;

    displayName.textContent = settings.name;
    score = 0;
    lives = 3;
    displayScore.textContent = score;
    updateLivesDisplay();

    if (settings.mode === "time") {
        timerBox.classList.remove("hidden");
        timeLeft = settings.difficulty === "insane" ? 45 : 60;
        displayTimer.textContent = timeLeft;
        
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            if (!isPaused && gameActive) {
                timeLeft--;
                displayTimer.textContent = timeLeft;
                if (timeLeft <= 0) {
                    endGame(true);
                }
            }
        }, 1000);
    } else {
        timerBox.classList.add("hidden");
    }

    player.x = 1.5 * SCALE;
    player.y = 1.5 * SCALE;
    player.dx = 0; player.dy = 0;
    player.nextDx = 0; player.nextDy = 0;

    generateQuestion();

    mainMenu.classList.add("hidden");
    gameOverModal.classList.add("hidden");
    pauseModal.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    gameActive = true;
    cancelAnimationFrame(gameLoopId);
    mainLoop();
}

function endGame(timeOut) {
    gameActive = false;
    clearInterval(gameInterval);
    cancelAnimationFrame(gameLoopId);

    gameOverTitle.textContent = timeOut ? "Tempo Esgotado! ⏱️" : "Fim de Jogo! ❌";
    finalScoreSpan.textContent = score;
    gameOverModal.classList.remove("hidden");
}

// Eventos de Botões
document.getElementById("btn-start").addEventListener("click", startGame);

document.getElementById("btn-pause").addEventListener("click", () => {
    isPaused = true;
    pauseModal.classList.remove("hidden");
});

document.getElementById("btn-resume").addEventListener("click", () => {
    isPaused = false;
    pauseModal.classList.add("hidden");
});

document.getElementById("btn-restart").addEventListener("click", () => {
    pauseModal.classList.add("hidden");
    startGame();
});

document.getElementById("btn-quit").addEventListener("click", () => {
    pauseModal.classList.add("hidden");
    gameScreen.classList.add("hidden");
    mainMenu.classList.remove("hidden");
    gameActive = false;
    clearInterval(gameInterval);
});

document.getElementById("btn-play-again").addEventListener("click", startGame);

document.getElementById("btn-menu-back").addEventListener("click", () => {
    gameOverModal.classList.add("hidden");
    gameScreen.classList.add("hidden");
    mainMenu.classList.remove("hidden");
});