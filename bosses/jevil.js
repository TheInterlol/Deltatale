// Jevil - Deltarune Chapter 1, secret boss.
// Reference: four phases that start when his HP drops (80/60/40 %) or when he gets TIRED
// (Pirouette / Hypnosis ACTs). Phase 1: five-spade volleys, spade spirals, heart bombs,
// spinning scythes. Phase 2: the carousel (bobbing horses), club bombs, diamonds rising from
// below, faster spirals. Phase 3: carousel with ducks, spade bombs, three-club bursts, scythes
// plus a big red scythe. Phase 4: diamond tossing, the CHAOS BOMB, slow diamond rain and
// FINAL CHAOS: the board fills the screen and giant knives fall, leaving pillars of light.
// After that he repeats everything at random. Tire him out to pacify him, or beat him.
// (HP and TP costs are scaled for a one-person party.)

const JEVIL_TIRED_MAX = 9;

const Jevil = registerBoss({
  id: 'jevil',
  name: 'Jevil',
  game: 'deltarune',
  color: '#b06cff',
  emblem: 'scythe',

  player: { name: 'SUSIE', maxHp: 140, power: 46 },
  items: ['darkCandy', 'darkCandy', 'darkCandy', 'clubsSandwich', 'clubsSandwich', 'reviveMint'],
  maxHp: 760,
  attack: 22,
  defense: 0,
  checkAttack: 10,
  checkDefense: 5,
  gold: 0,
  box: { w: 220, h: 190 },
  check: 'A chaotic, freed jester. Tire him out to make him sleep!',
  intro: '* JEVIL appeared! THE GAMES BEGIN!',
  flavor: [
    '* Jevil is spinning around for no reason.',
    '* The carousel music plays from somewhere.',
    '* Jevil laughs at a joke nobody told.',
    '* Smells like a carnival.'
  ],

  setup(battle) {
    this.defense = 0;
    battle.flags.tired = 0;
    battle.flags.pirouettes = 0;
    battle.flags.phaseIndex = 0;   // position in the current phase's attack list
    battle.flags.phase = 1;
    battle.flags.finalChaosDone = false;
  },

  statusText(battle) {
    return `TIRED ${'Z'.repeat(Math.floor(battle.flags.tired))}${'·'.repeat(Math.max(0, JEVIL_TIRED_MAX - Math.floor(battle.flags.tired)))}`;
  },

  acts: [
    {
      name: 'Pirouette',
      tp: 20,
      description: 'Spin around. Something random happens.',
      use(battle) {
        battle.flags.pirouettes += 1;
        jevilTire(battle, 1);
        // a cycle of odd effects, like the original
        const effect = battle.flags.pirouettes % 6;
        if (effect === 1) {
          Jevil.defense -= 4;
          return '* Susie spun around!\n* Jevil\'s DEFENSE dropped!';
        }
        if (effect === 2) {
          battle.attackMult = 0.7;
          return '* Susie spun around!\n* Jevil got dizzy. His next attack is weaker!';
        }
        if (effect === 3) {
          const healed = Math.min(40, state.player.maxHp - state.player.hp);
          state.player.hp += healed;
          return `* Susie spun around!\n* A bird flew by. Susie recovered ${healed} HP!`;
        }
        if (effect === 4) {
          battle.attackMult = 1.25;
          return '* Susie spun around!\n* Jevil got excited! His next attack is stronger!';
        }
        return '* Susie spun around!\n* ...Nothing happened.';
      }
    },
    {
      name: 'Hypnosis',
      tp: 40,
      description: 'Make him drowsy (twice as tiring).',
      use(battle) {
        jevilTire(battle, 2);
        battle.attackMult = 0.7;
        return '* Susie waved her claws hypnotically...\n* Jevil yawned! His next attack is weaker.';
      }
    }
  ],

  onSpare(battle) {
    if (isSpareable(battle)) {
      winBattle(battle, 'spared', '* Jevil fell fast asleep!\n* You got the JEVILSTAIL!\n* YOU WON! The fight is over.');
      return true;
    }
    return false;
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* "THIS BODY CANNOT BE KILLED!"\n* Jevil flew away, dropping the DEVILSKNIFE.\n* YOU WON!';
    return null;
  },

  getFlavor(battle) {
    if (isSpareable(battle)) return '* Jevil is TIRED. Use SPARE to put him to sleep!';
    const phase = jevilPhase(battle);
    if (phase >= 4) return pick(['* Something terrible is coming...!', '* Jevil\'s laugh echoes everywhere.']);
    return null;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick([
      'LET\'S PLAY A GAME! THE PRIZE IS... EVERYTHING!',
      'SPIN, SPIN, AROUND WE GO!',
      'WHAT FUN! WHAT FUN!',
      'I\'M FREE, FREE AS A BIRD!',
      'UEE HEE HEE! KEEP DANCING!',
      'THE CAROUSEL NEVER STOPS!'
    ]);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    const phase = jevilPhase(battle);
    if (phase !== f.phase) {
      f.phase = phase;
      f.phaseIndex = 0;
      sfx.phase();
    }
    // at 15 % HP he skips straight to FINAL CHAOS
    if (!f.finalChaosDone && battle.bossHp <= this.maxHp * 0.15) {
      f.finalChaosDone = true;
      return JEVIL_ATTACKS.finalChaos;
    }
    if (phase === 5) {
      const pool = [...Object.values(JEVIL_ATTACKS).filter(a => a !== JEVIL_ATTACKS.finalChaos), JEVIL_ATTACKS.chaosBomb, JEVIL_ATTACKS.chaosBomb];
      return pick(pool);
    }
    const list = JEVIL_PHASES[phase - 1];
    const attack = list[f.phaseIndex % list.length];
    f.phaseIndex++;
    if (attack === JEVIL_ATTACKS.finalChaos) {
      f.finalChaosDone = true;
      f.phase5 = true;
    }
    return attack;
  },

  attacks: []
});

