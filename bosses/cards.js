const JevilCards = registerBoss({
  id: 'cards',
  name: 'Jevil-ish Cards',

  // ---------- Bitva ----------
  maxHp: 260,
  attack: 4,
  defense: 3,
  gold: 60,
  check: 'Svobodný šašek. Tvrdí, že může dělat cokoli.',
  intro: '* CHAOS, CHAOS!\n* Vzduchem se rozlétly hrací karty.',
  flavor: [
    '* Šašek se točí dokola. Proč? Protože může.',
    '* Karty šustí jako smích.',
    '* Voní to cukrovou vatou a chaosem.',
    '* Svět se na chvíli zatočil. Nebo to byl šašek?'
  ],
  lowHpFlavor: '* Šaškova rolnička cinká unaveně.',
  dialogue: [
    'JÁ MŮŽU DĚLAT COKOLI!',
    'CHAOS, CHAOS!',
    'POJĎ SI HRÁT! PRAVIDLA JSOU JEDNODUCHÁ!',
    'TAK SVOBODNÉ! TAK ZÁBAVNÉ!'
  ],
  acts: [
    {
      name: 'Piruetka',
      mercy: 25,
      repeatMercy: 15,
      text: '* Susie se neochotně zatočila.\n* Šašek tleská: "UHÉÉÉ!"'
    },
    {
      name: 'Hypnóza',
      mercy: 20,
      repeatMercy: 20,
      text: '* Susie kroužila prsty před šaškovýma očima.\n* Šašek zívl. Příští útok bude pomalejší.',
      effect(battle) {
        battle.nextAttackSpeed = 0.75;
      }
    }
  ],
  attacks: [
    {
      name: 'Rozhoz karet',
      duration: 6,
      update(run) {
        every(run, 'burst', 1.2 / run.speed, () => spawnCards(run.speed), 0.3);
      }
    },
    {
      name: 'Kropítko',
      duration: 6.5,
      update(run) {
        every(run, 'fan', 0.42 / run.speed, () => spawnCardFan(run), 0.2);
      }
    },
    {
      name: 'Kruh se svírá',
      duration: 7,
      update(run) {
        every(run, 'ring', 1.7 / run.speed, () => spawnCardRing(run.speed), 0.3);
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
    if (this.attackTimer >= 1.2) {
      this.attackTimer = 0;
      spawnCards();
    }
  },

  // ---------- Vzhled ----------
  draw(x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 3) * 5);
    ctx.rotate(Math.sin(t * 1.5) * 0.08);

    // tělo (kosočtverec)
    ctx.fillStyle = '#5b2c86';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(34, 34);
    ctx.lineTo(0, 64);
    ctx.lineTo(-34, 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2d23c';
    fillCircle(0, 34, 6);

    // čepice se dvěma cípy a rolničkami
    for (const side of [-1, 1]) {
      ctx.fillStyle = side < 0 ? '#7a3fb0' : '#f2d23c';
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.quadraticCurveTo(side * 30, -64, side * 46, -38);
      ctx.lineTo(side * 14, -20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      fillCircle(side * 46, -36, 6);
    }

    // obličej
    ctx.fillStyle = '#f4f4f4';
    fillCircle(0, -12, 20);
    ctx.fillStyle = '#000';
    fillCircle(-7, -16, 4);
    fillCircle(7, -16, 4);
    ctx.fillStyle = '#f2d23c';
    fillCircle(-7, -16, 1.5);
    fillCircle(7, -16, 1.5);

    // úsměv od ucha k uchu
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, -6, 12, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 4 - 1, -5, 2, 4);

    ctx.restore();
  }
});

// Vějíř tří karet z bodu nad arénou, který se kývá ze strany na stranu.
function spawnCardFan(run) {
  const x = arena.x + arena.w / 2;
  const y = arena.y - 24;
  const base = Math.PI / 2 + Math.sin(run.t * 1.6) * 1.0;
  const speed = 150 * run.speed;

  for (const offset of [-0.4, 0, 0.4]) {
    const angle = base + offset;
    spawnBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 7, 'card');
  }
}

// Kruh karet kolem hráče, který se stahuje do středu. Tři karty chybí - tudy se uniká.
function spawnCardRing(speedMult = 1) {
  const p = state.player;
  const count = 14;
  const radius = 150;
  const gapStart = Math.floor(Math.random() * count);
  const speed = 100 * speedMult;

  for (let i = 0; i < count; i++) {
    if ((i - gapStart + count) % count < 3) continue;
    const angle = (Math.PI * 2 * i) / count;
    const card = spawnBullet(
      p.x + Math.cos(angle) * radius,
      p.y + Math.sin(angle) * radius,
      -Math.cos(angle) * speed,
      -Math.sin(angle) * speed,
      7,
      'card'
    );
    // karty startují mimo arénu, nesmí je hned smazat filtr
    card.minLife = (radius * 2) / speed;
  }
}
