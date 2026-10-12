const state = {
  screen: 'title',        // 'title', 'settings', 'select' (boss select) or 'fight'
  hint: '',
  running: false,
  gameOver: false,
  paused: false,
  timer: 0,
  idleTime: 0,
  clock: 0,
  player: null,
  bullets: [],
  shots: [],              // yellow SOUL shots
  lastTime: 0,
  mode: 'toriel',         // id of the current boss
  gameMode: 'battle',     // 'battle' (turn-based fight) or 'survival' (endless dodging)
  best: 0,
  currentBoss: null,
  battle: null,           // the running turn-based fight, see battle.js
  survival: null,         // survival mode playing a boss' attacks back to back
  record: null,
  box: { ...arena }       // the drawn box (animates between the bullet board and the text box)
};

// Invincibility after a hit. Bosses can override it in battle (boss.iframes).
const HURT_COOLDOWN = { survival: 0.45, battle: 0.9 };

function isGameActive() {
  return state.screen === 'fight' && (state.running || state.battle !== null);
}

// The page has no DOM HUD any more - everything is drawn on the canvas.
function updateUi() {}

// Prepare a fresh fight against the selected boss (without starting it).
function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.paused = false;
  state.timer = 0;
  state.idleTime = 0;
  state.bullets = [];
  state.shots = [];
  state.battle = null;
  state.survival = null;

  state.gameMode = selection.mode === 'survival' ? 'survival' : 'battle';
  state.currentBoss = getBoss(selection.boss) || getBoss('toriel') || Object.values(BOSSES)[0];
  if (state.currentBoss.init) state.currentBoss.init();
  state.mode = state.currentBoss.id;
  state.player = makePlayer(state.gameMode === 'battle' ? playerStats(state.currentBoss) : { maxHp: 20 });
  state.best = getBestTime(state.mode);
  state.record = getBossRecord(state.mode);

  resetArena();
  state.box = { ...(state.gameMode === 'battle' ? TEXT_BOX : arena) };

  settings.boss = state.mode;
  settings.gameMode = state.gameMode;
  saveSettings();

  resetEffects();
  updateUi();
  setHint('Ready. Press Z / Enter (or Start) to fight.');

  // always stop the music - so it never leaks from one boss into another
  stopMusic();
}

function startGame() {
  state.screen = 'fight';
  resetGame();
  state.running = true;
  pressedKeys.clear();

  if (state.gameMode === 'battle') {
    startBattle();
  } else {
    startSurvival();
    setHint('Survive as long as you can.');
  }

  const music = getBossMusic(state.currentBoss);
  if (music) playMusic(music);
}

// Back to the boss select menu, with the cursor on `focusId` (default: the current boss).
function openBossSelect(focusId = state.mode) {
  resetGame();
  state.screen = 'select';
  focusBossInMenu(focusId);
  playMenuMusic();
  setHint('Choose a boss: arrows to move, Z / Enter to fight, ← → to switch game.');
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  state.idleTime = 0;

  stopMusic();

  if (state.gameMode === 'battle') {
    loseBattle();
    updateUi();
    return;
  }

  sfx.gameOver();
  if (state.timer > state.best) {
    state.best = state.timer;
    saveBestTime(state.mode, state.best);
    setHint('Game over. New record!');
  } else {
    setHint('Game over.');
  }

  updateUi();
}

function togglePause() {
  if (!state.running && !(state.battle && !state.gameOver)) return;
  state.paused = !state.paused;
  screens.pauseCursor = 0;
  releaseAllKeys();
  if (state.paused) pauseMusic();
  else resumeMusic();
}

// ---------------- Survival mode ----------------
// Bosses with their own init()/update() keep their original endless pattern.
// Everyone else plays their battle attacks back to back, getting faster each loop.
function startSurvival() {
  const boss = state.currentBoss;
  if (boss.update) {
    state.player.x = arena.x + arena.w / 2;
    state.player.y = arena.y + arena.h / 2;
    return;
  }
  state.survival = { index: 0, loop: 0 };
  nextSurvivalAttack();
}

function nextSurvivalAttack() {
  const boss = state.currentBoss;
  const s = state.survival;
  const attack = boss.attacks[s.index % boss.attacks.length];
  const loop = Math.floor(s.index / boss.attacks.length);
  s.index += 1;
  s.run = beginAttackRun(attack, { level: loop, speed: 1 + 0.1 * Math.min(loop, 4), battle: null });
}

function updateSurvival(dt) {
  const boss = state.currentBoss;
  if (boss.update) {
    updateSoul(dt);
    boss.update(dt);
    updateBullets(dt);
    return;
  }
  const run = state.survival.run;
  stepAttackRun(run, dt);
  if (!state.running) return;
  if (attackRunFinished(run)) {
    finishAttackRun(run);
    nextSurvivalAttack();
  }
}
