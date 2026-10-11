const BoneRain = registerBoss({
  id: 'bones',
  name: 'Bone Rain',

  // ---------- Bitva ----------
  maxHp: 200,
  attack: 3,
  defense: 2,
  gold: 30,
  check: 'Lebka, která si myslí, že je bouřka. Miluje špatné vtipy.',
  intro: '* Z nebe začalo pršet... kosti?',
  flavor: [
    '* Kosti chrastí do rytmu.',
    '* Voní to jako vápník.',
    '* Susie zvažuje, jestli se dají kosti jíst.',
    '* Předpověď: zataženo, místy kosti.'
  ],
  lowHpFlavor: '* Lebka se klepe. Kosti už jí docházejí.',
  dialogue: [
    'MÁM TĚ V HRSTI! KOSTĚNÉ!',
    'TAHLE PŘEDPOVĚĎ JE... KOSTRBATÁ.',
    'PROČ SE SMĚJEŠ? TO NEBYL VTIP!',
    'NYEH HEH HEH! JEŠTĚ JEDNA PŘEHÁŇKA!'
  ],
  acts: [
    {
      name: 'Zasmát se',
      mercy: 34,
      repeatMercy: 20,
      text: '* Susie se zasmála kostěnému vtipu.\n* Lebka radostně zachrastila.'
    },
    {
      name: 'Hodit kost',
      mercy: 40,
      repeatMercy: 15,
      text: '* Susie hodila jednu kost daleko pryč.\n* Bone Rain pro ni nadšeně zaletěl.'
    }
  ],
  attacks: [
    {
      name: 'Přeháňka',
      duration: 6,
      update(run) {
        every(run, 'rain', 0.8 / run.speed, () => spawnBoneRain(run.speed), 0.2);
      }
    },
    {
      name: 'Kostěné zdi',
      duration: 7,
      update(run) {
        every(run, 'wall', 1.3 / run.speed, () => spawnBoneWall(run.speed), 0.3);
      }
    },
    {
      name: 'Bouřka',
      duration: 8,
      update(run) {
        every(run, 'rain', 1.2 / run.speed, () => spawnBoneRain(run.speed), 0.2);
        every(run, 'wall', 2 / run.speed, () => spawnBoneWall(run.speed), 1);
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
    if (this.attackTimer >= 0.8) {
      this.attackTimer = 0;
      spawnBoneRain();
    }
  },

  // ---------- Vzhled ----------
  draw(x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2) * 4);

    // zkřížené kosti za lebkou
    ctx.fillStyle = '#e8e8e8';
    for (const angle of [0.7, -0.7]) {
      ctx.save();
      ctx.rotate(angle);
      ctx.fillRect(-52, -6, 104, 12);
      for (const end of [-52, 52]) {
        fillCircle(end, -6, 8);
        fillCircle(end, 6, 8);
      }
      ctx.restore();
    }

    // lebka
    ctx.fillStyle = '#ffffff';
    fillRoundRect(-34, -48, 68, 56, 22);
    fillRoundRect(-22, 2, 44, 20, 6);

    ctx.fillStyle = '#000';
    fillCircle(-14, -22, 9);
    fillCircle(14, -22, 9);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-5, -1);
    ctx.lineTo(5, -1);
    ctx.closePath();
    ctx.fill();
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 8 - 1, 8, 2, 12);

    // svítící zorničky
    ctx.fillStyle = '#7fd4ff';
    fillCircle(-14, -22, 3);
    fillCircle(14, -22, 3);

    ctx.restore();
  }
});
