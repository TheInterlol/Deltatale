const TrainingDummy = registerBoss({
  id: 'dummy',
  name: 'Training Dummy',

  // ---------- Bitva ----------
  maxHp: 60,
  attack: 2,
  defense: 0,
  gold: 5,
  check: 'Stará cvičná figurína. Prý vydrží úplně všechno.',
  intro: '* Cvičná figurína se ti postavila do cesty.\n* (Tohle je jen zahřívací kolo.)',
  flavor: [
    '* Figurína stojí. Je v tom fakt dobrá.',
    '* Z figuríny trčí sláma.',
    '* Susie si protahuje klouby.',
    '* Figurína na tebe zírá. Asi.'
  ],
  lowHpFlavor: '* Figurína se nebezpečně kymácí.',
  dialogue: ['...', '. . .', '(Figurína mlčí.)', '...?'],
  acts: [
    {
      name: 'Promluvit',
      mercy: 50,
      text: '* Susie na figurínu promluvila.\n* Figurína vypadá, že poslouchá.'
    },
    {
      name: 'Obejmout',
      mercy: 50,
      text: '* Susie figurínu neohrabaně objala.\n* ...Nikdo to neviděl, jasný?'
    }
  ],
  attacks: [
    {
      name: 'Ze všech stran',
      duration: 5,
      update(run) {
        every(run, 'shot', 0.55 / run.speed, () => spawnDummy(run.speed));
      }
    },
    {
      name: 'Rychlá palba',
      duration: 5.5,
      update(run) {
        every(run, 'shot', 0.4 / run.speed, () => spawnDummy(run.speed));
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
    if (this.attackTimer >= 0.55) {
      this.attackTimer = 0;
      spawnDummy();
    }
  },

  // ---------- Vzhled ----------
  draw(x, y, t) {
    ctx.save();
    // kývá se kolem paty sloupku
    ctx.translate(x, y + 60);
    ctx.rotate(Math.sin(t * 2) * 0.04);

    ctx.fillStyle = '#4a3220';
    ctx.fillRect(-22, -6, 44, 6);
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(-5, -42, 10, 40);

    ctx.fillStyle = '#d9b77e';
    fillRoundRect(-26, -98, 52, 60, 10);
    fillRoundRect(-48, -90, 24, 12, 5);
    fillRoundRect(24, -90, 24, 12, 5);
    fillCircle(0, -116, 20);

    // švy a oči z křížkových stehů
    ctx.strokeStyle = '#8b6b3e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -94);
    ctx.lineTo(0, -42);
    for (const ex of [-8, 8]) {
      ctx.moveTo(ex - 4, -122);
      ctx.lineTo(ex + 4, -114);
      ctx.moveTo(ex + 4, -122);
      ctx.lineTo(ex - 4, -114);
    }
    ctx.stroke();

    ctx.restore();
  }
});