function jevilTire(battle, amount) {
  battle.flags.tired = Math.min(JEVIL_TIRED_MAX, battle.flags.tired + amount);
  battle.mercy = Math.round((battle.flags.tired / JEVIL_TIRED_MAX) * 100);
  if (battle.flags.tired >= JEVIL_TIRED_MAX) battle.mercy = 100;
  addPopup(`+${amount} TIRED`, bossPosition(battle.boss).x, bossPosition(battle.boss).y - 30, '#9fd8ff');
}

function jevilPhase(battle) {
  const f = battle.flags;
  if (f.phase5) return 5;
  const hp = battle.bossHp / battle.boss.maxHp;
  let phase = 1;
  if (hp <= 0.8 || f.tired >= 2) phase = 2;
  if (hp <= 0.6 || f.tired >= 4) phase = 3;
  if (hp <= 0.4 || f.tired >= 6) phase = 4;
  return phase;
}

// ---------------- Building blocks ----------------
function suitBullet(suit, x, y, vx, vy, r = 7, options = {}) {
  return spawn({ kind: 'suit', suit, x, y, vx, vy, r, angle: 0, color: JEVIL_SUIT_COLORS[suit], ...options });
}

const JEVIL_SUIT_COLORS = { spade: '#b9a6ff', club: '#8ad1ff', heart: '#ff7ab8', diamond: '#ffd35e' };

// A side of the board Jevil "teleports" to before throwing things - a swirl of chaos marks
// the spot, so you can see where the next volley comes from.
function jevilSidePoint(side = pick(['left', 'right'])) {
  const y = arena.y + rand(20, arena.h - 20);
  const point = { x: side === 'left' ? arena.x - 26 : arena.x + arena.w + 26, y, side };
  spawn({ kind: 'jevilPortal', x: point.x, y: point.y, r: 14, harmless: true, noCull: true, clip: false, maxLife: 0.45 });
  return point;
}

