// Undertale minibosses: Shyren, Royal Guards, Glad Dummy, Mettaton NEO, So Sorry, Glyde.

// ---------------------------------------------------------------- Shyren
// Reference: a shy fish who fires music notes from her head. Hum along: each Hum makes her
// notes faster and more numerous - after one Hum she can be spared, after five she's spared.
const Shyren = registerBoss({
  id: 'shyren',
  name: 'Shyren',
  game: 'undertale',
  color: '#8fe3c8',
  emblem: 'note',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  maxHp: 66,
  attack: 3,
  defense: 0,
  checkAttack: 19,
  checkDefense: 0,
  gold: 0,
  box: { w: 220, h: 140 },
  fixedSpeed: true,
  check: 'A teenage siren. Too shy to sing.',
  intro: '* Shyren hums in the corner.',
  flavor: ['* Shyren is humming softly.', '* Shyren is hiding her face.', '* Smells like... sheet music?'],

  setup(battle) {
    battle.flags.hums = 0;
  },

  acts: [
    {
      name: 'Hum',
      description: 'Hum along with her.',
      use(battle) {
        battle.flags.hums += 1;
        battle.mercy = 100;
        if (battle.flags.hums >= 5) {
          winBattle(battle, 'spared', '* Shyren sang her heart out and left, smiling.\n* YOU WON! You earned 0 EXP and 30 gold.');
          return '';
        }
        return `* You hum along with Shyren.\n* She's starting to sing! (${battle.flags.hums}/5)`;
      }
    },
    { name: 'Smile', description: 'Smile at her.', text: '* You smile at Shyren.\n* She smiles back, a little.' },
    {
      name: 'Conduct',
      description: 'Conduct her song.',
      use() {
        return '* You wave your arms like a conductor.\n* Shyren hums a little louder.';
      }
    }
  ],

  getDialogue(battle) {
    return ['(hum...)', '(Shyren is humming.)', '(La la la...)'][battle.turn % 3];
  },

  attacks: [
    {
      name: 'Music notes',
      duration: 5.5,
      update(run) {
        const hums = run.battle ? run.battle.flags.hums : run.level;
        every(run, 'note', Math.max(0.18, 0.55 - hums * 0.07), () => {
          const y = rand(arena.y + 10, arena.y + arena.h - 10);
          spawn({ kind: 'note', x: arena.x + arena.w + 10, y, vx: -(110 + hums * 25), r: 6, minLife: 1, maxLife: 4, baseY: y,
            update(b, dt) { b.x += b.vx * dt; b.y = b.baseY + Math.sin(b.life * 5) * 12; } });
        }, 0.2);
      }
    }
  ]
});

BULLET_DRAWERS.note = (b, fill) => {
  ctx.fillStyle = fill;
  fillCircle(b.x - 2, b.y + 3, 4);
  ctx.fillRect(b.x + 1, b.y - 9, 2, 12);
  ctx.fillRect(b.x + 1, b.y - 9, 6, 2);
};

