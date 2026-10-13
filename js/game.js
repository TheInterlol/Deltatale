// Keys that work at any time: pause, mute, fullscreen.
function handleGlobalKeys() {
  if (state.screen === 'fight' && consumePress(['escape', 'p'])) togglePause();
  if (consumePress(['m'])) toggleMute();
  if (consumePress(['f'])) toggleFullscreen();
}

// One step of game logic. Separate from drawing so tests can call it with a fixed dt.
function updateGame(dt) {
  handleGlobalKeys();
  updateMusic(dt);

  if (state.screen === 'settings') {
    state.clock += dt;
    updateSettings();
    return;
  }
  if (state.paused) {
    updatePauseMenu();
    return;
  }

  state.clock += dt;
  if (state.currentBoss.animate) state.currentBoss.animate(dt);

  if (state.screen === 'title') {
    updateTitle();
    return;
  }
  if (state.screen === 'select') {
    updateBossSelect();
    return;
  }

  updateBox(dt);
  updateEffects(dt);

  if (state.running) state.timer += dt;

  if (state.battle) {
    updateBattle(dt);
  } else if (state.running) {
    updateSurvival(dt);
  } else {
    // idle before the start, or after GAME OVER in survival
    state.idleTime += dt;
    if (state.idleTime > 0.4 && confirmPressed()) startGame();
    else if (state.idleTime > 0.4 && cancelPressed()) openBossSelect();
  }

}

function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min((ts - state.lastTime) / 1000, 0.033);
  state.lastTime = ts;

  updateGame(dt);
  render();
  endInputFrame();
  requestAnimationFrame(frame);
}

// Restore the last chosen boss and mode, if they still exist.
if (getBoss(settings.boss)) selection.boss = settings.boss;
if (['battle', 'survival'].includes(settings.gameMode)) selection.mode = settings.gameMode;

fitCanvas();
window.addEventListener('resize', fitCanvas);
document.addEventListener('fullscreenchange', fitCanvas);
// the canvas takes the keyboard; clicking it (or anywhere) keeps the focus there
canvas.focus();
document.addEventListener('pointerdown', () => canvas.focus());
bindTouchControls();

// Pause when the player switches to another tab, so they don't lose HP.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running && !state.paused) togglePause();
});

preloadAttackArt();
resetGame();
openTitle();
// redraw once the pixel fonts are in (the canvas doesn't wait for them by itself)
if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load(`16px ${FONT_FAMILY}`), document.fonts.load(`bold 16px ${TITLE_FAMILY}`)]).catch(() => {});
}
requestAnimationFrame(frame);