function spawnBomb(x, y, fuse, onBurst, vx = 0, vy = 0, suit = null) {
  return spawn({
    kind: 'bomb', x, y, vx, vy, r: 9, noCull: true, harmless: false, fuse, suit,
    update(b, dt) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= 0.96;
      b.vy *= 0.96;
      if (b.life >= b.fuse) {
        b.dead = true;
        addBurst(b.x, b.y, '#ffffff', 8, 90);
        sfx.pop();
        onBurst(b.x, b.y);
      }
    }
  });
}

function bombTarget() {
  return pickPointAwayFromPlayer(70, 30);
}

function throwBomb(fuse, onBurst, suit = null) {
  const from = jevilSidePoint();
  const to = bombTarget();
  const t = fuse * 0.6;
  // thrown with drag (vx *= 0.96 per frame): rough speed so it lands near `to`
  return spawnBomb(from.x, from.y, fuse, onBurst, (to.x - from.x) / t * 0.9, (to.y - from.y) / t * 0.9, suit);
}

function heartBurst(x, y, speedMult = 1) {
  // four hearts orbiting a centre that drifts towards the SOUL
  const v = aimAt(x, y, 110 * speedMult);
  const group = { x, y, vx: v.vx, vy: v.vy, angle: 0 };
  for (let i = 0; i < 4; i++) {
    spawn({
      kind: 'suit', suit: 'heart', x, y, r: 7, color: JEVIL_SUIT_COLORS.heart, noCull: true, maxLife: 4, faceVelocity: false,
      update(b, dt) {
        if (i === 0) {
          group.x += group.vx * dt;
          group.y += group.vy * dt;
          group.angle += 3.2 * dt;
        }
        const radius = Math.min(30, 10 + b.life * 30);
        const a = group.angle + (i * Math.PI) / 2;
        b.x = group.x + Math.cos(a) * radius;
        b.y = group.y + Math.sin(a) * radius;
      }
    });
  }
}

function clubBurst(x, y, speedMult = 1) {
  const base = aimAt(x, y, 1).angle;
  for (const off of [-0.32, 0, 0.32]) {
    const a = base + off;
    suitBullet('club', x, y, Math.cos(a) * 170 * speedMult, Math.sin(a) * 170 * speedMult, 7, { faceVelocity: true, maxLife: 4 });
  }
}

function spadeBurst(x, y, count = 10, speed = 150) {
  const off = Math.random() * Math.PI;
  for (let i = 0; i < count; i++) {
    const a = off + (Math.PI * 2 * i) / count;
    suitBullet('spade', x, y, Math.cos(a) * speed, Math.sin(a) * speed, 7, { faceVelocity: true, maxLife: 4 });
  }
}

function diamondLine(x, y) {
  const v = aimAt(x, y, 230);
  for (let i = 0; i < 3; i++) {
    suitBullet('diamond', x - (v.vx / 230) * i * 18, y - (v.vy / 230) * i * 18, v.vx, v.vy, 6, { faceVelocity: true, maxLife: 4, minLife: 1 });
  }
}

function spadeSpiral(run, count, speed, spin, reverseChance = 0) {
  const c = arenaCenter();
  const dir = chance(0.5) ? 1 : -1;
  const startR = Math.max(arena.w, arena.h) * 0.75;
  const offset = Math.random() * Math.PI * 2;
  const state0 = { dir, flipAt: chance(reverseChance) ? rand(1, 2) : Infinity };
  for (let i = 0; i < count; i++) {
    spawn({
      kind: 'suit', suit: 'spade', x: c.x, y: c.y, r: 9, color: JEVIL_SUIT_COLORS.spade, noCull: true, maxLife: startR / speed * 2.1,
      faceVelocity: false,
      update(b) {
        if (b.life > state0.flipAt && !state0.flipped) {
          state0.flipped = true;
          state0.dir *= -1;
        }
        const r = startR - b.life * speed;
        const a = offset + (Math.PI * 2 * i) / count + b.life * spin * state0.dir;
        b.x = c.x + Math.cos(a) * r;
        b.y = c.y + Math.sin(a) * r;
      }
    });
  }
}