// ---------------------------------------------------------------- Royal Guards
// Reference: RG 01 and RG 02 attack as a team - things dropping from the top and star bullets
// moving up and down from both edges. Clean RG 02's armor (five times) until it comes off,
// then Whisper to RG 01 so he can be honest about his feelings. Then they can be spared.
const RoyalGuards = registerBoss({
  id: 'royal_guards',
  name: 'Royal Guards',
  game: 'undertale',
  color: '#c8c8c8',
  emblem: 'sword',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 60 },
  items: ['snowmanPiece', 'glamburger', 'cinnaBun'],
  maxHp: 300,
  attack: 5,
  defense: 0,
  checkAttack: 30,
  checkDefense: 20,
  gold: 0,
  box: { w: 220, h: 150 },
  fixedSpeed: true,
  check: 'Two guards in armor. They have something to say to each other.',
  intro: '* The Royal Guard attacks!',
  flavor: ['* The guards are in formation.', '* RG 02\'s armor is getting hot.', '* RG 01 glances at RG 02.'],

  setup(battle) {
    battle.flags.cleans = 0;
    battle.flags.whispered = false;
  },

  acts: [
    {
      name: 'Clean Armor',
      description: 'Clean RG 02\'s armor.',
      use(battle) {
        const f = battle.flags;
        f.cleans += 1;
        if (f.cleans >= 5) return '* You polished RG 02\'s armor...\n* It got too hot! RG 02 took the armor off!';
        return `* You clean RG 02's armor. (${f.cleans}/5)\n* It's getting hot in there...`;
      }
    },
    {
      name: 'Whisper',
      description: 'Whisper to RG 01.',
      use(battle) {
        const f = battle.flags;
        if (f.cleans >= 5) {
          f.whispered = true;
          battle.mercy = 100;
          return '* You told RG 01 to be honest with his feelings.\n* "02... I... I like you, bro."\n* The guards don\'t want to fight anymore.';
        }
        return '* You whisper to RG 01...\n* He can\'t think straight with 02\'s armor on.';
      }
    }
  ],

  getDialogue() {
    return pick(['We\'re the Royal Guard!', '...Bro?', 'For Undyne!', 'You\'re going down, human!']);
  },

  attacks: [
    {
      name: 'Team attack',
      duration: 6,
      update(run) {
        const armorOff = run.battle && run.battle.flags.cleans >= 5;
        every(run, 'drop', 0.4, () => {
          const x = rand(arena.x + 10, arena.x + arena.w - 10);
          spawn({ kind: 'normal', x, y: arena.y - 10, vx: armorOff ? rand(-60, 60) : 0, vy: 150, r: 6, maxLife: 3, minLife: 0.5 });
        }, 0.2);
        every(run, 'star', 0.7, () => {
          const bottom = chance(0.5);
          spawn({ kind: 'star', x: rand(arena.x + 10, arena.x + arena.w - 10), y: bottom ? arena.y + arena.h + 10 : arena.y - 10, vy: bottom ? -140 : 140, r: 6, maxLife: 3, minLife: 0.5, color: '#ffffff' });
        }, 0.5);
      }
    }
  ]
});

// ---------------------------------------------------------------- Glad Dummy
// Reference: on the Genocide route the dummy is finally happy... and lets you go right away.
// Physical attacks work on it now.
registerBoss({
  id: 'glad_dummy',
  name: 'Glad Dummy',
  game: 'undertale',
  color: '#d9b77e',
  emblem: 'dummy',
  player: { name: 'CHARA', lv: 9, maxHp: 48, power: 200 },
  maxHp: 200,
  attack: 1,
  defense: 0,
  gold: 0,
  box: { w: 180, h: 120 },
  check: 'Its dreams have come true.',
  intro: '* Glad Dummy appears.',
  flavor: ['* Glad Dummy is too happy to fight.'],
  dialogue: ['Finally... I\'m corporeal...!'],
  setup(battle) {
    battle.mercy = 100;
  },
  draw(x, y, t) {
    ctx.save();
    ctx.translate(0, Math.sin(t * 3) * 3);
    TrainingDummy.draw(x, y, t);
    ctx.restore();
  },
  attacks: [
    {
      name: 'Nothing',
      quiet: true,
      duration: 1,
      update() {}
    }
  ]
});

// ---------------------------------------------------------------- Mettaton NEO
// Reference: on the Genocide route Mettaton's big final form goes down to a single attack.
registerBoss({
  id: 'mettaton_neo',
  name: 'Mettaton NEO',
  game: 'undertale',
  color: '#ff6be2',
  emblem: 'bolt',
  player: { name: 'CHARA', lv: 15, maxHp: 72, power: 99999 },
  maxHp: 30000,
  attack: 1,
  defense: 0,
  checkAttack: 90,
  checkDefense: 9,
  gold: 0,
  box: { w: 180, h: 120 },
  check: 'Dr. Alphys\'s greatest invention.',
  intro: '* Mettaton NEO blocks the way!',
  flavor: ['* Mettaton NEO is posing dramatically.', '* Mettaton NEO\'s wings flutter.'],
  dialogue: ['Darling, I\'m going to stop you.', 'Humanity... monsters... I won\'t let you hurt them!'],
  victoryText() {
    return '* Mettaton NEO fell in a single hit.\n* "Ha... ha... Alphys... will... make you..."\n* YOU WON.';
  },
  attacks: [
    {
      name: 'Nothing',
      quiet: true,
      duration: 1,
      update() {}
    }
  ]
});

