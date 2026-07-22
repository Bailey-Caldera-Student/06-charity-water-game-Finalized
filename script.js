const screenElements = {
  start: document.getElementById('startScreen'),
  howToPlay: document.getElementById('howToPlayScreen'),
  game: document.getElementById('gameScreen'),
  win: document.getElementById('winScreen')
};

const buttonElements = {
  start: document.getElementById('startBtn'),
  beginGame: document.getElementById('beginGameBtn'),
  playAgain: document.getElementById('playAgainBtn')
};

const uiElements = {
  score: document.getElementById('scoreValue'),
  meterFill: document.getElementById('meterFill'),
  message: document.getElementById('message'),
  finalScore: document.getElementById('finalScore'),
  timer: document.getElementById('timerValue')
};

const playField = document.querySelector('.play-field');
const drillPlayer = document.getElementById('drillPlayer');

const gameState = {
  score: 0,
  progress: 0,
  timeLeft: 60,
  isDragging: false,
  dragOffset: 0,
  timerId: null,
  spawnId: null,
  animationFrameId: null,
  isActive: false,
  popupTimeoutIds: [],
  activeObjects: []
};

// Show one screen at a time so the flow matches the wireframe.
function showScreen(screenName) {
  Object.values(screenElements).forEach(screen => screen.classList.remove('active'));
  screenElements[screenName].classList.add('active');
}

// Update the visible score, timer, and progress meter in one place.
function updateHud() {
  uiElements.score.textContent = gameState.score;
  uiElements.finalScore.textContent = gameState.score;
  uiElements.timer.textContent = gameState.timeLeft;
  uiElements.meterFill.style.width = `${Math.min(gameState.progress, 100)}%`;
}

// Set a short message for the player during the round.
function setMessage(text) {
  uiElements.message.textContent = text;
}

// Stop all gameplay timers, animation frames, and popup timeouts.
function stopGameplayLoop() {
  clearInterval(gameState.timerId);
  clearInterval(gameState.spawnId);
  cancelAnimationFrame(gameState.animationFrameId);
  gameState.popupTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  gameState.popupTimeoutIds = [];
}

// Remove all collectible objects and floating score popups.
function clearObjects() {
  gameState.activeObjects.splice(0, gameState.activeObjects.length);
  playField.querySelectorAll('.game-object').forEach(item => item.remove());
  playField.querySelectorAll('.floating-score').forEach(item => item.remove());
}

// Reset the game state and return to the gameplay view.
function resetGame() {
  stopGameplayLoop();
  gameState.score = 0;
  gameState.progress = 0;
  gameState.timeLeft = 60;
  gameState.isDragging = false;
  gameState.isActive = false;
  setMessage('Keep drilling to reach clean water.');
  updateHud();
  clearObjects();
  showScreen('game');
}

// Start the actual gameplay and begin the timer and object spawning.
function startGame() {
  resetGame();
  gameState.isActive = true;
  startTimer();
  startSpawning();
}

// End the game and show the win screen.
function endGame() {
  gameState.isActive = false;
  stopGameplayLoop();
  clearObjects();
  uiElements.finalScore.textContent = gameState.score;
  showScreen('win');
}

// Start the countdown timer.
function startTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = setInterval(() => {
    gameState.timeLeft -= 1;
    updateHud();

    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.timerId);
      setMessage('Time is up! The drill reached the water.');
      endGame();
    }
  }, 1000);
}

// Clamp the drill so it stays inside the play field.
function clampDrillPosition(xPosition) {
  const maxX = playField.clientWidth - drillPlayer.offsetWidth;
  return Math.max(0, Math.min(xPosition, maxX));
}

// Move the drill to an x position.
function updateDrillPosition(xPosition) {
  const newX = clampDrillPosition(xPosition);
  drillPlayer.style.left = `${newX}px`;
}

// Return a pointer position for mouse or touch input.
function getPointerX(event) {
  if (event.touches && event.touches[0]) {
    return event.touches[0].clientX;
  }
  return event.clientX;
}

