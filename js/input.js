// Držené klávesy (pohyb srdce) a klávesy zmáčknuté od posledního snímku (menu, potvrzení).
const keys = {};
const pressedKeys = new Set();

const CONFIRM_KEYS = ['z', 'enter', ' '];
const CANCEL_KEYS = ['x', 'shift', 'backspace'];
const LEFT_KEYS = ['arrowleft', 'a'];
const RIGHT_KEYS = ['arrowright', 'd'];
const UP_KEYS = ['arrowup', 'w'];
const DOWN_KEYS = ['arrowdown', 's'];

// Klávesy, které během hry nesmí scrollovat stránkou ani "kliknout" na tlačítko s fokusem.
const GAME_KEYS = new Set([
  ...CONFIRM_KEYS, ...CANCEL_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...UP_KEYS, ...DOWN_KEYS
]);

function isFormField(target) {
  return target instanceof Element && target.matches('input, textarea, select, button');
}

window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  const playing = typeof isGameActive === 'function' && isGameActive();

  if (playing && GAME_KEYS.has(key)) e.preventDefault();

  // Mimo hru patří klávesy formulářovým prvkům (výběr bosse, tlačítka).
  if (!playing && isFormField(e.target)) return;

  if (!e.repeat) pressedKeys.add(key);
  keys[key] = true;
}, true);

window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
}, true);

// Po ztrátě fokusu (alt-tab) by klávesa zůstala "držená" a srdce by ujíždělo.
window.addEventListener('blur', releaseAllKeys);

function releaseAllKeys() {
  for (const key in keys) keys[key] = false;
  pressedKeys.clear();
}

// Vrátí true, pokud byla některá z kláves zmáčknutá, a stisk "spotřebuje".
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

// Směr pro navigaci v menu: { dx, dy } v rozsahu -1..1.
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

// Dotyková tlačítka (data-key) se chovají jako klávesy: stisk = keydown, puštění = keyup.
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
    // dlouhý stisk nesmí otevřít kontextové menu
    button.addEventListener('contextmenu', e => e.preventDefault());
  }
}
