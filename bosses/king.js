// King - Deltarune Chapter 1 finale.
// Reference: a fully scripted 15-turn fight. Spade Attack (spades fly across sideways),
// Swing Attack (he grabs the board by a chain and swings it up and down while a line of
// spades sweeps across), Chain Attack (spade-tipped chains shoot along red warning lines),
// Spiked Cage (a cage bouncing off the walls of a shrinking box) and Chained Cage (a cage
// dragged to heart-marked spots, later with a grid of spades). He can't be spared; on turns
// 12-14 his defense drops, and after the 15th attack the fight ends with his fake surrender.

const KING_ORDER = [
  ['spade', 1], ['swing', 1], ['chain', 1], ['cage', 1], ['swing', 2], ['chainedCage', 1], ['chain', 2], ['cage', 2],
  ['spade', 2], ['swing', 3], ['chainedCage', 2], ['chain', 2], ['cage', 2], ['swing', 3], ['spade', 2]
];

const King = registerBoss({
  id: 'king',
  name: 'King',
  game: 'deltarune',
  color: '#b9a6ff',
  emblem: 'spade',

  player: { name: 'SUSIE', maxHp: 140, power: 50 },
  items: ['darkCandy', 'darkCandy', 'darkCandy', 'clubsSandwich', 'reviveMint'],
  maxHp: 1100,
  attack: 18,
  defense: 0,
  checkAttack: 8,
  checkDefense: 0,
  gold: 0,
  box: { w: 140, h: 140 },
  fixedSpeed: true,
  check: 'The King of the Card Kingdom. Lancer\'s dad.',
  intro: '* King blocks the way!',
  flavor: [
    '* King is laughing at you.',
    '* King smells like a deck of cards.',
    '* King\'s chains rattle.',
    '* Lancer is watching from the side.'
  ],

  setup(battle) {
    this.defense = 0;
    battle.flags.courage = false;
  },

  acts: [
    {
      name: 'Courage',
      tp: 25,
      description: 'Brace yourself: -20% damage next turn.',
      use(battle) {
        battle.attackMult = 0.8;
        return '* Susie pumped herself up!\n* Damage taken next turn is reduced!';
      }
    }
  ],

  getDialogue(battle) {
    const lines = [
      'Kneel before your king!',
      'Do you know who you\'re dealing with?',
      'Chaos? I\'ll show you ORDER!',
      'Your little rebellion ends now.',
      'Hah! Pathetic!',
      'My son is a fool for trusting you.'
    ];
    if (battle.turn >= 11) return pick(['W-wait... let\'s talk about this...', 'Can\'t we... come to an agreement?', 'Mercy... please...']);
    return lines[battle.turn % lines.length];
  },

  getFlavor(battle) {
    if (battle.turn >= 11) return '* King\'s defense is crumbling!';
    return null;
  },

  chooseAttack(battle) {
    if (battle.turn >= 11 && battle.turn <= 13) this.defense = -5 * (battle.turn - 10);
    const [id, level] = KING_ORDER[Math.min(battle.turn, KING_ORDER.length - 1)];
    return { ...KING_ATTACKS[id], level, name: `${KING_ATTACKS[id].name}${level > 1 ? ' ' + 'I'.repeat(level) : ''}` };
  },

  onTurnEnd(battle) {
    if (battle.turn >= KING_ORDER.length && !battle.outcome) {
      winBattle(battle, 'survived', '* King pretended to surrender...\n* ...but Lancer and his friends arrived and tied him up!\n* YOU WON! King was captured.');
    }
  },

  attacks: []
});

function kingLevel(run) {
  return run.attack.level || 1 + Math.min(2, run.level);
}

function kingSpade(x, y, vx, vy) {
  return spawn({ kind: 'suit', suit: 'spade', x, y, vx, vy, r: 7, color: '#b9a6ff', maxLife: 5, minLife: 1, faceVelocity: true });
}

