const challengeTitle = document.getElementById("challenge-title");
const challengeQuestion = document.getElementById("challenge-question");
const answersContainer = document.getElementById("answers");
const feedback = document.getElementById("feedback");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const levelEl = document.getElementById("level");
const timerEl = document.getElementById("timer");
const strategyText = document.getElementById("strategy-text");
const endModal = document.getElementById("end-modal");
const finalMessage = document.getElementById("final-message");

const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");
const playAgainBtn = document.getElementById("play-again");
const soundBtn = document.getElementById("sound-btn");
const helperText = document.getElementById("helper-text");
const fxCanvas = document.getElementById("fx-canvas");
const fxCtx = fxCanvas.getContext("2d");

const progressBars = {
  count2: document.getElementById("progress-2"),
  count3: document.getElementById("progress-3"),
  count4: document.getElementById("progress-4"),
  placeValue: document.getElementById("progress-place")
};

const strategies = {
  count2: "Consejo: si terminas en 0, 2, 4, 6 u 8, vas de 2 en 2 perfecto.",
  count3: "Consejo: de 3 en 3 puedes sumar 2 y luego 1 para no perderte.",
  count4: "Consejo: de 4 en 4 piensa en dobles: +2 y +2.",
  placeValue: "Consejo: en 372, el 3 son centenas, el 7 decenas y el 2 unidades."
};

const gameState = {
  score: 0,
  streak: 0,
  level: 1,
  timeLeft: 120,
  timerId: null,
  currentChallenge: null,
  answeredCurrent: false,
  soundEnabled: true,
  audioCtx: null,
  skills: {
    count2: { correct: 0, total: 0 },
    count3: { correct: 0, total: 0 },
    count4: { correct: 0, total: 0 },
    placeValue: { correct: 0, total: 0 }
  }
};

const challengeGenerators = {
  count2: generateCountingChallenge(2, "Reto de saltos mágicos: cuenta de 2 en 2"),
  count3: generateCountingChallenge(3, "Reto de saltos mágicos: cuenta de 3 en 3"),
  count4: generateCountingChallenge(4, "Reto de saltos mágicos: cuenta de 4 en 4"),
  placeValue: generatePlaceValueChallenge
};

let particles = [];
let animationId = null;

function generateCountingChallenge(step, title) {
  return () => {
    const start = Math.floor(Math.random() * 8 + 1) * step;
    const sequence = [start, start + step, start + step * 2, start + step * 3];
    const correct = sequence[3];
    const wrongAnswers = new Set();

    while (wrongAnswers.size < 3) {
      const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const candidate = correct + offset;
      if (candidate > 0 && candidate !== correct) {
        wrongAnswers.add(candidate);
      }
    }

    const options = shuffle([correct, ...wrongAnswers]);

    return {
      type: step === 2 ? "count2" : step === 3 ? "count3" : "count4",
      title,
      question: `Completa la secuencia: ${sequence[0]}, ${sequence[1]}, ${sequence[2]}, __`,
      correct,
      options,
      helper: `Ve saltando de ${step} en ${step}: ${sequence[0]} → ${sequence[1]} → ${sequence[2]} → ?`
    };
  };
}

function generatePlaceValueChallenge() {
  const number = Math.floor(Math.random() * 900) + 100;
  const hundreds = Math.floor(number / 100);
  const tens = Math.floor((number % 100) / 10);
  const units = number % 10;

  const correct = `${hundreds} centenas, ${tens} decenas, ${units} unidades`;

  const wrong1 = `${tens} centenas, ${hundreds} decenas, ${units} unidades`;
  const wrong2 = `${hundreds} centenas, ${units} decenas, ${tens} unidades`;
  const wrong3 = `${units} centenas, ${tens} decenas, ${hundreds} unidades`;

  return {
    type: "placeValue",
    title: "Reto detective numérico: separa centenas, decenas y unidades",
    question: `¿Cómo se descompone el número ${number}?`,
    correct,
    options: shuffle([correct, wrong1, wrong2, wrong3]),
    helper: `Recuerda: el primer dígito son centenas, luego decenas y al final unidades.`
  };
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickChallengeType() {
  const types = ["count2", "count3", "count4", "placeValue"];
  return types[Math.floor(Math.random() * types.length)];
}

function renderChallenge(challenge) {
  challengeTitle.textContent = challenge.title;
  challengeQuestion.textContent = challenge.question;
  strategyText.textContent = strategies[challenge.type];
  helperText.textContent = challenge.helper;
  answersContainer.innerHTML = "";

  challenge.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "answer-btn";
    button.textContent = option;
    button.addEventListener("click", () => handleAnswer(option));
    answersContainer.appendChild(button);
  });
}

