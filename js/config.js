// Canvas, screen layouts and shared assets.
// The canvas is 640x480 like Undertale and Deltarune, so attack layouts can match the originals.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const muteBtn = document.getElementById('muteBtn');
const selectBtn = document.getElementById('selectBtn');
const retryBtn = document.getElementById('retryBtn');
const statusText = document.getElementById('statusText');

const FONT_FAMILY = '"Determination Mono", "DTM-Mono", "Courier New", Courier, monospace';
function font(size, weight = 'bold') {
  return `${weight} ${size}px ${FONT_FAMILY}`;
}
const TEXT_FONT = font(22);
const SMALL_FONT = font(15);
const BUBBLE_FONT = font(15);

// Undertale screen: enemy at the top, bullet board in the middle, stats + 4 buttons at the bottom.
const UT = {
  textBox: { x: 32, y: 250, w: 576, h: 140 },
  boxBottom: 390,
  enemy: { x: 320, y: 128 },
  statsY: 400,
  buttonY: 432,
  buttonW: 110,
  buttonH: 42,
  buttonX: [32, 185, 345, 500]
};

// Deltarune screen: party on the left, enemy on the right, board in the centre,
// party panels + text box at the bottom, TP gauge on the left edge.
const DR = {
  board: { cx: 320, cy: 172 },
  textBox: { x: 0, y: 368, w: 640, h: 112 },
  panelY: 326,
  panelH: 42,
  tp: { x: 22, y: 64, w: 20, h: 196 },
  enemy: { x: 512, y: 170 },
  party: [{ x: 120, y: 112 }, { x: 108, y: 196 }, { x: 128, y: 276 }]
};

// -------------- Shared image/audio assets --------------
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function imageReady(img) {
  return img && img.complete && img.naturalWidth > 0;
}

const ASSETS = {
  susie: loadImage('assets/susie.png'),
  soul: loadImage('assets/soul_red.png'),
  gersonSheet: loadImage('assets/gerson_sheet.png'),
  axe: loadImage('assets/axe01.png')
};

const gersonMusic = new Audio('assets/Hammer of Justice.mp3');
gersonMusic.loop = true;
gersonMusic.volume = 0.6;
