// Muffet - Undertale, Hotland.
// Reference: on her first turn the SOUL turns PURPLE and gets stuck on three spider strings.
// Spiders walk along the strings, croissants fly out and come back like boomerangs, donuts
// bounce diagonally off the edges. Three times ("breakfast", "lunch", "dinner") her pet
// waits under the board: the strings scroll down into its mouth while spiders keep coming,
// so you have to keep hopping upwards. Pay her to weaken her (prices rise; Struggle three times
// halves them). She lets you go after enough turns - or right away if you eat a Spider Donut.
// (The original offers mercy after 17 turns; here after 12, with the pet on turns 4, 8, 11.)

const MUFFET_SPARE_TURN = 12;
const MUFFET_PET_TURNS = [4, 8, 11];

const Muffet = registerBoss({
  id: 'muffet',
  name: 'Muffet',
  game: 'undertale',
  color: '#c44dff',
  emblem: 'web',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 120 },
  items: ['spiderDonut', 'faceSteak', 'glamburger', 'glamburger', 'cinnaBun'],
  maxHp: 1250,
  attack: 6,
  defense: 0,
  checkAttack: 38,
  checkDefense: 18,
  gold: 0,
  box: { w: 240, h: 136 },
  fixedSpeed: true,
  check: 'If you\'re looking for a deal... she\'s not the one to ask.',
  intro: '* Muffet traps you!',
  flavor: [
    '* Muffet pours you a cup of spiders.',
    '* Muffet is counting her money.',
    '* The spiders are clapping.',
    '* Smells like a bakesale.',
    '* Muffet\'s pet is hungry.'
  ],

  setup(battle) {
    battle.flags.gold = 600;
    battle.flags.price = 200;
    battle.flags.struggles = 0;
    battle.flags.weaker = 0;
    battle.flags.offersSpare = false;
  },

  acts: [
    {
      name: 'Pay',
      description: 'Pay her. She hits a little softer.',
      use(battle) {
        const f = battle.flags;
        if (f.gold < f.price) {
          f.price = Math.max(1, f.gold);
          return `* You don't have enough G...\n* "Fine, dearie. ${f.price}G will do."`;
        }
        f.gold -= f.price;
        f.weaker += 1;
        const paid = f.price;
        f.price *= 2;
        return `* You paid ${paid}G. Muffet's ATTACK dropped!\n* (You have ${f.gold}G left.)`;
      }
    },
    {
      name: 'Struggle',
      description: 'Struggle in the web.',
      use(battle) {
        const f = battle.flags;
        f.struggles += 1;
        if (f.struggles === 3) {
          f.price = Math.max(1, Math.floor(f.price / 2));
          return '* You struggle with all your might!\n* Muffet takes pity on you. Her price was halved!';
        }
        return '* You struggle to escape the web...\n* ...but nothing happened.';
      }
    }
  ],

  onItem(battle, id, text) {
    if (id === 'spiderDonut') {
      battle.flags.offersSpare = true;
      battle.mercy = 100;
      return `${text}\n* Muffet got a telegram from the spiders...`;
    }
    return text;
  },

  onSpare(battle) {
    if (battle.flags.offersSpare) {
      winBattle(battle, 'spared', '* Muffet let you go.\n* "Sorry for all the trouble, dearie~"\n* YOU WON! You earned 0 EXP and 100 gold.');
      return true;
    }
    return false;
  },

  getFlavor(battle) {
    if (battle.flags.offersSpare) return '* Muffet is sparing you.';
    if (MUFFET_PET_TURNS.includes(battle.turn)) return '* Muffet\'s pet is hungry. It\'s time for a meal.';
    return null;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick([
      'Ahuhuhuhu~ Don\'t look so blue, dearie!',
      'Why so pale? You should be proud!',
      'The spiders told me all about you~',
      'Did you know spiders are great bakers?',
      'Every penny counts for the spiders~'
    ]);
  },

  chooseAttack(battle) {
    const turn = battle.turn;
    if (battle.flags.offersSpare) return MUFFET_ATTACKS.rest;
    if (MUFFET_PET_TURNS.includes(turn)) {
      const meal = ['breakfast', 'lunch', 'dinner'][MUFFET_PET_TURNS.indexOf(turn)];
      return { ...MUFFET_ATTACKS.pet, line: `It's time for my pet's ${meal}~ Ahuhuhu!`, meal: MUFFET_PET_TURNS.indexOf(turn) };
    }
    const order = ['spiders', 'croissants', 'spiderPairs', 'donuts', 'spiders2', 'mixed'];
    return MUFFET_ATTACKS[order[turn % order.length]];
  },

  onTurnEnd(battle) {
    if (battle.turn >= MUFFET_SPARE_TURN && !battle.flags.offersSpare) {
      battle.flags.offersSpare = true;
      battle.mercy = 100;
    }
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Muffet was defeated.\n* The spiders scatter...\n* YOU WON! You earned 300 EXP and 0 gold.';
    return null;
  },

  attacks: []
});