function spinningScythes(count, radiusMin, radiusMax, spin) {
  const c = arenaCenter();
  const dir = chance(0.5) ? 1 : -1;
  for (let i = 0; i < count; i++) {
    spawn({
      kind: 'scythe', x: c.x, y: c.y, r: 13, noCull: true, maxLife: 7,
      update(b) {
        const radius = radiusMin + (radiusMax - radiusMin) * (0.5 + 0.5 * Math.sin(b.life * 1.6));
        const a = (Math.PI * 2 * i) / count + b.life * spin * dir;
        b.x = c.x + Math.cos(a) * radius;
        b.y = c.y + Math.sin(a) * radius;
        b.angle = a * 2;
      }
    });
  }
}

function carouselRow(y, dir, speed, kinds, spacing, startOffset = 0, bob = 12) {
  const count = Math.ceil((arena.w + 200) / spacing) + 2;
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const x0 = dir > 0 ? arena.x - 40 - i * spacing - startOffset : arena.x + arena.w + 40 + i * spacing + startOffset;
    const phase = i * 1.3;
    spawn({
      kind, x: x0, y, vx: dir * speed, hw: 15, hh: 9, noCull: true, maxLife: 14, flip: dir < 0, baseY: y,
      update(b, dt) {
        b.x += b.vx * dt;
        b.y = b.baseY + Math.sin(b.life * 3 + phase) * bob;
      }
    });
  }
}

function diamondRise(speed, warn = 0.35) {
  const x = rand(arena.x + 14, arena.x + arena.w - 14);
  spawn({
    kind: 'suit', suit: 'diamond', x, y: arena.y + arena.h + 14, vx: 0, vy: 0, r: 7, color: JEVIL_SUIT_COLORS.diamond,
    noCull: true, maxLife: 3, warn, faceVelocity: false,
    update(b, dt) {
      if (b.life >= b.warn) b.y -= speed * dt;
    }
  });
}

