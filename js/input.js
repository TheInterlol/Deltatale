// Held keys (SOUL movement) and keys pressed since the last frame (menus, confirm).
const keys = {};
const pressedKeys = new Set();

const CONFIRM_KEYS = ['z', 'enter', ' '];
const CANCEL_KEYS = ['x', 'shift', 'backspace'];
const LEFT_KEYS = ['arrowleft', 'a'];
const RIGHT_KEYS = ['arrowright', 'd'];
const UP_KEYS = ['arrowup', 'w'];
const DOWN_KEYS = ['arrowdown', 's'];

// Keys that must not scroll the page or "click" a focused button while playing.
const GAME_KEYS = new Set([
  'escape', 'p', 'f', 'm', ...CONFIRM_KEYS, ...CANCEL_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...UP_KEYS, ...DOWN_KEYS
]);

function isFormField(target) {
  return target instanceof Element && target.matches('input, textarea, select, button');
}

window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  const playing = typeof isGameActive === 'function' && isGameActive();
  const inMenu = typeof state !== 'undefined' && state.screen !== 'fight';

  // Outside a fight, keys belong to form controls (boss select, buttons).
  if (!playing && isFormField(e.target)) return;

  if ((playing || inMenu) && GAME_KEYS.has(key)) e.preventDefault();

  if (!e.repeat) pressedKeys.add(key);
  keys[key] = true;
  // browsers only start audio after the first key press or click
  if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}, true);

window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
}, true);

// After losing focus (alt-tab) a key would stay "held" and the SOUL would drift.
window.addEventListener('blur', releaseAllKeys);

function releaseAllKeys() {
  for (const key in keys) keys[key] = false;
  pressedKeys.clear();
}

// Returns true if one of the keys was pressed, and "consumes" the press.
function consumePress(names) {
  let hit = false;
  for (const name of names) {
    if (pressedKeys.delete(name)) hit = true;
  }
  return hit;
}

function confirmPressed() {
  return consumePress(CONFIRM_KEYS);
}

function cancelPressed() {
  return consumePress(CANCEL_KEYS);
}

// Direction for menu navigation: { dx, dy } in -1..1.
function directionPressed() {
  const dir = { dx: 0, dy: 0 };
  if (consumePress(LEFT_KEYS)) dir.dx -= 1;
  if (consumePress(RIGHT_KEYS)) dir.dx += 1;
  if (consumePress(UP_KEYS)) dir.dy -= 1;
  if (consumePress(DOWN_KEYS)) dir.dy += 1;
  return dir;
}

function endInputFrame() {
  pressedKeys.clear();
}

// Touch buttons (data-key) behave like keys: press = keydown, release = keyup.
function bindTouchControls() {
  for (const button of document.querySelectorAll('.touch-controls [data-key]')) {
    const key = button.dataset.key;
    const release = () => {
      keys[key] = false;
      button.classList.remove('is-pressed');
    };

    button.addEventListener('pointerdown', e => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      pressedKeys.add(key);
      keys[key] = true;
      button.classList.add('is-pressed');
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    // a long press must not open the context menu
    button.addEventListener('contextmenu', e => e.preventDefault());
  }
}