ITEMS.spiderDonut = { name: 'SpidrDont', heal: 12, text: '* You ate the Spider Donut.\n* Made with Spider Cider in the batter.' };

function muffetDamage() {
  const battle = state.battle;
  return Math.max(1, 6 - (battle ? battle.flags.weaker : 0));
}

// A spider walking along a string.
function muffetSpider(lane, fromLeft, speed) {
  const y = laneY(lane);
  return spawn({
    kind: 'spider', x: fromLeft ? arena.x - 12 : arena.x + arena.w + 12, y, vx: (fromLeft ? 1 : -1) * speed, r: 6,
    lane, damage: muffetDamage(), minLife: 1, maxLife: 6, clip: false,
    update(b, dt) {
      b.x += b.vx * dt;
      b.y = laneY(b.lane);
    }
  });
}

function muffetCroissant(lane) {
  // flies out from the right, slows down past the middle and comes back
  const speed = 330;
  const reach = arena.w * 0.85;
  return spawn({
    kind: 'croissant', x: arena.x + arena.w + 12, y: laneY(lane), vx: -speed, ax: (speed * speed) / (2 * reach), r: 8,
    lane, damage: muffetDamage(), noCull: true, maxLife: 4, clip: false,
    update(b, dt) {
      b.vx += b.ax * dt;
      b.x += b.vx * dt;
      b.y = laneY(b.lane);
      b.angle = (b.angle || 0) + dt * 10;
    }
  });
}

function muffetDonut() {
  const fromLeft = chance(0.5);
  return spawn({
    kind: 'donut', x: fromLeft ? arena.x + 10 : arena.x + arena.w - 10, y: arena.y + 10,
    vx: (fromLeft ? 1 : -1) * rand(110, 150), vy: rand(80, 120), r: 8, damage: muffetDamage(), maxLife: 5, noCull: true,
    update: bounceInArena
  });
}