// ---------------- Attacks ----------------
const JEVIL_ATTACKS = {
  fiveSpade: {
    name: 'Five-spade', duration: 5.5,
    update(run) {
      every(run, 'volley', 0.85 / run.speed, () => {
        const from = jevilSidePoint(run.data.side = run.data.side === 'left' ? 'right' : 'left');
        const base = aimAt(from.x, from.y, 1).angle;
        for (const off of [-0.36, -0.18, 0, 0.18, 0.36]) {
          suitBullet('spade', from.x, from.y, Math.cos(base + off) * 150 * run.speed, Math.sin(base + off) * 150 * run.speed, 7, { faceVelocity: true, minLife: 1, maxLife: 4 });
        }
      }, 0.3);
    }
  },
  spadeSpiral: {
    name: 'Spade spiral', duration: 6,
    update(run) {
      every(run, 'spiral', 2.6, () => spadeSpiral(run, 10, 62 * run.speed, 1.3), 0.1);
    }
  },
  heartBombs: {
    name: 'Heart bombs', duration: 6,
    update(run) {
      every(run, 'bomb', 1.1 / run.speed, () => throwBomb(0.9, (x, y) => heartBurst(x, y, run.speed), 'heart'), 0.2);
    }
  },
  scythes: {
    name: 'Spinning scythes', duration: 6,
    start() {
      // the scythes swing in through the middle and back out - there is no safe centre
      spinningScythes(4, 4, 92, 1.5);
    },
    update() {}
  },
  carousel: {
    name: 'Carousel', duration: 7,
    line: 'ROUND AND ROUND THE CAROUSEL GOES!',
    update(run) {
      once(run, 'rows', 0, () => {
        carouselRow(arena.y + arena.h * 0.28, 1, 105 * run.speed, ['horse'], 92);
        carouselRow(arena.y + arena.h * 0.62, 1, 105 * run.speed, ['horse'], 92, 46, 18);
      });
    }
  },
  clubBombs: {
    name: 'Club bombs', duration: 6,
    update(run) {
      every(run, 'bomb', 0.95 / run.speed, () => throwBomb(0.8, (x, y) => clubBurst(x, y, run.speed), 'club'), 0.2);
    }
  },
  diamondRelease: {
    name: 'Diamond release', duration: 5.5,
    update(run) {
      every(run, 'rise', 0.16 / run.speed, () => diamondRise(330 * run.speed), 0.2);
    }
  },
  spadeSpiral2: {
    name: 'Spade spiral II', duration: 7.5,
    update(run) {
      every(run, 'spiral', 2.2, () => spadeSpiral(run, 12, 78 * run.speed, 1.7, 0.6), 0.1);
    }
  },
  carousel2: {
    name: 'Carousel II', duration: 7.5,
    line: 'DUCKS AND HORSES! HORSES AND DUCKS!',
    update(run) {
      once(run, 'rows', 0, () => {
        carouselRow(arena.y + arena.h * 0.2, 1, 110 * run.speed, ['horse', 'duck'], 100);
        carouselRow(arena.y + arena.h * 0.5, -1, 110 * run.speed, ['duck', 'horse'], 100, 50);
        carouselRow(arena.y + arena.h * 0.8, 1, 110 * run.speed, ['horse', 'duck'], 100, 25);
      });
    }
  },
  spadeBombs: {
    name: 'Spade bombs', duration: 6,
    update(run) {
      every(run, 'bomb', 1.15 / run.speed, () => throwBomb(0.85, (x, y) => spadeBurst(x, y, 10, 140 * run.speed), 'spade'), 0.2);
    }
  },
  threeClub: {
    name: 'Three-club', duration: 6,
    update(run) {
      every(run, 'burst', 1.0 / run.speed, () => {
        // three bursts from the edges at where the SOUL was
        const p = { x: state.player.x, y: state.player.y };
        for (let i = 0; i < 3; i++) {
          const from = jevilSidePoint(i === 1 ? 'right' : 'left');
          const a = Math.atan2(p.y - from.y, p.x - from.x);
          for (const off of [-0.25, 0, 0.25]) {
            suitBullet('club', from.x, from.y, Math.cos(a + off) * 160 * run.speed, Math.sin(a + off) * 160 * run.speed, 7, { faceVelocity: true, minLife: 1, maxLife: 4 });
          }
        }
      }, 0.3);
    }
  },
  scythes2: {
    name: 'Scythes and the red scythe', duration: 7.5,
    start(run) {
      spinningScythes(4, 4, 84, 1.7);
      run.data.sweeps = 0;
    },
    update(run) {
      every(run, 'sweep', 1.6, () => {
        run.data.sweeps++;
        if (run.data.sweeps > 4) return;
        const top = run.data.sweeps % 2 === 1;
        const y = top ? arena.y + 22 : arena.y + arena.h - 22;
        spawn({
          kind: 'scythe', big: true, x: arena.x - 60, y, vx: 260, r: 22, warn: 0.5, noCull: true, maxLife: 3,
          harmless: run.data.sweeps === 4, color: '#ff3b3b',
          update(b, dt) {
            if (b.life >= b.warn) b.x += b.vx * dt;
            b.angle = (b.angle || 0) + dt * 9;
          }
        });
      }, 0.6);
    }
  },
  diamondToss: {
    name: 'Diamond toss', duration: 6,
    update(run) {
      every(run, 'toss', 0.32 / run.speed, () => {
        const c = arenaCenter();
        const a = Math.random() * Math.PI * 2;
        const x = c.x + Math.cos(a) * (arena.w / 2 + 30);
        const y = c.y + Math.sin(a) * (arena.h / 2 + 30);
        const v = aimAt(x, y, 250 * run.speed);
        suitBullet('diamond', x, y, v.vx, v.vy, 6, { faceVelocity: true, minLife: 1, maxLife: 4 });
      }, 0.2);
    }
  },
  chaosBomb: {
    name: 'CHAOS BOMB', duration: 7,
    line: 'CHAOS BOMB! PREPARED JUST FOR YOU!',
    update(run) {
      every(run, 'bomb', 0.8 / run.speed, () => {
        const type = pick(['heart', 'club', 'spade', 'diamond']);
        throwBomb(0.8, (x, y) => {
          if (type === 'heart') heartBurst(x, y, run.speed);
          if (type === 'club') clubBurst(x, y, run.speed);
          if (type === 'spade') spadeBurst(x, y, 10, 140 * run.speed);
          if (type === 'diamond') diamondLine(x, y);
        }, type);
      }, 0.2);
    }
  },
  diamondRelease2: {
    name: 'Diamond release II', duration: 6,
    update(run) {
      every(run, 'rise', 0.2, () => diamondRise(200), 0.2);
    }
  },
  finalChaos: {
    name: 'FINAL CHAOS', duration: 12,
    box: { w: 600, h: 300 },
    line: 'NOW! LET\'S HAVE A REAL GOOD TIME!',
    start(run) {
      const cols = 10;
      const colW = arena.w / cols;
      const drop = (col, at) => run.data.events.push([at, () => fallingKnife(arena.x + colW * (col + 0.5), colW)]);
      run.data.events = [];
      // random drops, then from the edges inwards, then down the middle
      for (let i = 0; i < 8; i++) drop(randInt(0, cols - 1), 0.4 + i * 0.4);
      for (let i = 0; i < cols / 2; i++) {
        drop(i, 4 + i * 0.35);
        drop(cols - 1 - i, 4 + i * 0.35);
      }
      for (let i = 0; i < 4; i++) {
        drop(4, 6.4 + i * 0.4);
        drop(5, 6.6 + i * 0.4);
      }
      run.data.events.push([9, () => giantKnife()]);
      run.data.events.sort((a, b) => a[0] - b[0]);
    },
    update(run) {
      timeline(run, run.data.events);
    }
  }
};