const KING_ATTACKS = {
  spade: {
    name: 'Spade attack', duration: 6,
    update(run) {
      const lvl = kingLevel(run);
      every(run, 'spade', (0.55 - lvl * 0.08), () => {
        const fromLeft = chance(0.5);
        const y = chance(0.4) ? state.player.y : rand(arena.y + 12, arena.y + arena.h - 12);
        kingSpade(fromLeft ? arena.x - 12 : arena.x + arena.w + 12, y, (fromLeft ? 1 : -1) * (170 + lvl * 25), 0);
      }, 0.2);
    }
  },
  swing: {
    name: 'Swing attack', duration: 7,
    start(run) {
      run.data.baseY = arena.y;
    },
    update(run) {
      const lvl = kingLevel(run);
      // the board swings up and down on King's chain
      const swing = Math.sin(run.t * (1.6 + lvl * 0.4)) * 34;
      arena.y = run.data.baseY + swing;
      state.box.y = arena.y;
      const p = state.player;
      p.y = Math.max(arena.y + p.r, Math.min(arena.y + arena.h - p.r, p.y));
      every(run, 'line', 1.3 - lvl * 0.15, () => {
        // a column of spades sweeps across, with one gap
        const fromLeft = chance(0.5);
        const rows = 7;
        const gapSize = lvl >= 3 ? 1 : 2;
        const gap = randInt(0, rows - gapSize);
        for (let i = 0; i < rows; i++) {
          if (i >= gap && i < gap + gapSize) continue;
          const yOffset = (arena.h * (i + 0.5)) / rows;
          const s = kingSpade(fromLeft ? arena.x - 12 : arena.x + arena.w + 12, 0, (fromLeft ? 1 : -1) * 150, 0);
          s.update = (b, dt) => {
            b.x += b.vx * dt;
            b.y = arena.y + yOffset;
          };
        }
      }, 0.3);
    },
    end(run) {
      arena.y = run.data.baseY;
    }
  },
  chain: {
    name: 'Chain attack', duration: 6.5,
    update(run) {
      const lvl = kingLevel(run);
      every(run, 'chain', 0.9 - lvl * 0.12, () => {
        // a red warning trail, then a spade-tipped chain shoots along it
        const c = arenaCenter();
        const a = Math.random() * Math.PI * 2;
        const x = c.x + Math.cos(a) * 200;
        const y = c.y + Math.sin(a) * 170;
        const aim = Math.atan2(state.player.y - y, state.player.x - x);
        spawnBeam(x, y, aim, 10, 0.75 - lvl * 0.12, 0.35, { beamColor: '#bbbbbb', kind: 'chain' });
      }, 0.3);
    }
  },
  cage: {
    name: 'Spiked cage', duration: 7,
    box: { w: 200, h: 170 },
    start(run) {
      const lvl = kingLevel(run);
      const speed = 150 + lvl * 30;
      spawn({
        kind: 'cage', x: arena.x + 30, y: arena.y + 30, vx: speed, vy: speed * 0.8, hw: 18, hh: 18, noCull: true,
        update: bounceInArena
      });
      run.data.shrink = lvl >= 2;
    },
    update(run, dt) {
      if (run.data.shrink && arena.w > 140) {
        // the walls close in
        const w = arena.w - 10 * dt;
        const h = arena.h - 8 * dt;
        setArena(w, h);
      }
    }
  },
  chainedCage: {
    name: 'Chained cage', duration: 7.5,
    start(run) {
      run.data.cage = spawn({ kind: 'cage', x: arena.x + arena.w / 2, y: arena.y + 20, hw: 18, hh: 18, noCull: true });
      run.data.target = null;
    },
    update(run, dt) {
      const lvl = kingLevel(run);
      const cage = run.data.cage;
      every(run, 'mark', 1.25, () => {
        // a heart mark shows where the cage will be dragged next
        const t = pickPointAwayFromPlayer(30, 24);
        run.data.target = null;
        spawn({ kind: 'mark', x: t.x, y: t.y, r: 10, harmless: true, maxLife: 0.6, noCull: true });
        run.data.pending = { x: t.x, y: t.y, at: run.t + 0.55 };
      }, 0.3);
      if (run.data.pending && run.t >= run.data.pending.at) {
        run.data.target = run.data.pending;
        run.data.pending = null;
      }
      if (run.data.target) {
        cage.x += (run.data.target.x - cage.x) * Math.min(1, dt * 7);
        cage.y += (run.data.target.y - cage.y) * Math.min(1, dt * 7);
      }
      // later: a fixed grid of spades also hurts
      if (lvl >= 2) {
        once(run, 'grid', 0.2, () => {
          for (let gx = arena.x + 30; gx < arena.x + arena.w; gx += 60) {
            for (let gy = arena.y + 30; gy < arena.y + arena.h; gy += 55) {
              spawn({ kind: 'suit', suit: 'spade', x: gx, y: gy, r: 5, color: '#8a7acc', noCull: true, faceVelocity: false, maxLife: 8 });
            }
          }
        });
      }
    }
  }
};

BULLET_DRAWERS.cage = b => {
  ctx.translate(b.x, b.y);
  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 3;
  ctx.strokeRect(-b.hw + 4, -b.hh + 4, b.hw * 2 - 8, b.hh * 2 - 8);
  ctx.fillStyle = '#d9d9d9';
  // spikes on every side
  for (let i = -1; i <= 1; i++) {
    for (const [dx, dy, rot] of [[i * 10, -b.hh, 0], [i * 10, b.hh, Math.PI], [-b.hw, i * 10, -Math.PI / 2], [b.hw, i * 10, Math.PI / 2]]) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(-4, 4);
      ctx.lineTo(0, -6);
      ctx.lineTo(4, 4);
      ctx.fill();
      ctx.restore();
    }
  }
};

BULLET_DRAWERS.mark = b => {
  drawSuit('heart', b.x, b.y, 20, Math.floor(b.life * 10) % 2 === 0 ? '#ff4d6b' : '#801020');
};

BULLET_DRAWERS.chain = b => {
  const charging = b.life < b.warn;
  ctx.translate(b.originX, b.originY);
  ctx.rotate(b.angle);
  if (charging) {
    ctx.fillStyle = 'rgba(255, 40, 40, 0.5)';
    ctx.fillRect(0, -1.5, 1600, 3);
    return;
  }
  // chain links and a spade tip racing along the line
  const len = Math.min(1600, (b.life - b.warn) * 1600);
  ctx.strokeStyle = '#bbbbbb';
  ctx.lineWidth = 3;
  for (let x = 0; x < len; x += 12) {
    ctx.strokeRect(x, -3, 10, 6);
  }
  drawSuit('spade', len, 0, 16, '#b9a6ff');
};

King.attacks = Object.values(KING_ATTACKS);