// Check whether the event is coming from a desktop-style pointer.
function isDesktopPointer(event) {
  return event.pointerType === 'mouse' || (
    event.pointerType === '' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

// Start dragging the drill horizontally for touch input.
function startDragging(event) {
  if (!playField || !gameState.isActive || isDesktopPointer(event)) {
    return;
  }

  gameState.isDragging = true;
  const playFieldRect = playField.getBoundingClientRect();
  const pointerX = getPointerX(event);
  const drillCenter = drillPlayer.offsetWidth / 2;
  gameState.dragOffset = pointerX - playFieldRect.left - drillCenter;
  playField.setPointerCapture(event.pointerId);
}

// Continue moving the drill while the pointer moves.
function dragDrill(event) {
  if (!playField || !gameState.isActive) {
    return;
  }

  const playFieldRect = playField.getBoundingClientRect();
  const pointerX = getPointerX(event);

  if (isDesktopPointer(event)) {
    const drillCenter = drillPlayer.offsetWidth / 2;
    updateDrillPosition(pointerX - playFieldRect.left - drillCenter);
    return;
  }

  if (!gameState.isDragging) {
    return;
  }

  const drillCenter = drillPlayer.offsetWidth / 2;
  const newLeft = pointerX - playFieldRect.left - drillCenter;
  updateDrillPosition(newLeft);
}

// Stop dragging when the pointer is released.
function stopDragging(event) {
  if (!gameState.isDragging) {
    return;
  }

  gameState.isDragging = false;
  if (event?.pointerId !== undefined) {
    playField.releasePointerCapture(event.pointerId);
  }
}

// Create a new collectible object with a random type, size, speed, and points.
function createCollectible() {
  const collectibleTypes = [
    { name: 'water', symbol: '💧', points: 10, sizeClass: 'medium', speed: 2.5 },
    { name: 'jerry-can', symbol: '🫙', points: 20, sizeClass: 'small', speed: 2 },
    { name: 'boulder', symbol: '🪨', points: -20, sizeClass: 'large', speed: 1.5 }
  ];

  const type = collectibleTypes[Math.floor(Math.random() * collectibleTypes.length)];
  const collectible = document.createElement('div');
  collectible.className = `game-object ${type.name} ${type.sizeClass}`;
  collectible.dataset.points = type.points;
  collectible.dataset.speed = type.speed;

  if (type.name === 'jerry-can') {
    collectible.innerHTML = '<img src="img/water-can-transparent.png" alt="Charity Water Jerry can" />';
  } else {
    collectible.textContent = type.symbol;
  }

  const xPosition = Math.random() * (playField.clientWidth - 60);
  collectible.style.left = `${xPosition}px`;
  collectible.style.top = `${playField.clientHeight - 70}px`;

  playField.appendChild(collectible);
  gameState.activeObjects.push(collectible);
}

// Move each collectible downward and remove it when it leaves the play field.
function moveCollectibles() {
  if (!gameState.isActive) {
    return;
  }

  gameState.activeObjects.forEach(collectible => {
    const currentTop = Number(collectible.style.top.replace('px', '')) || playField.clientHeight;
    const speed = Number(collectible.dataset.speed || 2);
    const newTop = currentTop - speed;
    collectible.style.top = `${newTop}px`;

    if (newTop < -40) {
      removeCollectible(collectible);
    }
  });

  checkCollisions();
  gameState.animationFrameId = requestAnimationFrame(moveCollectibles);
}

// Remove one collectible from the DOM and from the active list.
function removeCollectible(collectible) {
  collectible.remove();
  const index = gameState.activeObjects.indexOf(collectible);
  if (index > -1) {
    gameState.activeObjects.splice(index, 1);
  }
}

// Show a short floating score popup near the hit object.
function showFloatingText(xPosition, yPosition, points) {
  const popup = document.createElement('div');
  const fieldRect = playField.getBoundingClientRect();
  popup.className = 'floating-score';
  popup.textContent = points > 0 ? `+${points}` : `${points}`;
  popup.style.left = `${Math.max(0, xPosition - fieldRect.left)}px`;
  popup.style.top = `${Math.max(0, yPosition - fieldRect.top)}px`;
  playField.appendChild(popup);

  const timeoutId = setTimeout(() => {
    popup.remove();
  }, 700);
  gameState.popupTimeoutIds.push(timeoutId);
}

// Check if the drill overlaps a collectible and update the score.
function checkCollisions() {
  if (!gameState.isActive) {
    return;
  }

  const drillRect = drillPlayer.getBoundingClientRect();
  const activeObjects = [...gameState.activeObjects];

  activeObjects.forEach(collectible => {
    const collectibleRect = collectible.getBoundingClientRect();
    const hit = (
      collectibleRect.left < drillRect.right &&
      collectibleRect.right > drillRect.left &&
      collectibleRect.top < drillRect.bottom &&
      collectibleRect.bottom > drillRect.top
    );

    if (hit) {
      const points = Number(collectible.dataset.points);
      gameState.score = Math.max(0, gameState.score + points);
      updateHud();
      showFloatingText(collectibleRect.left, collectibleRect.top, points);
      removeCollectible(collectible);
    }
  });
}

// Spawn collectibles at a random interval while the game is active.
function startSpawning() {
  clearInterval(gameState.spawnId);
  gameState.spawnId = setInterval(() => {
    if (gameState.isActive) {
      createCollectible();
    }
  }, Math.random() * 800 + 400);
  cancelAnimationFrame(gameState.animationFrameId);
  gameState.animationFrameId = requestAnimationFrame(moveCollectibles);
}

// Connect the main buttons to the game flow.
buttonElements.start.addEventListener('click', () => {
  showScreen('howToPlay');
});

buttonElements.beginGame.addEventListener('click', () => {
  startGame();
});

buttonElements.playAgain.addEventListener('click', () => {
  startGame();
});

// Let the player move the drill on both desktop and mobile.
playField.addEventListener('pointerdown', startDragging);
playField.addEventListener('pointermove', dragDrill);
playField.addEventListener('pointerup', stopDragging);
playField.addEventListener('pointercancel', stopDragging);

// Initial setup.
updateHud();
showScreen('start');
