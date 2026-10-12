const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const bossSelect = document.getElementById('bossSelect');
const modeSelect = document.getElementById('modeSelect');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const muteBtn = document.getElementById('muteBtn');

const hpText = document.getElementById('hpText');
const hpBar = document.getElementById('hpBar');
const timeLabel = document.getElementById('timeLabel');
const timeValue = document.getElementById('timeValue');
const bestLabel = document.getElementById('bestLabel');
const bestValue = document.getElementById('bestValue');
const statusText = document.getElementById('statusText');
const bossName = document.getElementById('bossName');

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

const FONT_FAMILY = '"Courier New", Courier, monospace';
const TEXT_FONT = `bold 19px ${FONT_FAMILY}`;
const SMALL_FONT = `bold 14px ${FONT_FAMILY}`;
const TINY_FONT = `bold 12px ${FONT_FAMILY}`;

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