// A giant knife falls down a column; where it lands a pillar of light shoots up.
function fallingKnife(x, colW) {
  spawn({
    kind: 'scythe', big: true, x, y: arena.y - 30, vy: 0, r: 18, warn: 0.55, noCull: true, maxLife: 2,
    update(b, dt) {
      if (b.life >= b.warn) b.y += 640 * dt;
      b.angle = (b.angle || 0) + dt * 12;
      if (b.y >= arena.y + arena.h - 18 && !b.landed) {
        b.landed = true;
        b.dead = true;
        spawn({ kind: 'lightPillar', x, y: arena.y + arena.h / 2, hw: colW / 2 - 3, hh: arena.h / 2, noCull: true, maxLife: 0.6, minLife: 0.6 });
        addShake(4);
      }
    }
  });
  // the column flashes before the knife drops
  spawn({ kind: 'zone', x, y: arena.y + arena.h / 2, hw: colW / 2 - 3, hh: arena.h / 2, warn: 0.55, activeFor: 0, harmless: true, noCull: true });
}

function giantKnife() {
  const c = arenaCenter();
  sfx.phase();
  spawn({
    kind: 'scythe', big: true, giant: true, x: c.x, y: c.y, r: 20, warn: 0.9, noCull: true, maxLife: 2.6, color: '#ff3b3b',
    update(b, dt) {
      b.angle = (b.angle || 0) + dt * 6;
      if (b.life >= b.warn) b.r = Math.min(150, b.r + 260 * dt);
    }
  });
}

const JEVIL_PHASES = [
  [JEVIL_ATTACKS.fiveSpade, JEVIL_ATTACKS.spadeSpiral, JEVIL_ATTACKS.heartBombs, JEVIL_ATTACKS.scythes],
  [JEVIL_ATTACKS.carousel, JEVIL_ATTACKS.clubBombs, JEVIL_ATTACKS.diamondRelease, JEVIL_ATTACKS.spadeSpiral2],
  [JEVIL_ATTACKS.carousel2, JEVIL_ATTACKS.spadeBombs, JEVIL_ATTACKS.threeClub, JEVIL_ATTACKS.scythes2],
  [JEVIL_ATTACKS.diamondToss, JEVIL_ATTACKS.chaosBomb, JEVIL_ATTACKS.diamondRelease2, JEVIL_ATTACKS.finalChaos]
];

Jevil.attacks = Object.values(JEVIL_ATTACKS);