function handleAnswer(selectedOption) {
  if (!gameState.currentChallenge || gameState.answeredCurrent) {
    return;
  }

  gameState.answeredCurrent = true;
  const { correct, type } = gameState.currentChallenge;
  gameState.skills[type].total += 1;

  const isCorrect = selectedOption === correct;

  if (isCorrect) {
    gameState.skills[type].correct += 1;
    gameState.streak += 1;
    const streakBonus = Math.min(5, Math.floor(gameState.streak / 3));
    gameState.score += 10 + streakBonus * 2;
    feedback.textContent = `¡Excelente! +${10 + streakBonus * 2} puntos 🌟`;
    feedback.style.color = "#1f8f77";
    playCorrectSound();
    spawnBurst("#7bf2d3");
    if (gameState.streak > 0 && gameState.streak % 5 === 0) {
      feedback.textContent = `🎉 WIN! Súper racha de ${gameState.streak}`;
      playWinSound();
      spawnBurst("#ff6fb2", 180);
    }
  } else {
    gameState.streak = 0;
    gameState.score = Math.max(0, gameState.score - 4);
    feedback.textContent = `Oops, era: ${correct}. ¡Sigue intentando! 💪`;
    feedback.style.color = "#b0397f";
    playWrongSound();
  }

  gameState.level = 1 + Math.floor(gameState.score / 80);
  updateStats();
  updateProgress();
}

function nextChallenge() {
  const type = pickChallengeType();
  gameState.currentChallenge = challengeGenerators[type]();
  gameState.answeredCurrent = false;
  feedback.textContent = "Piensa con calma... ¡y responde! ✨";
  feedback.style.color = "#3d3b63";
  renderChallenge(gameState.currentChallenge);
}

function updateStats() {
  scoreEl.textContent = gameState.score;
  streakEl.textContent = gameState.streak;
  levelEl.textContent = gameState.level;
  timerEl.textContent = gameState.timeLeft;
}

function updateProgress() {
  Object.entries(gameState.skills).forEach(([skill, data]) => {
    const ratio = data.total === 0 ? 0 : Math.round((data.correct / data.total) * 100);
    progressBars[skill].style.width = `${ratio}%`;
  });
}

function endGame() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
  finalMessage.textContent = `Lograste ${gameState.score} puntos, nivel ${gameState.level} y una racha máxima de ${gameState.streak}. ¡Eres una estrella matemática!`;
  endModal.classList.remove("hidden");
  playWinSound();
  spawnBurst("#a989ff", 240);
}

function tick() {
  gameState.timeLeft -= 1;
  if (gameState.timeLeft <= 0) {
    gameState.timeLeft = 0;
    updateStats();
    endGame();
    return;
  }
  updateStats();
}

function startGame() {
  gameState.score = 0;
  gameState.streak = 0;
  gameState.level = 1;
  gameState.timeLeft = 120;
  gameState.currentChallenge = null;
  gameState.answeredCurrent = false;
  gameState.skills = {
    count2: { correct: 0, total: 0 },
    count3: { correct: 0, total: 0 },
    count4: { correct: 0, total: 0 },
    placeValue: { correct: 0, total: 0 }
  };

  clearInterval(gameState.timerId);
  gameState.timerId = setInterval(tick, 1000);
  endModal.classList.add("hidden");
  updateStats();
  updateProgress();
  nextChallenge();
}

function ensureAudio() {
  if (!gameState.audioCtx) {
    gameState.audioCtx = new window.AudioContext();
  }
}

function playTone(frequency, duration = 0.12, type = "sine", gainValue = 0.05) {
  if (!gameState.soundEnabled) {
    return;
  }
  ensureAudio();
  const ctx = gameState.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playCorrectSound() {
  playTone(660, 0.1, "triangle", 0.05);
  setTimeout(() => playTone(880, 0.13, "triangle", 0.05), 80);
}

function playWrongSound() {
  playTone(220, 0.15, "sawtooth", 0.04);
}

function playWinSound() {
  [523, 659, 784, 1046].forEach((freq, index) => {
    setTimeout(() => playTone(freq, 0.14, "triangle", 0.06), index * 90);
  });
}

function resizeCanvas() {
  fxCanvas.width = window.innerWidth;
  fxCanvas.height = window.innerHeight;
}

function spawnBurst(color = "#ff8fc7", amount = 120) {
  const centerX = window.innerWidth * 0.5;
  const centerY = window.innerHeight * 0.35;
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: Math.random() * 50 + 40,
      size: Math.random() * 5 + 2,
      color: Math.random() > 0.5 ? color : "#ffd36f"
    });
  }
  if (!animationId) {
    animateParticles();
  }
}

function animateParticles() {
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.07;
    p.life -= 1;
    fxCtx.globalAlpha = Math.max(0, p.life / 90);
    fxCtx.fillStyle = p.color;
    fxCtx.fillRect(p.x, p.y, p.size, p.size);
  });
  fxCtx.globalAlpha = 1;

  if (particles.length > 0) {
    animationId = requestAnimationFrame(animateParticles);
  } else {
    animationId = null;
  }
}

nextBtn.addEventListener("click", nextChallenge);
restartBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);
soundBtn.addEventListener("click", () => {
  gameState.soundEnabled = !gameState.soundEnabled;
  soundBtn.textContent = gameState.soundEnabled ? "Sonido: ON 🔊" : "Sonido: OFF 🔇";
  if (gameState.soundEnabled) {
    playTone(740, 0.08, "triangle", 0.04);
  }
});
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
startGame();