const MUFFET_ATTACKS = {
  spiders: {
    name: 'Spiders',
    duration: 6,
    soul: 'purple',
    update(run) {
      every(run, 'spider', 0.55, () => muffetSpider(randInt(0, 2), chance(0.5), 140), 0.2);
    }
  },
  // groups of spiders walking in from both sides at once, mirrored (from the fight)
  spiderPairs: {
    name: 'Spider parade',
    duration: 6.5,
    soul: 'purple',
    update(run) {
      every(run, 'group', 1.1, () => {
        const free = randInt(0, 2);
        const lanes = [0, 1, 2].filter(l => l !== free);
        const fromLeft = chance(0.5);
        for (const lane of lanes) {
          muffetSpider(lane, fromLeft, 115);
          // a second one right behind it
          const b = muffetSpider(lane, fromLeft, 115);
          b.x += fromLeft ? -22 : 22;
        }
      }, 0.2);
    }
  },
  spiders2: {
    name: 'Spider swarm',
    duration: 6.5,
    soul: 'purple',
    update(run) {
      every(run, 'spider', 0.38, () => {
        const lane = randInt(0, 2);
        muffetSpider(lane, chance(0.5), 170);
      }, 0.2);
    }
  },
  croissants: {
    name: 'Croissants',
    duration: 6.5,
    soul: 'purple',
    update(run) {
      every(run, 'croissant', 0.9, () => muffetCroissant(randInt(0, 2)), 0.2);
      every(run, 'spider', 1.4, () => muffetSpider(randInt(0, 2), true, 120), 0.8);
    }
  },
  donuts: {
    name: 'Donuts',
    duration: 6,
    soul: 'purple',
    update(run) {
      every(run, 'donut', 0.85, muffetDonut, 0.2);
    }
  },
  mixed: {
    name: 'Bakesale',
    duration: 7,
    soul: 'purple',
    update(run) {
      every(run, 'spider', 0.6, () => muffetSpider(randInt(0, 2), chance(0.5), 150), 0.2);
      every(run, 'croissant', 1.6, () => muffetCroissant(randInt(0, 2)), 0.8);
      every(run, 'donut', 2.0, muffetDonut, 1.2);
    }
  },
  pet: {
    name: 'Pet attack',
    duration: 9,
    soul: 'purple',
    // the board stretches up tall and the pet waits at the bottom
    box: { w: 210, h: 290 },
    start(run) {
      const p = state.player;
      const spacing = 42;
      p.laneList = [];
      for (let y = arena.y + 20; y < arena.y + arena.h; y += spacing) p.laneList.push(y);
      p.lane = 0;
      p.y = p.laneList[0];
      run.data.spacing = spacing;
      run.data.speed = 34 + (run.attack.meal || 0) * 8;
      // the pet's mouth under the board
      run.data.mouth = spawn({ kind: 'pet', x: arena.x + arena.w / 2, y: arena.y + arena.h - 7, hw: arena.w / 2, hh: 7, damage: 4, noCull: true, noFx: true });
    },
    update(run, dt) {
      const p = state.player;
      const list = p.laneList;
      for (let i = 0; i < list.length; i++) list[i] += run.data.speed * dt;
      // the lowest string reaches the mouth: it disappears and a new one appears on top
      // (a SOUL still sitting on it gets bitten by the mouth on the way down)
      if (list[list.length - 1] > arena.y + arena.h - 6) {
        list.pop();
        list.unshift(list[0] - run.data.spacing);
        p.lane = Math.min(list.length - 1, p.lane + 1);
        for (const b of state.bullets) if (b.lane !== undefined) b.lane = Math.min(list.length - 1, b.lane + 1);
      }
      every(run, 'spider', 0.8, () => {
        const visible = list.map((y, i) => ({ y, i })).filter(l => l.y > arena.y + 4);
        const lane = pick(visible).i;
        muffetSpider(lane, chance(0.5), 110);
      }, 0.5);
    },
    end() {
      state.player.laneList = null;
    }
  },
  rest: {
    name: 'Tea break',
    quiet: true,
    duration: 1,
    soul: 'purple',
    update() {}
  }
};

BULLET_DRAWERS.spider = b => {
  ctx.fillStyle = '#e8b0ff';
  fillCircle(b.x, b.y, 5);
  ctx.strokeStyle = '#e8b0ff';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + side * 9, b.y + i * 5 - 3);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#000';
  fillCircle(b.x - 2, b.y - 1, 1);
  fillCircle(b.x + 2, b.y - 1, 1);
};

BULLET_DRAWERS.croissant = b => {
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle || 0);
  ctx.strokeStyle = '#e8b0ff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0.3, Math.PI - 0.3);
  ctx.stroke();
};

BULLET_DRAWERS.donut = b => {
  ctx.strokeStyle = '#e8b0ff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
  ctx.stroke();
};

BULLET_DRAWERS.pet = b => {
  // the pet (a giant cupcake) rising out of the bottom of the board, jaws chomping
  if (drawArt('muffet_pet', b.x, b.y + 40, Math.min(170, b.hw * 1.6), null, { frame: state.clock * 3 })) return;
  // the pet's big hungry mouth along the bottom of the board
  ctx.fillStyle = '#7a1f8f';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
  ctx.fillStyle = '#fff';
  for (let x = b.x - b.hw + 4; x < b.x + b.hw; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, b.y + b.hh);
    ctx.lineTo(x + 8, b.y + b.hh);
    ctx.lineTo(x + 4, b.y - b.hh);
    ctx.closePath();
    ctx.fill();
  }
};

Muffet.attacks = ['spiders', 'croissants', 'spiderPairs', 'donuts', 'spiders2', 'mixed', 'pet'].map(id => MUFFET_ATTACKS[id]);