// ---------------- Drawing ----------------
BULLET_DRAWERS.bomb = b => {
  // a round bomb with its suit painted on; the fuse sparks and it flashes before bursting
  const blink = b.life > b.fuse * 0.6 && Math.floor(b.life * 16) % 2 === 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  fillCircle(b.x, b.y + 1, b.r + 2);
  ctx.fillStyle = blink ? '#ff5050' : '#2a2a3a';
  fillCircle(b.x, b.y, b.r);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  fillCircle(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.35);
  if (b.suit) drawSuit(b.suit, b.x, b.y + 1, b.r * 1.1, JEVIL_SUIT_COLORS[b.suit]);
  ctx.strokeStyle = '#d9b36b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x + b.r * 0.5, b.y - b.r * 0.8);
  ctx.quadraticCurveTo(b.x + b.r, b.y - b.r * 1.5, b.x + b.r * 1.2, b.y - b.r * 1.3);
  ctx.stroke();
  ctx.fillStyle = Math.floor(b.life * 20) % 2 ? '#ffe14d' : '#ff8c1a';
  fillCircle(b.x + b.r * 1.2, b.y - b.r * 1.3, 2.5);
};

BULLET_DRAWERS.jevilPortal = b => {
  // a little spinning swirl of chaos where Jevil pops up
  const k = Math.sin((b.life / 0.45) * Math.PI);
  ctx.translate(b.x, b.y);
  ctx.rotate(b.life * 14);
  ctx.globalAlpha *= k;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = i % 2 ? '#b06cff' : '#ffe14d';
    ctx.beginPath();
    ctx.ellipse(6, 0, 9 * k, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  fillCircle(0, 0, 3 * k);
};

BULLET_DRAWERS.scythe = (b, fill) => {
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle || 0);
  const s = b.r / 13;
  ctx.scale(s, s);
  // a generic scythe: a handle and a curved blade
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(-2, -14, 4, 28);
  ctx.fillStyle = b.color && b.color !== 'cyan' && b.color !== 'orange' ? b.color : '#e8e8e8';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.quadraticCurveTo(18, -16, 22, 0);
  ctx.quadraticCurveTo(14, -8, 0, -8);
  ctx.closePath();
  ctx.fill();
};

function drawRideAnimal(b, duck) {
  ctx.translate(b.x, b.y);
  if (b.flip) ctx.scale(-1, 1);
  // the pole is decoration only
  ctx.fillStyle = '#d9b36b';
  ctx.fillRect(-1, -40, 2, 80);
  ctx.fillStyle = duck ? '#ffe25e' : '#f2f2f2';
  fillRoundRect(-15, -8, 30, 16, 6);
  if (duck) {
    fillCircle(12, -10, 7);
    ctx.fillStyle = '#ff9a1a';
    ctx.fillRect(17, -11, 7, 4);
  } else {
    ctx.fillRect(9, -18, 7, 14);
    fillRoundRect(11, -22, 12, 8, 3);
    ctx.fillRect(-12, 6, 3, 8);
    ctx.fillRect(9, 6, 3, 8);
    ctx.fillStyle = '#ff6bb5';
    ctx.fillRect(-15, -8, 4, 10);
  }
}

BULLET_DRAWERS.lightPillar = b => {
  // a pillar of light where a knife landed: bright core, soft edges, fades out
  const k = 1 - b.life / 0.6;
  const x = b.x - b.hw;
  const grad = ctx.createLinearGradient(x, 0, x + b.hw * 2, 0);
  grad.addColorStop(0, 'rgba(255, 249, 196, 0)');
  grad.addColorStop(0.3, `rgba(255, 249, 196, ${0.7 * k})`);
  grad.addColorStop(0.5, `rgba(255, 255, 255, ${k})`);
  grad.addColorStop(0.7, `rgba(255, 249, 196, ${0.7 * k})`);
  grad.addColorStop(1, 'rgba(255, 249, 196, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, b.y - b.hh, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.horse = b => drawRideAnimal(b, false);
BULLET_DRAWERS.duck = b => drawRideAnimal(b, true);
