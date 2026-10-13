// The Snowdin dogs - Undertale (minibosses): Doggo, Dogamy & Dogaressa, Greater Dog.
// They share one file because they share a lot: cyan attacks you avoid by standing still,
// and the Stick item that ends every dog fight with a game of fetch.

ITEMS.stick = { name: 'Stick', heal: 0, text: '* You threw the stick.' };

// Throwing the Stick: every dog plays fetch and lets you go.
function dogStick(battle, id, text) {
  if (id !== 'stick') return text;
  battle.flags.fetch = true;
  battle.mercy = 100;
  return `${text}\n* ${battle.boss.name} ran to get it!\n* (They want to play. SPARE them.)`;
}

// ---------------------------------------------------------------- Doggo
// Reference: Doggo can only see moving things. His only attack is a cyan sword sweep - stand
// still. Survive an attack without moving, then Pet him and he can be spared.
const Doggo = registerBoss({
  id: 'doggo',
  name: 'Doggo',
  game: 'undertale',
  utBackground: 'grid',
  color: '#8fd3ff',
  emblem: 'sword',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['stick', 'monsterCandy', 'cinnaBun'],
  maxHp: 70,
  attack: 4,
  defense: 0,
  checkAttack: 13,
  checkDefense: 7,
  gold: 0,
  box: { w: 200, h: 130 },
  fixedSpeed: true,
  check: 'Easily excited by movement. Hobbies include: Squirrels.',
  intro: '* Doggo blocks the way!',
  flavor: ['* Doggo is looking for something.', '* Doggo is wagging his tail anxiously.', '* Doggo is sniffing around.'],

  setup(battle) {
    battle.flags.stillTurns = 0;
    battle.flags.petted = false;
  },

  acts: [
    {
      name: 'Pet',
      description: 'Pet him. Works once he knows you\'re there.',
      use(battle) {
        if (battle.flags.stillTurns > 0) {
          battle.flags.petted = true;
          battle.mercy = 100;
          return '* You pet Doggo.\n* "WHAT!? I\'VE BEEN PET! PET BY WHAT!?"\n* Doggo is too excited to fight.';
        }
        return '* You try to pet Doggo, but he can\'t see you!\n* (Survive an attack without moving first.)';
      }
    }
  ],

  onItem: dogStick,

  onPlayerHurt(battle) {
    battle.flags.hitThisTurn = true;
  },

  onTurnEnd(battle) {
    if (!battle.flags.hitThisTurn) battle.flags.stillTurns += 1;
    battle.flags.hitThisTurn = false;
  },

  getDialogue() {
    return pick(['Did something move? Was it my imagination?', 'If something moves... I\'ll slice it!', 'I can only see moving things.']);
  },

  victoryText(battle, outcome) {
    if (outcome === 'spared') return '* Doggo went off to tell everyone he got pet.\n* YOU WON! You earned 0 EXP and 30 gold.';
    return null;
  },

  attacks: [
    {
      name: 'Cyan sword',
      duration: 5.5,
      update(run) {
        every(run, 'sweep', 0.9, () => {
          const fromLeft = chance(0.5);
          spawn({ kind: 'sweep', x: arena.x + arena.w / 2, y: arena.y + arena.h / 2, hw: arena.w / 2, hh: arena.h / 2, color: 'cyan', activeFor: 0.22, noCull: true, fromLeft, damage: 4 });
          // a rare stray Snowdrake-style arc
          if (chance(0.05)) spawn({ kind: 'normal', x: arena.x, y: arena.y + arena.h, vx: 140, vy: -220, ay: 300, r: 5, maxLife: 3, noCull: true });
        }, 0.4);
      }
    }
  ]
});

