const SpamtonBlasters = registerBoss({
  id: 'neo',
  name: 'Spamton-ish Blasters',

  // ---------- Bitva ----------
  maxHp: 240,
  attack: 4,
  defense: 2,
  gold: 97,
  check: 'Obchodník s [[Velkými]] nabídkami. ŽÁDNÉ VRÁCENÍ PENĚZ.',
  intro: '* HEJ HEJ HEJ! JE ČAS STÁT SE [[Velkým Hráčem]]!\n* Obchodník ti nabízí nevyhnutelnou nabídku.',
  flavor: [
    '* Vzduchem létají [[Speciální Nabídky]].',
    '* Je cítit spálená elektronika.',
    '* Susie si pro jistotu drží peněženku.',
    '* Někde zvoní telefon. Nikdo ho nebere.'
  ],
  lowHpFlavor: '* Obchodníkovi jiskří dráty. [[Výprodej]]?',
  dialogue: [
    '[[ŽHAVÁ NABÍDKA]] JEN PRO TEBE!',
    'NEPROPÁSNI [[Jedinečnou Příležitost]]!',
    'JSEM [[Velký]]! JSEM [[VELKÝ]]!!',
    'KLIKNI [[Sem]] A VYHRAJ $$$!'
  ],
  acts: [
    {
      name: 'Uzavřít obchod',
      mercy: 30,
      repeatMercy: 15,
      text: '* Susie podepsala podezřelou smlouvu.\n* "[[Výborný Obchod]]!"'
    },
    {
      name: 'Zavěsit',
      mercy: 20,
      repeatMercy: 20,
      text: '* Susie zavěsila telefon.\n* Obchodník vypadá... ulehčeně?'
    }
  ],
  attacks: [
    {
      name: 'Boční palba',
      duration: 6,
      update(run) {
        every(run, 'side', 0.5 / run.speed, () => spawnBlasters(run.speed), 0.2);
      }
    },
    {
      name: 'Cílené nabídky',
      duration: 6.5,
      update(run) {
        every(run, 'aimed', 0.65 / run.speed, () => spawnAimedBlaster(run.speed), 0.3);
      }
    },
    {
      name: 'Křížová palba',
      duration: 7,
      update(run) {
        every(run, 'side', 0.7 / run.speed, () => spawnBlasters(run.speed), 0.2);
        every(run, 'vertical', 0.7 / run.speed, () => spawnVerticalBlaster(run.speed), 0.55);
      }
    }
  ],

  // ---------- Přežití ----------
  attackTimer: 0,

  init() {
    this.attackTimer = 0;
  },

  update(dt) {
    this.attackTimer += dt;
    if (this.attackTimer >= 0.5) {
      this.attackTimer = 0;
      spawnBlasters();
    }
  },

  // ---------- Vzhled ----------
  draw(x, y, t) {
    ctx.save();
    // občasné "zadrhnutí" jako rozbitá loutka
    const glitch = Math.sin(t * 13) > 0.93 ? (Math.random() * 6 - 3) : 0;
    ctx.translate(x + glitch, y + Math.sin(t * 4) * 3);

    // provázky loutky
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const sx of [-30, 0, 34]) {
      ctx.moveTo(sx, -80);
      ctx.lineTo(sx, sx === 0 ? -48 : 0);
    }
    ctx.stroke();

    // oblek a ruce
    ctx.fillStyle = '#1d1d1d';
    fillRoundRect(-22, -4, 44, 56, 6);
    ctx.save();
    ctx.translate(30, 2);
    ctx.rotate(-0.9 + Math.sin(t * 6) * 0.2);
    ctx.fillRect(-4, -26, 8, 28);
    ctx.restore();
    ctx.fillRect(-36, 0, 8, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -4, 12, 30);
    ctx.fillStyle = '#f2d23c';
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(10, 6);
    ctx.lineTo(10, -2);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fill();

    // hlava
    ctx.fillStyle = '#f4f4f4';
    fillRoundRect(-24, -48, 48, 42, 8);
    ctx.fillStyle = '#ff9bd2';
    fillCircle(-14, -16, 4);
    fillCircle(14, -16, 4);

    // brýle: růžová a žlutá skla
    ctx.fillStyle = '#ff5fb8';
    ctx.fillRect(-20, -38, 16, 10);
    ctx.fillStyle = '#f2d23c';
    ctx.fillRect(4, -38, 16, 10);
    ctx.fillStyle = '#000';
    ctx.fillRect(-4, -36, 8, 3);

    // úsměv
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(10, -14);
    ctx.stroke();

    ctx.restore();
  }
});

// Blaster z náhodného místa kolem arény, mířený na aktuální pozici srdce.
function spawnAimedBlaster(speedMult = 1) {
  const p = state.player;
  const side = Math.floor(Math.random() * 4);
  let x;
  let y;

  if (side === 0) { x = arena.x - 40; y = arena.y + Math.random() * arena.h; }
  if (side === 1) { x = arena.x + arena.w + 40; y = arena.y + Math.random() * arena.h; }
  if (side === 2) { x = arena.x + Math.random() * arena.w; y = arena.y - 40; }
  if (side === 3) { x = arena.x + Math.random() * arena.w; y = arena.y + arena.h + 40; }

  const dist = Math.hypot(p.x - x, p.y - y) || 1;
  const speed = 230 * speedMult;
  spawnBullet(x, y, ((p.x - x) / dist) * speed, ((p.y - y) / dist) * speed, 12, 'blaster');
}

function spawnVerticalBlaster(speedMult = 1) {
  const fromTop = Math.random() > 0.5;
  const x = arena.x + 20 + Math.random() * (arena.w - 40);
  const y = fromTop ? arena.y - 40 : arena.y + arena.h + 40;
  const vy = (fromTop ? 240 : -240) * speedMult;

  spawnBullet(x, y, 0, vy, 14, 'blaster');
}
