const state = {
  running: false,
  gameOver: false,
  timer: 0,
  player: null,
  bullets: [],
  lastTime: 0,
  patternClock: 0,
  mode: 'dummy',
  best: 0,
  currentBoss: null,

  gersonAnim: {
    frame: 0,
    timer: 0,
    frameWidth: 81,
    frameHeight: 64,
    frameCount: 7,
    frameDuration: 0.1
  }
};

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

function getBestKey() {
  return `battle_best_${bossSelect.value}`;
}

function updateUi() {
  const p = state.player;
  hpText.textContent = `${Math.max(0, p.hp)} / ${p.maxHp}`;
  hpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
  timeValue.textContent = `${state.timer.toFixed(1)} s`;
  bestValue.textContent = `${state.best.toFixed(1)} s`;
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.timer = 0;
  state.patternClock = 0;
  state.bullets = [];
  state.player = makePlayer();
  if (bossSelect.value === 'gerson') state.currentBoss = Gerson;
  else state.currentBoss = null;
  if (state.currentBoss) state.currentBoss.init();
  state.mode = bossSelect.value;
  state.best = Number(localStorage.getItem(getBestKey()) || 0);
  bossName.textContent = bossSelect.options[bossSelect.selectedIndex].text;
  updateUi();
  statusText.textContent = 'Připraveno. Stiskni Start.';

  if(state.mode === 'gerson'){
    state.gersonAnim.frame = 0;
    state.gersonAnim.timer = 0;

    gersonMusic.pause();
    gersonMusic.currentTime = 0;
  }

  
}

function startGame() {
  resetGame();
  state.running = true;
  statusText.textContent = 'Bojuj a uhýbej.';

  if(state.mode === 'gerson'){
    gersonMusic.currentTime = 0;
    gersonMusic.play();
  }
}

function endGame() {
  state.running = false;
  state.gameOver = true;

  if(state.mode === 'gerson') gersonMusic.pause();

  if (state.timer > state.best) {
    state.best = state.timer;
    localStorage.setItem(getBestKey(), String(state.best));
    statusText.innerHTML = `Konec. <span class="success">Nový rekord!</span>`;
  } else {
    statusText.innerHTML = `Konec. Zkus to znovu.`;
  }

  updateUi();
}