const state = {
  running: false,
  gameOver: false,
  paused: false,
  timer: 0,
  idleTime: 0,
  clock: 0,
  player: null,
  bullets: [],
  lastTime: 0,
  mode: 'dummy',          // id aktuálního bosse
  gameMode: 'battle',     // 'battle' (tahová bitva) nebo 'survival' (přežití na čas)
  best: 0,
  currentBoss: null,
  battle: null,           // běžící tahová bitva, viz battle.js
  box: { ...arena }       // aktuálně vykreslený box (animuje se mezi arénou a textovým boxem)
};

// Délka nezranitelnosti po zásahu. V bitvě je zásah dražší, proto je delší.
const HURT_COOLDOWN = { survival: 0.45, battle: 0.9 };

function makePlayer() {
  return {
    x: arena.x + arena.w / 2,
    y: arena.y + arena.h / 2,
    r: 8,
    speed: 190,
    hp: 20,
    maxHp: 20,
    hurtCooldown: 0
  };
}

function isGameActive() {
  return state.running || state.battle !== null;
}

function updateUi() {
  const p = state.player;
  hpText.textContent = `${Math.max(0, p.hp)} / ${p.maxHp}`;
  hpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;

  if (state.gameMode === 'battle') {
    const record = state.record || getBossRecord(state.mode);
    timeLabel.textContent = 'Kolo';
    timeValue.textContent = state.battle ? String(state.battle.turn + 1) : '–';
    bestLabel.textContent = 'Poražen / ušetřen';
    bestValue.textContent = `${record.defeated}× / ${record.spared}×`;
  } else {
    timeLabel.textContent = 'Čas přežití';
    timeValue.textContent = `${state.timer.toFixed(1)} s`;
    bestLabel.textContent = 'Nejlepší čas';
    bestValue.textContent = `${state.best.toFixed(1)} s`;
  }
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.paused = false;
  state.timer = 0;
  state.idleTime = 0;
  state.bullets = [];
  state.battle = null;
  state.player = makePlayer();

  state.gameMode = modeSelect.value === 'survival' ? 'survival' : 'battle';
  state.currentBoss = getBoss(bossSelect.value) || getBoss('dummy');
  state.currentBoss.init();
  state.mode = state.currentBoss.id;
  state.best = getBestTime(state.mode);
  state.record = getBossRecord(state.mode);
  state.box = { ...(state.gameMode === 'battle' ? TEXT_BOX : arena) };

  settings.boss = state.mode;
  settings.gameMode = state.gameMode;
  saveSettings();

  resetEffects();
  bossName.textContent = state.currentBoss.name;
  updateUi();
  statusText.textContent = 'Připraveno. Stiskni Start (nebo Z / Enter).';

  // hudbu zastavit vždy - i při přepnutí z Gersona na jiného bosse
  stopMusic();
}

function startGame() {
  resetGame();
  state.running = true;
  pressedKeys.clear();

  if (state.gameMode === 'battle') {
    startBattle();
  } else {
    statusText.textContent = 'Bojuj a uhýbej.';
  }

  if (state.currentBoss.music) playMusic(state.currentBoss.music);
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
    statusText.innerHTML = `Konec. <span class="success">Nový rekord!</span> Z / Enter = znovu.`;
  } else {
    statusText.innerHTML = `Konec. Zkus to znovu (Z / Enter).`;
  }

  updateUi();
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  releaseAllKeys();
  if (state.paused) pauseMusic();
  else resumeMusic();
}
