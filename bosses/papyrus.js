// Papyrus - Undertale, Snowdin.
// Reference: the first attacks are slow bones along the floor with a red SOUL. After the
// player's first FIGHT or SPARE he turns the SOUL BLUE (gravity) for the rest of the fight:
// a cyan-bone "blue attack", then six scripted bone sequences (small/medium/large bones,
// bones dangling from the ceiling, narrow gaps). Then his special attack gets stolen by a dog
// and he uses an "absolutely normal attack" instead (dog, a COOL DUDE sign made of bones,
// a skateboarding bone, bone crowds, one slow bone). Surviving it makes him spare you.
// He never kills you: a lethal hit means you are captured.

const PAPYRUS_SPEED = 165;
const BONE_SMALL = 22;
const BONE_MEDIUM = 42;
const BONE_LARGE = 62;

const Papyrus = registerBoss({
  id: 'papyrus',
  name: 'Papyrus',
  game: 'undertale',
  color: '#ff7a3d',
  emblem: 'bone',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['snowmanPiece', 'monsterCandy', 'cinnaBun', 'cinnaBun'],
  maxHp: 680,
  attack: 4,
  defense: 0,
  checkAttack: 20,
  checkDefense: 20,
  gold: 0,
  box: { w: 254, h: 138 },
  fixedSpeed: true,
  check: 'He likes to say: "Nyeh heh heh!"',
  gameOverText: 'Papyrus captured you! (Try again?)',
  intro: '* Papyrus blocks the way!',

  setup(battle) {
    battle.flags.blue = false;     // has the blue attack started?
    battle.flags.step = 0;         // position in the scripted attack list
    battle.flags.flirted = false;
    battle.flags.insults = 0;
    battle.flags.offersSpare = false;
  },

  acts: [
    {
      name: 'Flirt',
      description: 'Compliment his... bones.',
      use(battle) {
        if (battle.flags.flirted) return '* You flirt again.\n* Papyrus is still recovering from the last one.';
        battle.flags.flirted = true;
        return '* You flirt with Papyrus.\n* "WHAT!? FLIRTING!? SO YOU FINALLY REVEAL YOUR TRUE FEELINGS!"';
      }
    },
    {
      name: 'Insult',
      description: 'Say something mean.',
      use(battle) {
        battle.flags.insults += 1;
        if (battle.flags.insults === 1) return '* You call Papyrus a dork.\n* "HOW DARE YOU! I WAS GOING TO BE NICE!"';
        return '* You insult Papyrus again.\n* He pretends he didn\'t hear that.';
      }
    }
  ],

  getFlavor(battle) {
    if (battle.flags.offersSpare) return '* Papyrus is sparing you.';
    if (battle.flags.blue) return pick(['* Papyrus is thinking about what to wear for his date.', '* Papyrus prepares a bone attack.', '* Papyrus is cackling.', '* Smells like bones.']);
    return '* Papyrus is preparing a bone attack.';
  },

  getDialogue(battle, attack) {
    return attack.line || null;
  },

  onSpare(battle) {
    if (battle.flags.offersSpare) {
      winBattle(battle, 'spared', '* Papyrus spared you!\n* "I, THE GREAT PAPYRUS, WILL BE YOUR FRIEND!"\n* YOU WON! You earned 0 EXP and 0 gold.');
      return true;
    }
    battle.flags.acted = true;
    showResult(battle, '* You spared Papyrus.\n* "WHAT!? YOU WON\'T FIGHT BACK!?"');
    return true;
  },

  onDamaged(battle) {
    battle.flags.acted = true;
  },

  onMiss(battle) {
    battle.flags.acted = true;
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Papyrus fell apart...\n* "WELL, THAT\'S NOT WHAT I EXPECTED..."\n* YOU WON! You earned 200 EXP and 0 gold.';
    return null;
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (f.offersSpare) return PAPYRUS_ATTACKS.waiting;
    // red SOUL warm-up until the player does something
    if (!f.blue && !f.acted) return PAPYRUS_ATTACKS.warmup;
    if (!f.blue) {
      f.blue = true;
      return PAPYRUS_ATTACKS.blueAttack;
    }
    const script = PAPYRUS_ATTACKS.script;
    if (f.step < script.length) return script[f.step++];
    if (f.step === script.length) {
      f.step++;
      return PAPYRUS_ATTACKS.special;
    }
    return PAPYRUS_ATTACKS.jumps;
  },

  onTurnEnd(battle) {
    if (battle.flags.step > PAPYRUS_ATTACKS.script.length && !battle.flags.offersSpare) {
      battle.flags.offersSpare = true;
      battle.mercy = 100;
    }
  },

  attacks: []
});

// Helpers: bones entering from the right edge (or left) at the attack's speed.
function papyrusBone(height, delayDistance = 0, options = {}) {
  const fromLeft = options.fromLeft;
  const x = fromLeft ? arena.x - 12 - delayDistance : arena.x + arena.w + 12 + delayDistance;
  const vx = (fromLeft ? 1 : -1) * (options.speed || PAPYRUS_SPEED);
  const make = options.ceiling ? ceilingBone : floorBone;
  return make(x, height, vx, { color: options.color, maxLife: 14 });
}

