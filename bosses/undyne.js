// Undyne - Undertale, Waterfall (Neutral/Pacifist).
// Reference: the SOUL turns GREEN - it can't move and must face incoming spears with a
// shield (arrow keys). Spears come from all four sides at different speeds; yellow ones
// swing around and hit from the opposite side. Between green sets she switches the SOUL to
// RED: spears rise from the floor of a tiny box, or a volley of spears appears around the
// board and flies at you. Her attacks speed up every turn. She cannot be spared - in the
// original you run away to Hotland while she chases you. Here: FIGHT her down, or once the
// red phase starts, FLEE to escape (and win). Challenge speeds her up, Plead slows her down.

const UNDYNE_SPEAR_DISTANCE = 230;

const Undyne = registerBoss({
  id: 'undyne',
  name: 'Undyne',
  game: 'undertale',
  color: '#4dc3ff',
  emblem: 'spear',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 120 },
  items: ['butterscotchPie', 'snowmanPiece', 'snowmanPiece', 'cinnaBun', 'monsterCandy'],
  maxHp: 1500,
  attack: 5,
  defense: 0,
  checkAttack: 50,
  checkDefense: 20,
  gold: 0,
  fixedSpeed: true,
  check: 'The heroine that NEVER gives up.',
  intro: '* Undyne attacks!',
  flavor: [
    '* Undyne flips her spear impatiently.',
    '* Undyne points heroically towards the sky.',
    '* Smells like sushi.',
    '* Undyne is hyperventilating.',
    '* Undyne\'s eye is twitching.'
  ],
  lowHpFlavor: '* Undyne\'s breathing is heavy... but she refuses to fall.',

  setup(battle) {
    battle.flags.pace = 1;        // grows every turn, Challenge/Plead change it
    battle.flags.redSeen = false;
  },

  acts: [
    {
      name: 'Plead',
      description: 'Ask her to calm down.',
      use(battle) {
        battle.flags.pace = Math.max(0.85, battle.flags.pace - 0.15);
        return '* You told Undyne you didn\'t want to fight.\n* Nothing happened... but her attacks got a little gentler.';
      }
    },
    {
      name: 'Challenge',
      description: 'Make her go all out.',
      use(battle) {
        battle.flags.pace = Math.min(1.7, battle.flags.pace + 0.15);
        return '* You told Undyne her attacks were too easy.\n* The bullets got faster.';
      }
    }
  ],

  getDialogue(battle, attack) {
    return attack.line || pick([
      'NGAHHH!!!',
      'You\'re not getting past me!',
      'Is that all you\'ve got!?',
      'For everyone\'s hopes and dreams!',
      'Show me what you can do!'
    ]);
  },

  onFlee(battle) {
    if (!battle.flags.redSeen) {
      showResult(battle, '* You can\'t escape while your SOUL is GREEN!');
      return true;
    }
    winBattle(battle, 'survived', '* You fled!\n* Undyne chased you all the way to Hotland...\n* ...and collapsed in the heat. YOU ESCAPED!');
    return true;
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Undyne staggered... and fell.\n* "N-no... I won\'t... give up..."\n* YOU WON! You earned 500 EXP and 0 gold.';
    return null;
  },

  // Neutral order: green sets with short red interludes, then mostly red.
  chooseAttack(battle) {
    const f = battle.flags;
    const order = ['green', 'green', 'green', 'green', 'transition', 'pit', 'green', 'green', 'volley', 'green', 'pit', 'volley'];
    let id = order[battle.turn] || pick(['green', 'green', 'pit', 'volley']);
    if (id !== 'green') f.redSeen = true;
    if (battle.turn > 0) f.pace = Math.min(1.7, f.pace + 0.04);
    return UNDYNE_ATTACKS[id];
  },

  attacks: []
});

const SIDES = ['up', 'down', 'left', 'right'];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const SIDE_VECTOR = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