// ---------------------------------------------------------------- So Sorry
// Reference: a nervous artist. He swings his tail (cyan and orange), throws lots of
// crumpled paper and draws Doodlebogs that throw doodles in circles. He can't be spared -
// the fight ends after 10 turns without attacking him, or after 11 hits (each does 100).
const SoSorry = registerBoss({
  id: 'so_sorry',
  name: 'So Sorry',
  game: 'undertale',
  color: '#c8a2ff',
  emblem: 'note',
  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['glamburger', 'faceSteak', 'cinnaBun'],
  maxHp: 1100,
  attack: 5,
  defense: 0,
  checkAttack: 9,
  checkDefense: -6,
  gold: 0,
  box: { w: 220, h: 150 },
  fixedSpeed: true,
  check: 'Takes the drawing class at 10 PM every Thursday. He\'s sorry.',
  intro: '* So Sorry bursts out apologizing!',
  flavor: ['* So Sorry is looking for his pencil.', '* So Sorry is sketching furiously.', '* Crumpled paper everywhere.'],

  setup(battle) {
    battle.flags.calm = 0;
    battle.flags.hits = 0;
  },

  acts: [{ name: 'Something', description: 'Do... something.', text: '* You did something.\n* So Sorry apologizes for some reason.' }],

  onDamaged(battle) {
    battle.flags.hits += 1;
    battle.flags.attacked = true;
    battle.bossHp = Math.max(0, this.maxHp - battle.flags.hits * 100);
  },

  onTurnEnd(battle) {
    if (!battle.flags.attacked) battle.flags.calm += 1;
    battle.flags.attacked = false;
    if (battle.flags.calm >= 10 && !battle.outcome) {
      winBattle(battle, 'survived', '* So Sorry finished his drawing and ran off, apologizing.\n* YOU WON!');
    }
  },

  getDialogue() {
    return pick(['S-sorry!', 'I\'m so sorry!', 'Oh no, oh no, sorry!', 'Please don\'t look at my drawing!']);
  },

  chooseAttack(battle) {
    if (battle.flags.calm >= 8) return SO_SORRY_ATTACKS[3];
    return SO_SORRY_ATTACKS[battle.turn % 3];
  },

  attacks: []
});

const SO_SORRY_ATTACKS = [
  {
    name: 'Tail swing', duration: 5.5,
    update(run) {
      every(run, 'tail', 1.0, () => {
        const color = chance(0.5) ? 'cyan' : 'orange';
        spawn({ kind: 'sweep', x: arena.x + arena.w / 2, y: arena.y + arena.h / 2, hw: arena.w / 2, hh: arena.h / 2, color, activeFor: 0.22, noCull: true, fromLeft: chance(0.5) });
      }, 0.5);
    }
  },
  {
    name: 'Crumpled paper', duration: 5.5,
    update(run) {
      every(run, 'paper', 0.14, () => {
        spawn({ kind: 'paper', x: rand(arena.x, arena.x + arena.w), y: arena.y - 10, vx: rand(-40, 40), vy: rand(120, 190), r: 6, hw: 6, hh: 6, maxLife: 3, spin: 4, angle: 0 });
      }, 0.1);
    }
  },
  {
    name: 'Doodlebogs', duration: 6,
    start(run) {
      run.data.bogs = [0, 1].map(i => spawn({ kind: 'normal', x: arena.x + 50 + i * 120, y: arena.y + 40, r: 10, harmless: true, noCull: true, color: '#c8a2ff' }));
    },
    update(run) {
      every(run, 'doodle', 1.2, () => {
        for (const bog of run.data.bogs) spawnRing(bog.x, bog.y, 8, 100, 4, 'normal', run.t, { maxLife: 3, color: '#ffffff' });
      }, 0.4);
    }
  },
  {
    name: 'Tail and paper', duration: 6,
    update(run) {
      SO_SORRY_ATTACKS[0].update(run);
      SO_SORRY_ATTACKS[1].update(run);
    }
  }
];
SoSorry.attacks = SO_SORRY_ATTACKS;