// A sequence: [[distance, height, options], ...] - distance in px behind the board edge.
function papyrusSequence(list) {
  for (const [distance, height, options] of list) papyrusBone(height, distance, options || {});
}

const PAPYRUS_ATTACKS = {
  warmup: {
    name: 'Bones along the floor',
    duration: 5,
    line: 'NYEH HEH HEH! BEHOLD MY BONES!',
    update(run) {
      // low bones that stay under a SOUL in the middle; some grow a little
      every(run, 'bone', 0.45, () => {
        const b = floorBone(arena.x + arena.w + 10, rand(18, 34), -120);
        b.grow = rand(-8, 10);
        b.update = (bone, dt) => {
          bone.x += bone.vx * dt;
          const h = Math.max(14, bone.hh * 2 + bone.grow * dt);
          bone.hh = h / 2;
          bone.y = arena.y + arena.h - bone.hh;
        };
      }, 0.2);
    }
  },
  blueAttack: {
    name: 'Blue attack',
    duration: 6.2,
    soul: 'blue',
    line: 'YOU\'RE BLUE NOW. THAT\'S MY ATTACK! NYEH HEH HEH HEH!',
    start() {
      // a wall of cyan bones: don't move and they pass through you
      for (let i = 0; i < 6; i++) papyrusBone(BONE_LARGE + 20, i * 26, { color: 'cyan', speed: 150 });
      papyrusBone(BONE_SMALL, 6 * 26 + 230, { speed: 150 });
    },
    update() {}
  },
  waiting: {
    name: 'Waiting',
    duration: 1,
    soul: 'blue',
    line: 'WELL... IF YOU WON\'T FIGHT, I GUESS I CAN SPARE YOU.',
    update() {}
  },
  jumps: {
    name: 'Bone jumps',
    duration: 6,
    soul: 'blue',
    line: 'I WILL JUST KEEP DOING THIS!',
    update(run) {
      every(run, 'bone', 0.7, () => {
        const h = pick([BONE_SMALL, BONE_SMALL, BONE_MEDIUM, BONE_LARGE]);
        papyrusBone(h, 0, { color: chance(0.15) ? 'cyan' : undefined, ...(chance(0.12) ? { ceiling: true } : {}) });
      }, 0.3);
    }
  },
  script: [
    {
      name: 'Sequence 1',
      duration: 5.5,
      soul: 'blue',
      line: 'I CAN\'T WAIT FOR UNDYNE TO SEE THIS!',
      start() {
        papyrusSequence([[0, BONE_SMALL], [90, BONE_SMALL], [180, BONE_SMALL], [270, BONE_SMALL], [400, BONE_MEDIUM]]);
      },
      update() {}
    },
    {
      name: 'Sequence 2',
      duration: 6,
      soul: 'blue',
      line: 'POPULARITY! RESPECT! PALS!',
      start() {
        papyrusSequence([[0, BONE_SMALL], [140, BONE_MEDIUM], [250, BONE_MEDIUM], [360, BONE_MEDIUM], [500, BONE_LARGE], [620, BONE_LARGE], [740, BONE_LARGE]]);
      },
      update() {}
    },
    {
      name: 'Sequence 3',
      duration: 6.5,
      soul: 'blue',
      line: 'WOWIE! YOU\'RE HANGING IN THERE!',
      start() {
        papyrusSequence([
          [0, BONE_LARGE],
          [150, arenaGapHeight(48), { ceiling: true }],
          [260, BONE_SMALL], [330, BONE_SMALL], [400, BONE_SMALL],
          [520, BONE_MEDIUM],
          [650, arenaGapHeight(40), { ceiling: true }]
        ]);
      },
      update() {}
    },
    {
      name: 'Sequence 4',
      duration: 6,
      soul: 'blue',
      line: 'HOW ABOUT THIS?',
      start() {
        papyrusSequence([[0, BONE_LARGE], [120, BONE_LARGE], [240, BONE_LARGE], [400, BONE_LARGE + 30, { color: 'cyan' }]]);
        papyrusBone(BONE_SMALL, 620, { speed: 300 });
      },
      update() {}
    },
    {
      name: 'Sequence 5',
      duration: 7,
      soul: 'blue',
      line: 'NYEH! THE GREAT PAPYRUS NEVER GIVES UP!',
      start() {
        // two bones with a narrow gap between floor and ceiling: jump into the gap
        const gapTop = arena.h - 70;
        papyrusSequence([
          [0, BONE_SMALL], [0, gapTop - 10, { ceiling: true }],
          [160, BONE_SMALL], [160, gapTop - 10, { ceiling: true }],
          [300, arenaGapHeight(52), { ceiling: true }]
        ]);
        // a "hump" of eight bones
        const hump = [BONE_SMALL, BONE_MEDIUM - 10, BONE_MEDIUM, BONE_LARGE - 10, BONE_LARGE - 10, BONE_MEDIUM, BONE_MEDIUM - 10, BONE_SMALL];
        hump.forEach((h, i) => papyrusBone(h, 470 + i * 14));
      },
      update() {}
    },
    {
      name: 'Sequence 6',
      duration: 7,
      soul: 'blue',
      line: 'I HOPE YOU\'RE READY FOR... MY SPECIAL ATTACK!',
      start() {
        const gap1 = arena.h - 62;
        const gap2 = arena.h - 90;
        papyrusSequence([
          [0, BONE_SMALL + 4], [0, gap1 - 14, { ceiling: true }],
          [150, BONE_MEDIUM + 4], [150, gap2 - 14, { ceiling: true }],
          [300, BONE_LARGE + 30, { color: 'cyan' }],
          [420, BONE_LARGE]
        ]);
        // gapped bones from both sides
        papyrusBone(BONE_SMALL, 160, { fromLeft: true, speed: 140 });
        papyrusBone(BONE_SMALL, 420, { speed: 140 });
      },
      update() {}
    }
  ],
  special: {
    name: 'An absolutely normal attack',
    duration: 15,
    soul: 'blue',
    line: 'BEHOLD...! MY SPECIAL ATTACK! ...WAIT, WHERE IS IT!? FINE! HERE\'S AN ABSOLUTELY NORMAL ATTACK!',
    start(run) {
      // the dog runs across first
      spawn({ kind: 'dog', x: arena.x + arena.w + 20, y: arena.y + arena.h - 12, vx: -140, hw: 13, hh: 9, noCull: true, damage: 3, maxLife: 14 });
      papyrusSequence([[220, BONE_SMALL], [330, BONE_MEDIUM]]);
      run.data.events = [
        [2.4, () => spawnBoneText('COOL DUDE', arena.y + 34, -120)],
        [6.6, () => spawn({ kind: 'skate', x: arena.x + arena.w + 20, y: arena.y + arena.h - 26, vx: -190, hw: 5, hh: 22, noCull: true, damage: 3, maxLife: 10 })],
        [8.2, () => papyrusSequence([[0, BONE_MEDIUM], [20, BONE_LARGE], [40, BONE_MEDIUM]])],
        [9.6, () => papyrusSequence([[0, BONE_MEDIUM], [20, BONE_LARGE], [40, BONE_LARGE], [60, BONE_MEDIUM]])],
        [11.2, () => papyrusSequence([[0, BONE_LARGE], [20, BONE_LARGE], [40, BONE_MEDIUM]])],
        [12.5, () => papyrusBone(BONE_SMALL, 0, { speed: 70 })]
      ];
    },
    update(run) {
      timeline(run, run.data.events);
    }
  }
};

