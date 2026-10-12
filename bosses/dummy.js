// Training Dummy - the Ruins warm-up. In Undertale it never attacks; here it throws a few
// shots so new players can learn the controls. Talk to it to spare it.
const TrainingDummy = registerBoss({
  id: 'dummy',
  name: 'Training Dummy',
  game: 'undertale',
  color: '#d9b77e',
  emblem: 'dummy',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  maxHp: 60,
  attack: 2,
  defense: 0,
  gold: 5,
  checkAttack: 0,
  checkDefense: 0,
  check: 'A cotton heart and a button eye. You are the apple of my eye.',
  intro: '* You encountered the Dummy.',
  flavor: [
    '* The Dummy stands around absentmindedly.',
    '* The Dummy looks like it\'s about to fall over.',
    '* Cotton is sticking out of the Dummy.',
    '* The Dummy stares at you. Probably.'
  ],
  lowHpFlavor: '* The Dummy is wobbling dangerously.',
  dialogue: ['...', '. . .', '(It doesn\'t say anything.)', '...?'],
  acts: [
    {
      name: 'Talk',
      mercy: 100,
      text: '* You talk to the DUMMY.\n* ...\n* It doesn\'t seem much for conversation.\n* It seems happy with you.'
    }
  ],
  showMercy: true,
  box: { w: 260, h: 150 },
  attacks: [
    {
      name: 'From every side',
      duration: 5,
      update(run) {
        every(run, 'shot', 0.55 / run.speed, () => spawnDummy(run.speed));
      }
    },
    {
      name: 'Rapid fire',
      duration: 5.5,
      update(run) {
        every(run, 'shot', 0.4 / run.speed, () => spawnDummy(run.speed));
      }
    }
  ],

  // ---------- Survival (the original endless pattern) ----------
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

  // ---------- Look: a generic straw training dummy ----------
  draw(x, y, t) {
    ctx.save();
    // sways around the foot of its post
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

    // seams and cross-stitched eyes
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
