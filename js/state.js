// Global game state. `scene` is 'select' (boss selection) or 'battle'.
const state = {
  scene: 'select',
  battle: null,
  bullets: [],
  shots: [],
  clock: 0,
  paused: false,
  lastTime: 0
};

function currentStyle() {
  return state.battle ? state.battle.style : 'undertale';
}

function isGameActive() {
  return state.scene === 'battle' || document.activeElement === canvas;
}