// Height of a ceiling bone that leaves `gap` px free above the floor.
function arenaGapHeight(gap) {
  return arena.h - gap;
}

// "COOL DUDE" spelled in little bone pixels, scrolling across the board.
const BONE_FONT = {
  C: ['111', '100', '100', '100', '111'],
  O: ['111', '101', '101', '101', '111'],
  L: ['100', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '110'],
  U: ['101', '101', '101', '101', '111'],
  E: ['111', '100', '110', '100', '111'],
  ' ': ['000', '000', '000', '000', '000']
};

function spawnBoneText(text, top, vx) {
  const cell = 7;
  let x = arena.x + arena.w + 20;
  for (const ch of text) {
    const glyph = BONE_FONT[ch] || BONE_FONT[' '];
    glyph.forEach((row, ry) => {
      [...row].forEach((on, rx) => {
        if (on === '1') spawn({ kind: 'bone', x: x + rx * cell, y: top + ry * cell, vx, hw: 3, hh: 3, noCull: true, maxLife: 12, damage: 2 });
      });
    });
    x += cell * 4;
  }
}

BULLET_DRAWERS.dog = b => {
  // a small generic white dog
  ctx.fillStyle = '#fff';
  ctx.translate(b.x, b.y);
  fillRoundRect(-12, -6, 22, 12, 5);
  fillCircle(-12, -8, 6);
  ctx.fillRect(-8, 4, 3, 6);
  ctx.fillRect(4, 4, 3, 6);
  ctx.fillRect(10, -6, 6, 3);
  ctx.fillStyle = '#000';
  fillCircle(-14, -9, 1.2);
};

BULLET_DRAWERS.skate = b => {
  ctx.translate(b.x, b.y);
  drawBoneShape(0, -2, 10, 40, '#fff');
  ctx.fillStyle = '#ff6b3d';
  ctx.fillRect(-16, 18, 32, 4);
  ctx.fillStyle = '#fff';
  fillCircle(-10, 24, 3);
  fillCircle(10, 24, 3);
};

Papyrus.attacks = [PAPYRUS_ATTACKS.warmup, PAPYRUS_ATTACKS.blueAttack, ...PAPYRUS_ATTACKS.script, PAPYRUS_ATTACKS.special, PAPYRUS_ATTACKS.jumps];
