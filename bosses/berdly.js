// Berdly - Deltarune Chapter 2 (Cyber Field, on the roller coaster).
// Reference: three attacks in a cycle - Tornado (walls of tornadoes moving across), Chirashi
// (graded papers marked "A+" fluttering over the board) and Spear Blast (a telegraphed curvy
// trail that then sprouts spikes). Bump him (ACT) to raise MERCY and spare him; at half HP
// he gets TIRED and can be spared too.

const Berdly = registerBoss({
  id: 'berdly',
  name: 'Berdly',
  game: 'deltarune',
  color: '#5ec8ff',
  emblem: 'tornado',

  player: { name: 'SUSIE', maxHp: 160, power: 52 },
  maxHp: 760,
  attack: 18,
  defense: 0,
  checkAttack: 10,
  checkDefense: 0,
  gold: 0,
  box: { w: 140, h: 140 },
  fixedSpeed: true,
  check: 'Self-proclaimed smartest student. Has a lot of "facts".',
  intro: '* Berdly blocks the way!\n* "Prepare to be out-smarted!"',
  flavor: [
    '* Berdly adjusts his glasses.',
    '* Berdly is explaining something nobody asked about.',
    '* Smells like a library.',
    '* Berdly is doing math in his head.'
  ],

  acts: [
    { name: 'Bump', mercy: 15, text: '* Susie bumped into Berdly. Hard.\n* "H-hey! Watch it!"' },
    { name: 'BumpX', tp: 40, mercy: 35, text: '* Susie charged straight into Berdly!\n* Berdly spun around like a top!' }
  ],

  getFlavor(battle) {
    if (battle.bossHp <= battle.boss.maxHp / 2 && !isSpareable(battle)) return '* Berdly looks TIRED. (He can be SPARED.)';
    return null;
  },

  onSpare(battle) {
    if (battle.bossHp <= battle.boss.maxHp / 2 || isSpareable(battle)) {
      winBattle(battle, 'spared', '* Berdly gave up... for now.\n* "Hmph! A temporary setback!"\n* YOU WON!');
      return true;
    }
    return false;
  },

  getDialogue(battle, attack) {
    return attack.line || pick([
      'Did you know birds evolved from dinosaurs? I did!',
      'Behold my superior intellect!',
      'This is just like my favorite strategy game!',
      'Hah! Predictable!',
      'I\'m the smartest one here!'
    ]);
  },

  chooseAttack(battle) {
    return this.attacks[battle.turn % this.attacks.length];
  },

  attacks: [
    {
      name: 'Tornado',
      duration: 6.5,
      update(run) {
        every(run, 'wall', 1.3, () => {
          // a wall of four tornadoes moving left, with a gap
          const rows = 5;
          const gap = randInt(0, rows - 1);
          for (let i = 0; i < rows; i++) {
            if (i === gap) continue;
            spawn({ kind: 'tornado', x: arena.x + arena.w + 20, y: arena.y + (arena.h * (i + 0.5)) / rows, vx: -135, r: 11, minLife: 1 });
          }
        }, 0.2);
      }
    },
    {
      name: 'Chirashi',
      duration: 6.5,
      update(run) {
        every(run, 'paper', 0.3, () => {
          const x = rand(arena.x, arena.x + arena.w);
          spawn({
            kind: 'paper', x, y: arena.y - 10, r: 8, hw: 8, hh: 10, maxLife: 4, minLife: 1, phase: rand(0, 6),
            update(b, dt) {
              // papers flutter down in a sine wave
              b.y += 90 * dt;
              b.x += Math.cos(b.life * 3 + b.phase) * 70 * dt;
              b.angle = Math.sin(b.life * 3 + b.phase) * 0.5;
            }
          });
        }, 0.1);
      }
    },
    {
      name: 'Spear blast',
      duration: 7,
      update(run) {
        every(run, 'trail', 1.6, () => {
          // a curvy telegraphed trail; spikes shoot out from it
          const fromLeft = chance(0.5);
          const baseY = rand(arena.y + 40, arena.y + arena.h - 40);
          const amp = rand(20, 45);
          const points = [];
          // five points, so there's room to stand between the spikes they shoot
          const off = rand(0.25, 0.75);
          for (let i = 0; i < 5; i++) {
            const k = (i + off) / 5;
            const x = fromLeft ? arena.x + arena.w * k : arena.x + arena.w * (1 - k);
            points.push({ x, y: baseY + Math.sin(i * 1.8) * amp });
          }
          points.forEach((pt, i) => {
            spawn({
              kind: 'normal', x: pt.x, y: pt.y, r: 4, warn: 0.6 + i * 0.09, activeFor: 0.1, harmless: false, noCull: true, color: '#5ec8ff',
              onLand: null
            });
            run.data.spikes = run.data.spikes || [];
            run.data.spikes.push({ x: pt.x, y: pt.y, at: run.t + 0.7 + i * 0.09 });
          });
        }, 0.2);
        // when the trail fires, little spikes burst up and down from it
        if (run.data.spikes) {
          run.data.spikes = run.data.spikes.filter(s => {
            if (run.t < s.at) return true;
            for (const dir of [-1, 1]) {
              spawn({ kind: 'spear', x: s.x, y: s.y, vy: dir * 160, hw: 9, hh: 2, angle: dir * Math.PI / 2, maxLife: 1.5, color: '#9fe3ff' });
            }
            return false;
          });
        }
      }
    }
  ]
});

BULLET_DRAWERS.tornado = b => {
  ctx.strokeStyle = '#9fe3ff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(b.x + Math.sin(b.life * 10 + i) * 2, b.y - 8 + i * 5, 11 - i * 2, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
};

BULLET_DRAWERS.paper = b => {
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle || 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
  ctx.fillStyle = '#ff3030';
  ctx.font = `8px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('A+', 0, 3);
};
