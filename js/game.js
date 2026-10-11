// Main loop and page wiring.
function togglePause() {
  const battle = state.battle;
  if (!battle || battle.phase === 'results' || battle.phase === 'gameover') return;
  state.paused = !state.paused;
  pauseIndex = 0;
  releaseAllKeys();
  if (state.paused) pauseMusic();
  else resumeMusic();
}

function updatePauseMenu() {
  const { dx, dy } = directionPressed();
  const delta = dx || dy;
  if (delta) {
    pauseIndex = (pauseIndex + delta + PAUSE_OPTIONS.length) % PAUSE_OPTIONS.length;
    sfx.move();
  }
  if (cancelPressed()) {
    togglePause();
    return;
  }
  if (!confirmPressed()) return;
  const choice = PAUSE_OPTIONS[pauseIndex];
  state.paused = false;
  if (choice === 'Resume') resumeMusic();
  else if (choice === 'Retry') retryFight();
  else openBossSelect();
}

// One step of game logic, separate from drawing so tests can drive it with a fixed dt.
function updateGame(dt) {
  state.clock += dt;
  if (consumePress(['m'])) toggleMute();

  if (state.scene === 'select') {
    updateSelect(dt);
    return;
  }

  if (consumePress(['escape', 'p'])) togglePause();
  if (state.paused) {
    updatePauseMenu();
    return;
  }

  const battle = state.battle;
  updateBoard(dt);
  updateEffects(dt);
  if (battle.boss.animate) battle.boss.animate(dt, battle);
  updateBattle(dt);
}

function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min((ts - state.lastTime) / 1000, 1 / 30);
  state.lastTime = ts;

  updateGame(dt);
  render();
  endInputFrame();
  requestAnimationFrame(frame);
}

selectBtn.addEventListener('click', () => {
  openBossSelect(state.battle ? state.battle.boss.id : settings.lastBoss);
  canvas.focus();
});
retryBtn.addEventListener('click', () => {
  if (state.battle) retryFight();
  else tryStartSelected();
  canvas.focus();
});
muteBtn.addEventListener('click', toggleMute);
bindTouchControls();
updateMuteButton();

// Pause when the tab is hidden so the player doesn't lose HP while away.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.scene === 'battle' && !state.paused) togglePause();
});

openBossSelect();
requestAnimationFrame(frame);
