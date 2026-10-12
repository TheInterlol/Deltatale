const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// The game is drawn in a fixed 720x405 coordinate space. The canvas itself fills the window
// (keeping 16:9) and its backing store matches the screen's pixels, so text stays sharp.
const VIEW_W = 720;
const VIEW_H = 405;
let viewScale = 1;

function fitCanvas() {
  const stage = canvas.parentElement;
  const availW = stage ? stage.clientWidth : window.innerWidth;
  const availH = stage ? stage.clientHeight : window.innerHeight;
  const cssW = Math.max(320, Math.floor(Math.min(availW, availH * VIEW_W / VIEW_H)));
  const cssH = Math.round(cssW * VIEW_H / VIEW_W);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  viewScale = w / VIEW_W;
}

// Called at the start of every frame: map the 720x405 game space onto the canvas.
function beginFrame() {
  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

// Which boss and mode the next fight uses (chosen on the title and boss select screens).
const selection = { boss: 'toriel', mode: 'battle' };

// A short hint about the current screen (kept for tests and debugging, not drawn).
function setHint(text) {
  if (typeof state !== 'undefined') state.hint = text;
}

// -------------- Canvas layout (720x405) --------
// The bullet board the SOUL moves in. Attacks resize it (see setArena), so it is mutable.
const ARENA_DEFAULT = { x: 170, y: 150, w: 380, h: 190 };
const arena = { ...ARENA_DEFAULT };
// Every bullet board is anchored here: centred horizontally, bottom edge fixed,
// so a taller board grows upwards like in Undertale.
const ARENA_ANCHOR = { x: 360, bottom: 340 };
// The wide text box the board turns into between attacks.
const TEXT_BOX = { x: 60, y: 190, w: 600, h: 150 };
// Where the boss and Susie stand. Undertale bosses stand in the middle, Deltarune ones on the right.
const BOSS_POS_DR = { x: 600, y: 78 };
const BOSS_POS_UT = { x: 360, y: 86 };
const SUSIE_POS = { x: 70, y: 8 };

// Pixel fonts (SIL Open Font License, see assets/fonts): DotGothic16 for text, Pixelify Sans
// for titles and big numbers.
const FONT_FAMILY = '"DotGothic16", "Courier New", monospace';
const TITLE_FAMILY = '"Pixelify Sans", "DotGothic16", monospace';
const TEXT_FONT = `19px ${FONT_FAMILY}`;
const SMALL_FONT = `15px ${FONT_FAMILY}`;
const TINY_FONT = `12px ${FONT_FAMILY}`;

// -------------- Default sprites --------
const susieSprite = new Image();
susieSprite.src = 'assets/susie.png';

const soulRedSprite = new Image();
soulRedSprite.src = 'assets/soul_red.png';

//--------------- GERSON ----------------
const gersonSheet = new Image();
gersonSheet.src = 'assets/gerson_sheet.png';

const axe01Sprite = new Image();
axe01Sprite.src = 'assets/axe01.png';

const gersonMusic = new Audio('assets/Hammer of Justice.mp3');
gersonMusic.loop = true;
gersonMusic.volume = 0.7;

function imageReady(img) {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}

// Resize and re-anchor the bullet board. The drawn box animates towards it.
function setArena(w, h, offsetX = 0) {
  arena.w = w;
  arena.h = h;
  arena.x = Math.round(ARENA_ANCHOR.x - w / 2 + offsetX);
  arena.y = ARENA_ANCHOR.bottom - h;
}

function resetArena() {
  Object.assign(arena, ARENA_DEFAULT);
}

function arenaCenter() {
  return { x: arena.x + arena.w / 2, y: arena.y + arena.h / 2 };
}
