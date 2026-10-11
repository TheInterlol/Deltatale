const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const bossSelect = document.getElementById('bossSelect');
const modeSelect = document.getElementById('modeSelect');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

const hpText = document.getElementById('hpText');
const hpBar = document.getElementById('hpBar');
const timeLabel = document.getElementById('timeLabel');
const timeValue = document.getElementById('timeValue');
const bestLabel = document.getElementById('bestLabel');
const bestValue = document.getElementById('bestValue');
const statusText = document.getElementById('statusText');
const bossName = document.getElementById('bossName');

// -------------- Rozložení plátna (720x405) --------
// Bitevní box, ve kterém se během útoku pohybuje srdce.
const arena = { x: 170, y: 150, w: 380, h: 190 };
// Širší textový box, na který se arena roztáhne v menu (jako v Undertale).
const TEXT_BOX = { x: 60, y: 190, w: 600, h: 150 };
// Střed, kolem kterého se kreslí boss, a pozice Susie.
const BOSS_POS = { x: 600, y: 78 };
const SUSIE_POS = { x: 70, y: 8 };

const TEXT_FONT = 'bold 19px "Courier New", Courier, monospace';
const SMALL_FONT = 'bold 14px "Courier New", Courier, monospace';

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