// ---------------------------------------------------------------- Glyde
// Reference: waves of star bullets, and bigger stars that explode into words like "COOL".
// Applaud twice, then do Nothing three times (or Nothing twice and Boo) - Glyde leaves to look
// for praise elsewhere.
const Glyde = registerBoss({
  id: 'glyde',
  name: 'Glyde',
  game: 'undertale',
  color: '#7fd4ff',
  emblem: 'star',
  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  maxHp: 220,
  attack: 4,
  defense: 0,
  checkAttack: 'HIGH',
  checkDefense: 'HIGH',
  gold: 0,
  box: { w: 220, h: 150 },
  fixedSpeed: true,
  check: 'A secret boss. Very cool. Too cool, maybe.',
  intro: '* Glyde swoops in! Wow! Glyde!',
  flavor: ['* Glyde is posing.', '* Glyde is looking at you, expecting praise.', '* Smells like hair gel.'],

  setup(battle) {
    battle.flags.applause = 0;
    battle.flags.nothing = 0;
  },

  acts: [
    {
      name: 'Applaud',
      description: 'Clap for Glyde.',
      use(battle) {
        battle.flags.applause += 1;
        return '* You applaud Glyde.\n* Glyde is basking in it.';
      }
    },
    {
      name: 'Nothing',
      description: 'Do nothing.',
      use(battle) {
        const f = battle.flags;
        if (f.applause >= 2) f.nothing += 1;
        if (f.applause >= 2 && f.nothing >= 3) return glydeLeaves(battle);
        return '* You do nothing.\n* Glyde waits for applause...';
      }
    },
    {
      name: 'Boo',
      description: 'Boo Glyde.',
      use(battle) {
        const f = battle.flags;
        if (f.applause >= 2 && f.nothing >= 2) return glydeLeaves(battle);
        return '* You boo Glyde.\n* Glyde is fuming! Its ATTACK went up!';
      }
    }
  ],

  getDialogue() {
    return pick(['Wow, check out Glyde!', 'I\'m the coolest!', 'Glyde is the best!', 'Applaud me!']);
  },

  attacks: [
    {
      name: 'Star waves', duration: 6,
      update(run) {
        every(run, 'wave', 0.7, () => {
          const y = rand(arena.y + 15, arena.y + arena.h - 15);
          for (let i = 0; i < 4; i++) spawn({ kind: 'star', x: arena.x + arena.w + 10 + i * 18, y: y + (i % 2 ? 10 : -10), vx: -170, r: 5, maxLife: 4, minLife: 1, color: '#ffffff' });
        }, 0.2);
        every(run, 'big', 1.6, () => {
          const p = pickPointAwayFromPlayer(70, 20);
          spawn({
            kind: 'star', x: p.x, y: p.y, r: 10, warn: 0.6, activeFor: 0, maxLife: 0.62, noCull: true, color: '#ffe14d',
            update(b) {
              if (b.life >= 0.6 && !b.burst) {
                b.burst = true;
                addPopup(pick(['COOL', 'RAD', 'SICK']), b.x, b.y, '#ffe14d');
                spawnRing(b.x, b.y, 8, 130, 4, 'star', 0, { maxLife: 3, color: '#ffe14d' });
              }
            }
          });
        }, 0.8);
      }
    }
  ]
});

function glydeLeaves(battle) {
  winBattle(battle, 'spared', '* Glyde got bored of you and left to look for praise elsewhere.\n* YOU WON!');
  return '';
}