// ---------------------------------------------------------------- Dogamy & Dogaressa
// Reference: two axes rise and swing down in opposite directions, making a heart; Dogamy
// barks a ring of hearts, half of them cyan. Roll Around, Re-sniff, then Pet to spare them.
const DogamyDogaressa = registerBoss({
  id: 'dogamy_dogaressa',
  name: 'Dogamy & Dogaressa',
  shortName: 'Dogamy & Dogaressa',
  game: 'undertale',
  utBackground: 'grid',
  color: '#c8a2ff',
  emblem: 'heart',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['stick', 'monsterCandy', 'cinnaBun', 'cinnaBun'],
  maxHp: 216,
  attack: 4,
  defense: 0,
  checkAttack: 14,
  checkDefense: 5,
  gold: 0,
  box: { w: 200, h: 140 },
  fixedSpeed: true,
  check: 'A married couple of hooded guard dogs. They smell everything as one.',
  intro: '* Dogi assault you!',
  flavor: ['* The dogs are sniffing you.', '* Dogamy and Dogaressa whisper to each other.', '* Smells like dog.'],

  setup(battle) {
    battle.flags.step = 0; // 0 -> rolled -> resniffed -> petted
  },

  acts: [
    {
      name: 'Roll Around',
      description: 'Roll in the dirt to smell like a dog.',
      use(battle) {
        if (battle.flags.step === 0) battle.flags.step = 1;
        return '* You roll around in the dirt.\n* You smell like a weird puppy now.';
      }
    },
    {
      name: 'Re-sniff',
      description: 'Let them sniff you again.',
      use(battle) {
        if (battle.flags.step === 1) {
          battle.flags.step = 2;
          return '* The dogs sniff you again...\n* "...You\'re a weird little puppy!"';
        }
        return '* The dogs sniff you.\n* "Smells like a human!"';
      }
    },
    {
      name: 'Pet',
      description: 'Pet the dogs.',
      use(battle) {
        if (battle.flags.step === 2) {
          battle.flags.step = 3;
          battle.mercy = 100;
          return '* You pet both dogs.\n* "Dogs can pet other dogs!?" They\'re overjoyed!';
        }
        return '* You try to pet the dogs...\n* "Don\'t touch us, human!"';
      }
    }
  ],

  onItem: dogStick,

  getDialogue() {
    return pick(['What\'s that smell?', 'Where\'s that smell?', 'If you\'re actually a smelly pup...', 'You must be a human!']);
  },

  victoryText(battle, outcome) {
    if (outcome === 'spared') return '* The dogs ran off to roll in the snow together.\n* YOU WON! You earned 0 EXP and 50 gold.';
    return null;
  },

  attacks: [
    {
      name: 'Axes',
      duration: 6,
      update(run) {
        every(run, 'axes', 1.6, () => {
          // two axes rise up, then swing down in opposite arcs that meet like a heart
          for (const side of [-1, 1]) {
            const c = arenaCenter();
            spawn({
              kind: 'scythe', x: c.x + side * 50, y: arena.y + arena.h + 20, r: 12, noCull: true, maxLife: 2, color: '#e0e0e0',
              update(b, dt) {
                const t = b.life;
                if (t < 0.5) b.y -= 260 * dt;
                else {
                  const a = (t - 0.5) * 3.2;
                  b.x = c.x + side * (50 - Math.sin(a) * 60);
                  b.y = arena.y + 10 + Math.sin(a * 0.9) * (arena.h - 20);
                }
                b.angle = (b.angle || 0) + dt * 8 * side;
              }
            });
          }
        }, 0.2);
      }
    },
    {
      name: 'Barking hearts',
      duration: 6,
      update(run) {
        every(run, 'hearts', 1.1, () => {
          // a ring of eight hearts flies across - the cyan ones only hurt if you move
          const y = rand(arena.y + 30, arena.y + arena.h - 30);
          const off = Math.random();
          for (let i = 0; i < 8; i++) {
            const a = off + (Math.PI * 2 * i) / 8;
            spawn({ kind: 'suit', suit: 'heart', x: arena.x - 30 + Math.cos(a) * 26, y: y + Math.sin(a) * 26, vx: 130, r: 6, faceVelocity: false, color: i % 2 ? 'cyan' : '#ffffff', minLife: 1, maxLife: 4 });
          }
        }, 0.2);
      }
    }
  ]
});