// A spear flying at the green SOUL from `side`. Yellow (reverse) spears turn around
// the SOUL halfway and hit from the opposite side.
function undyneSpear(side, speed, reverse = false) {
  const c = arenaCenter();
  const v = SIDE_VECTOR[side];
  const spear = spawn({
    kind: 'arrow', x: c.x + v.x * UNDYNE_SPEAR_DISTANCE, y: c.y + v.y * UNDYNE_SPEAR_DISTANCE,
    vx: -v.x * speed, vy: -v.y * speed, r: 5, dir: side, reverse, clip: false, noCull: true,
    dieOnHit: true, maxLife: 6,
    update(b, dt) {
      const dist = Math.hypot(b.x - c.x, b.y - c.y);
      if (b.reverse && !b.reversed && dist < 78) {
        // swing around the SOUL to the opposite side
        b.turning = (b.turning || 0) + dt * 4.2;
        const start = Math.atan2(v.y, v.x);
        const angle = start + Math.PI * Math.min(1, b.turning);
        b.x = c.x + Math.cos(angle) * 78;
        b.y = c.y + Math.sin(angle) * 78;
        b.vx = -Math.cos(angle) * speed;
        b.vy = -Math.sin(angle) * speed;
        if (b.turning >= 1) {
          b.reversed = true;
          b.dir = OPPOSITE[side];
        }
        return;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  });
  return spear;
}

// A script of spears: [delay after the previous one, side, speed multiplier, reverse].
function makeSpearScript(level, pace) {
  const count = 7 + Math.min(level, 5);
  const list = [];
  let side = pick(SIDES);
  for (let i = 0; i < count; i++) {
    // mostly change sides, sometimes repeat for a quick double
    if (chance(0.7)) side = pick(SIDES.filter(s => s !== side));
    const fast = chance(0.25 + 0.05 * level);
    const reverse = level >= 1 && chance(0.18);
    list.push([i === 0 ? 0.3 : rand(0.42, 0.62) / pace, side, fast ? 1.6 : 1, reverse]);
  }
  return list;
}

const UNDYNE_ATTACKS = {
  green: {
    name: 'Spears (green SOUL)',
    soul: 'green',
    box: { w: 84, h: 84 },
    start(run) {
      const pace = run.battle ? run.battle.flags.pace : 1 + run.level * 0.1;
      run.data.pace = pace;
      run.data.script = makeSpearScript(run.level + (run.battle ? Math.floor(run.battle.turn / 3) : 0), pace);
      run.data.next = 0;
      run.data.clock = 0;
    },
    update(run, dt) {
      run.data.clock += dt;
      const script = run.data.script;
      while (run.data.next < script.length && run.data.clock >= script[run.data.next][0]) {
        const [, side, mult, reverse] = script[run.data.next];
        run.data.clock -= script[run.data.next][0];
        undyneSpear(side, 150 * run.data.pace * mult, reverse);
        run.data.next++;
      }
      if (run.data.next >= script.length && state.bullets.length === 0) run.done = true;
    }
  },
  transition: {
    name: 'A single spear',
    duration: 2.6,
    box: { w: 200, h: 140 },
    line: 'Hmph! Let\'s see how you handle THIS!',
    start() {
      // one spear thrown from above: step aside (in the original you dodge by moving down)
      const p = state.player;
      const s = spawn({ kind: 'spear', x: p.x, y: arena.y - 30, vx: 0, vy: 0, hw: 24, hh: 4, angle: Math.PI / 2, warn: 0.6, noCull: true, maxLife: 3 });
      s.update = (b, dt) => {
        if (b.life > b.warn) b.y += 420 * dt;
      };
    },
    update() {}
  },
  pit: {
    name: 'Spears from below',
    duration: 6,
    box: { w: 124, h: 110 },
    update(run) {
      const pace = run.battle ? run.battle.flags.pace : 1;
      // three columns, one stays safe each time; warnings flash first
      every(run, 'rise', 0.95 / pace, () => {
        const cols = 3;
        const w = arena.w / cols;
        const safe = randInt(0, cols - 1);
        for (let i = 0; i < cols; i++) {
          if (i === safe) continue;
          const x = arena.x + i * w + 2;
          spawn({
            kind: 'risingSpear', x: x + w / 2 - 2, y: arena.y + arena.h / 2, hw: w / 2 - 3, hh: arena.h / 2,
            warn: 0.5 / pace, activeFor: 0.35, noCull: true
          });
        }
        sfx.warn();
      }, 0.3);
    }
  },
  volley: {
    name: 'Spear volley',
    duration: 6.5,
    box: { w: 210, h: 150 },
    update(run) {
      const pace = run.battle ? run.battle.flags.pace : 1;
      // spears appear around the board, pause, then fly at where the SOUL was
      every(run, 'spear', 0.32 / pace, () => {
        const c = arenaCenter();
        const angle = Math.random() * Math.PI * 2;
        const x = c.x + Math.cos(angle) * 150;
        const y = c.y + Math.sin(angle) * 120;
        const p = state.player;
        const aim = Math.atan2(p.y - y, p.x - x);
        const speed = 300 * pace;
        spawn({
          kind: 'spear', x, y, hw: 20, hh: 3, angle: aim, warn: 0.45, noCull: true, maxLife: 3, clip: false,
          update(b, dt) {
            if (b.life > b.warn) {
              b.x += Math.cos(b.angle) * speed * dt;
              b.y += Math.sin(b.angle) * speed * dt;
            }
          }
        });
      }, 0.2);
    }
  }
};

BULLET_DRAWERS.risingSpear = b => {
  const top = b.y - b.hh;
  const bottom = b.y + b.hh;
  if (b.life < b.warn) {
    // a warning "!" mark on the floor
    const blink = Math.floor(b.life * 14) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3030' : '#801010';
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', b.x, bottom - 6);
    return;
  }
  // spears rise quickly from the floor
  const k = Math.min(1, (b.life - b.warn) / 0.08);
  const height = (bottom - top) * k;
  for (let x = b.x - b.hw + 6; x <= b.x + b.hw - 6; x += 12) {
    ctx.save();
    ctx.translate(x, bottom - height / 2);
    ctx.rotate(-Math.PI / 2);
    drawSpearShape(0, 0, height, '#4dc3ff');
    ctx.restore();
  }
};

Undyne.attacks = [UNDYNE_ATTACKS.green, UNDYNE_ATTACKS.transition, UNDYNE_ATTACKS.pit, UNDYNE_ATTACKS.volley];
