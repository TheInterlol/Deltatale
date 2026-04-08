const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const bossSelect = document.getElementById('bossSelect');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const hpText = document.getElementById('hpText');
const hpBar = document.getElementById('hpBar');
const timeValue = document.getElementById('timeValue');
const bestValue = document.getElementById('bestValue');
const statusText = document.getElementById('statusText');
const bossName = document.getElementById('bossName');

const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

const arena = { x: 170, y: 150, w: 380, h: 190 };

// -------------- Default Sprity --------
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

