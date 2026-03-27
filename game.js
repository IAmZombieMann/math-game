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
      options
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
    options: shuffle([correct, wrong1, wrong2, wrong3])
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
  } else {
    gameState.streak = 0;
    gameState.score = Math.max(0, gameState.score - 4);
    feedback.textContent = `Oops, era: ${correct}. ¡Sigue intentando! 💪`;
    feedback.style.color = "#b0397f";
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

nextBtn.addEventListener("click", nextChallenge);
restartBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);

startGame();