// ---------------------------------------------------------------- Greater Dog
// Reference: a spear that flickers between cyan and white flies across; a small dog at the
// bottom sleeps until you move, then barks. Beckon (or Ignore), Pet, Play, then Pet twice to
// spare it. Ignore it four times and it gets bored and leaves.
const GreaterDog = registerBoss({
  id: 'greater_dog',
  name: 'Greater Dog',
  game: 'undertale',
  utBackground: 'grid',
  color: '#ffffff',
  emblem: 'spear',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['stick', 'monsterCandy', 'cinnaBun'],
  maxHp: 105,
  attack: 4,
  defense: 0,
  checkAttack: 15,
  checkDefense: 8,
  gold: 0,
  box: { w: 220, h: 140 },
  fixedSpeed: true,
  check: 'It\'s so excited that it thinks fighting is just play.',
  intro: '* It\'s the Greater Dog.',
  flavor: ['* Greater Dog is panting excitedly.', '* Greater Dog is wagging.', '* Greater Dog\'s armor is clanking.'],

  setup(battle) {
    battle.flags.progress = [];
    battle.flags.ignores = 0;
  },

  acts: ['Beckon', 'Pet', 'Play', 'Ignore'].map(name => ({
    name,
    description: {
      Beckon: 'Call the dog over.',
      Pet: 'Pet the dog.',
      Play: 'Play with the dog.',
      Ignore: 'Ignore the dog.'
    }[name],
    use(battle) {
      const f = battle.flags;
      if (name === 'Ignore') {
        f.ignores += 1;
        if (f.progress.length === 0) f.progress.push('beckon');
        if (f.ignores >= 4) {
          winBattle(battle, 'survived', '* Greater Dog got bored and went away.\n* YOU WON! You earned 0 EXP and 40 gold.');
          return '';
        }
        return '* You ignore Greater Dog.\n* It inches closer...';
      }
      const want = ['beckon', 'pet', 'play', 'pet', 'pet'];
      const next = want[f.progress.length];
      if (name.toLowerCase() === next) {
        f.progress.push(next);
        if (f.progress.length >= want.length) {
          battle.mercy = 100;
          return '* You pet the dog one last time.\n* Greater Dog is contented.';
        }
        return {
          beckon: '* You call Greater Dog. It bounds towards you!',
          pet: '* You pet Greater Dog. It\'s very happy!',
          play: '* You throw a snowball. Greater Dog brings it back, tired.'
        }[next];
      }
      return `* You try to ${name.toLowerCase()} Greater Dog...\n* It\'s not ready for that yet.`;
    }
  })),

  onItem: dogStick,

  getDialogue() {
    return pick(['Bark!', 'Pant pant', '(Excited panting)', 'Woof!']);
  },

  victoryText(battle, outcome) {
    if (outcome === 'spared') return '* Greater Dog is contented.\n* YOU WON! You earned 0 EXP and 40 gold.';
    return null;
  },

  attacks: [
    {
      name: 'Flickering spear',
      duration: 5.5,
      update(run) {
        every(run, 'spear', 1.0, () => {
          const y = rand(arena.y + 15, arena.y + arena.h - 15);
          spawn({
            kind: 'spear', x: arena.x + arena.w + 30, y, vx: -150, hw: 28, hh: 4, angle: Math.PI, minLife: 1, maxLife: 4,
            update(b, dt) {
              b.x += b.vx * dt;
              // flickers between cyan (stand still) and white (move)
              b.color = Math.floor(b.life * 2.5) % 2 === 0 ? 'cyan' : '#ffffff';
            }
          });
        }, 0.3);
      }
    },
    {
      name: 'Little dog',
      duration: 5.5,
      start(run) {
        run.data.dog = spawn({ kind: 'dog', x: arena.x + arena.w / 2, y: arena.y + arena.h - 10, hw: 13, hh: 9, harmless: true, noCull: true });
      },
      update(run) {
        // it sleeps until you move, then barks at the SOUL
        if (state.player.moving) {
          every(run, 'bark', 0.35, () => {
            const d = run.data.dog;
            const v = aimAt(d.x, d.y - 10, 170);
            spawn({ kind: 'normal', x: d.x, y: d.y - 10, vx: v.vx, vy: v.vy, r: 5, maxLife: 3 });
          }, 0);
        }
      }
    }
  ]
});
