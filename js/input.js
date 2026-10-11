// Held keys (SOUL movement) and keys pressed since the last frame (menus, confirm, shooting).
const keys = {};
const pressedKeys = new Set();
const releasedKeys = new Set();

const CONFIRM_KEYS = ['z', 'enter'];
const CANCEL_KEYS = ['x', 'shift'];
const LEFT_KEYS = ['arrowleft', 'a'];
const RIGHT_KEYS = ['arrowright', 'd'];
const UP_KEYS = ['arrowup', 'w'];
const DOWN_KEYS = ['arrowdown', 's'];

// Keys that must never scroll the page or "click" a focused button while the game has focus.
const GAME_KEYS = new Set([
  ...CONFIRM_KEYS, ...CANCEL_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...UP_KEYS, ...DOWN_KEYS, ' '
]);

function isFormField(target) {
  return target instanceof Element && target.matches('input, textarea, select, button');
}

window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  const playing = typeof isGameActive === 'function' && isGameActive();

  if (GAME_KEYS.has(key) && (playing || !isFormField(e.target))) e.preventDefault();

  // While nothing is running, keys typed into buttons belong to the page.
  if (!playing && isFormField(e.target)) return;

  if (!e.repeat) pressedKeys.add(key);
  keys[key] = true;
}, true);

window.addEventListener('keyup', e => {
  const key = e.key.toLowerCase();
  keys[key] = false;
  releasedKeys.add(key);
}, true);

// After alt-tab a key would stay "held" and the SOUL would drift.
window.addEventListener('blur', releaseAllKeys);

function releaseAllKeys() {
  for (const key in keys) keys[key] = false;
  pressedKeys.clear();
}

function isHeld(names) {
  return names.some(name => keys[name]);
}

// Returns true if any of the keys was pressed this frame and consumes the press.
function consumePress(names) {
  let hit = false;
  for (const name of names) {
    if (pressedKeys.delete(name)) hit = true;
  }
  return hit;
}

function wasReleased(names) {
  return names.some(name => releasedKeys.has(name));
}

function confirmPressed() {
  return consumePress(CONFIRM_KEYS);
}

function cancelPressed() {
  return consumePress(CANCEL_KEYS);
}

// Menu navigation: { dx, dy } in -1..1.
function directionPressed() {
  const dir = { dx: 0, dy: 0 };
  if (consumePress(LEFT_KEYS)) dir.dx -= 1;
  if (consumePress(RIGHT_KEYS)) dir.dx += 1;
  if (consumePress(UP_KEYS)) dir.dy -= 1;
  if (consumePress(DOWN_KEYS)) dir.dy += 1;
  return dir;
}

// -------------- Pointer (mouse / touch) on the canvas --------------
const pointer = { x: 0, y: 0, clicked: false };

canvas.addEventListener('pointerdown', e => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * W;
  pointer.y = ((e.clientY - rect.top) / rect.height) * H;
  pointer.clicked = true;
});

function consumeClick() {
  if (!pointer.clicked) return null;
  pointer.clicked = false;
  return { x: pointer.x, y: pointer.y };
}

function endInputFrame() {
  pressedKeys.clear();
  releasedKeys.clear();
  pointer.clicked = false;
}

// On-screen touch buttons (data-key) behave like keys: press = keydown, release = keyup.
function bindTouchControls() {
  for (const button of document.querySelectorAll('.touch-controls [data-key]')) {
    const key = button.dataset.key;
    const release = () => {
      if (keys[key]) releasedKeys.add(key);
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
