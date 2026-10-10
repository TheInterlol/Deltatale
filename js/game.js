// Klávesy, které fungují kdykoli: pauza a ztlumení zvuku.
function handleGlobalKeys() {
  if (consumePress(['escape', 'p'])) togglePause();
  if (consumePress(['m'])) toggleMute();
}

// Jeden krok herní logiky. Oddělený od kreslení, aby ho testy mohly volat s pevným dt.
function updateGame(dt) {
  handleGlobalKeys();
  if (state.paused) return;

  state.clock += dt;
  if (state.currentBoss.animate) state.currentBoss.animate(dt);
  updateBox(dt);
  updateEffects(dt);

  if (state.running) state.timer += dt;

  if (state.battle) {
    updateBattle(dt);
  } else if (state.running) {
    updatePlayer(dt);
    state.currentBoss.update(dt);
    updateBullets(dt);
  } else {
    // klid před startem nebo po GAME OVER v režimu přežití
    state.idleTime += dt;
    if (state.idleTime > 0.4 && confirmPressed()) startGame();
  }

  updateUi();
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

// Obnoví poslední výběr bosse a režimu, pokud v <select> existuje.
function restoreSelection(select, value) {
  if ([...select.options].some(option => option.value === value)) select.value = value;
}

restoreSelection(bossSelect, settings.boss);
restoreSelection(modeSelect, settings.gameMode);
updateMuteButton();

bossSelect.addEventListener('change', resetGame);
modeSelect.addEventListener('change', resetGame);
startBtn.addEventListener('click', () => {
  startGame();
  // fokus pryč z tlačítka, jinak by ho Enter/mezerník během hry znovu "zmáčkl"
  canvas.focus();
});
restartBtn.addEventListener('click', () => {
  resetGame();
  canvas.focus();
});
muteBtn.addEventListener('click', toggleMute);

// Při přepnutí na jiný panel hru pozastavit, ať hráč nepřijde o HP.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running && !state.paused) togglePause();
});

resetGame();
requestAnimationFrame(frame);
