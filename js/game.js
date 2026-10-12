// Keys that work at any time: pause and mute.
function handleGlobalKeys() {
  if (state.screen === 'fight' && consumePress(['escape', 'p'])) togglePause();
  if (consumePress(['m'])) toggleMute();
  if (state.paused && cancelPressed()) openBossSelect();
}

// One step of game logic. Separate from drawing so tests can call it with a fixed dt.
function updateGame(dt) {
  handleGlobalKeys();
  if (state.paused) return;

  state.clock += dt;
  if (state.currentBoss.animate) state.currentBoss.animate(dt);

  if (state.screen === 'select') {
    updateBossSelect();
    updateUi();
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

// Fill the <select> from the roster: one optgroup per area/chapter, unfinished bosses disabled.
function populateBossSelect() {
  bossSelect.innerHTML = '';
  for (const section of ROSTER) {
    for (const group of section.groups) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = `${section.title} · ${group.name}`;
      for (const entry of group.bosses) {
        const option = document.createElement('option');
        option.value = entry.id;
        const boss = getBoss(entry.id);
        option.textContent = boss ? boss.name : `${entry.name} (coming soon)`;
        option.disabled = !boss;
        optgroup.appendChild(option);
      }
      bossSelect.appendChild(optgroup);
    }
  }
}

// Restore the last chosen boss and mode, if they still exist.
function restoreSelection(select, value) {
  if ([...select.options].some(option => option.value === value && !option.disabled)) select.value = value;
}

populateBossSelect();
restoreSelection(bossSelect, settings.boss);
restoreSelection(modeSelect, settings.gameMode);
updateMuteButton();

bossSelect.addEventListener('change', () => {
  resetGame();
  focusBossInMenu(bossSelect.value);
});
modeSelect.addEventListener('change', resetGame);
startBtn.addEventListener('click', () => {
  startGame();
  // move focus away from the button, or Enter/Space would "press" it again during the fight
  canvas.focus();
});
restartBtn.addEventListener('click', () => {
  startGame();
  canvas.focus();
});
menuBtn.addEventListener('click', () => {
  openBossSelect();
  canvas.focus();
});
muteBtn.addEventListener('click', toggleMute);
bindTouchControls();

// Pause when the player switches to another tab, so they don't lose HP.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running && !state.paused) togglePause();
});

openBossSelect(bossSelect.value);
requestAnimationFrame(frame);
