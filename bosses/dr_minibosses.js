// Deltarune minibosses: Sweet Cap'n Cakes, Lanino & Elnina, Shuttah, Jackenstein, Sound of Justice.

// ---------------------------------------------------------------- Sweet Cap'n Cakes
// Reference: a band of three. Hurting them is pointless (they heal back up), so you ACT:
// Dance makes one of them dance - at first they snap out of it after two turns, but after four
// dances Susie gets the hang of it and they keep dancing. When all three dance, the battle
// turns into a party and ends. Their bullets fire on the beat of the music: circles with
// trails from the top, notes from the speakers that follow your height, wave bullets.
const SCC_BEAT = 0.5; // 120 BPM

const SweetCapnCakes = registerBoss({
  id: 'sweet_cap_cakes',
  name: 'Sweet Cap\'n Cakes',
  shortName: 'Sweet Cap\'n Cakes',
  game: 'deltarune',
  color: '#ff7ab8',
  emblem: 'note',

  player: { name: 'SUSIE', maxHp: 160, power: 50 },
  maxHp: 360,
  attack: 16,
  defense: 0,
  checkAttack: 9,
  checkDefense: 0,
  gold: 0,
  cannotBeFought: true,
  box: { w: 140, h: 140 },
  fixedSpeed: true,
  check: 'A band of three. They heal each other with the power of music.',
  intro: '* Sweet Cap\'n Cakes is playing a song!',
  flavor: ['* The bass is thumping.', '* The crowd isn\'t here, but they\'re playing anyway.', '* It\'s a jam!'],

  setup(battle) {
    battle.flags.members = { Sweet: 0, Capn: 0, KK: 0 };  // turns of dancing left (99 = for good)
    battle.flags.dances = 0;
  },

  statusText(battle) {
    const m = battle.flags.members;
    return `DANCING: ${Object.keys(m).map(k => `${k} ${m[k] ? '♪' : '·'}`).join('  ')}`;
  },

  acts: [
    {
      name: 'Dance',
      description: 'Make a band member dance.',
      use: battle => sccDance(battle, 1)
    },
    {
      name: 'DanceX',
      tp: 40,
      description: 'Make two band members dance.',
      use: battle => sccDance(battle, 2)
    }
  ],

  onDamaged(battle) {
    // they just heal back up
    battle.bossHp = Math.min(battle.boss.maxHp, battle.bossHp + 60);
  },

  onTurnEnd(battle) {
    const m = battle.flags.members;
    for (const k in m) if (m[k] && m[k] < 99) m[k] -= 1;
  },

  getDialogue() {
    return pick(['Yo! Let\'s jam!', 'Feel the beat!', 'One, two, three, four!', 'Turn it UP!']);
  },

  attacks: [
    {
      name: 'Musical bullets', duration: 7,
      update(run) {
        // everything happens on the beat
        every(run, 'beat', SCC_BEAT, () => {
          run.data.beat = (run.data.beat || 0) + 1;
          const b = run.data.beat;
          if (b % 2 === 0) spawn({ kind: 'normal', x: rand(arena.x + 10, arena.x + arena.w - 10), y: arena.y - 8, vy: 160, r: 6, maxLife: 3, color: '#ff7ab8' });
          if (b % 4 === 1) {
            const left = chance(0.5);
            const y = state.player.y + rand(-15, 15);
            spawn({ kind: 'note', x: left ? arena.x - 10 : arena.x + arena.w + 10, y, vx: left ? 170 : -170, r: 6, maxLife: 3, minLife: 0.5, color: '#ffe14d' });
          }
          if (b % 8 === 4) {
            for (const left of [true, false]) {
              for (let i = 0; i < 4; i++) {
                const a = (left ? 0 : Math.PI) + rand(-0.7, 0.7);
                spawn({ kind: 'normal', x: left ? arena.x - 5 : arena.x + arena.w + 5, y: arena.y + arena.h / 2, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 5, maxLife: 3, minLife: 0.5, color: '#7fd4ff' });
              }
            }
          }
        }, 0.2);
      }
    }
  ]
});

function sccDance(battle, count) {
  const f = battle.flags;
  const idle = Object.keys(f.members).filter(k => !f.members[k]);
  const chosen = idle.slice(0, count);
  for (const k of chosen) {
    f.dances += 1;
    f.members[k] = f.dances > 4 ? 99 : 2;
  }
  // once Susie learned the moves, everyone who dances keeps dancing
  if (f.dances > 4) for (const k in f.members) if (f.members[k]) f.members[k] = 99;
  battle.mercy = Math.round((Object.values(f.members).filter(Boolean).length / 3) * 100);
  if (Object.values(f.members).every(Boolean)) {
    winBattle(battle, 'spared', '* All three are dancing! The battle turned into a party!\n* Fireworks read "BATTLE WON". YOU WON!');
    return '';
  }
  if (!chosen.length) return '* Everyone is already dancing.';
  const learned = f.dances > 4 ? '\n* Susie got the hang of it! They\'ll keep dancing now.' : '';
  return `* Susie danced with ${chosen.join(' and ')}!${learned}`;
}

// ---------------------------------------------------------------- Lanino & Elnina
// Reference: a weather-forecasting couple. Lanino fires sun or moon bullets from one side,
// Elnina fires raindrops or snow crystals from the other; where they meet in the middle they
// turn into hearts. Each turn starts with a forecast. Say "I love TV" (ACT); on turn 3 they ask
// whose attack you liked better - the one you pick gets stronger, the other weakens and
// leaves. They can't be beaten with violence; the show ends a few turns after the choice.
const LaninoElnina = registerBoss({
  id: 'lanino_elnina',
  name: 'Lanino & Elnina',
  shortName: 'Lanino & Elnina',
  game: 'deltarune',
  color: '#ffd35e',
  emblem: 'rainbow',

  player: { name: 'SUSIE', maxHp: 200, power: 55 },
  maxHp: 1000,
  attack: 26,
  defense: 0,
  checkAttack: 12,
  checkDefense: 0,
  gold: 0,
  cannotBeFought: true,
  box: { w: 140, h: 140 },
  fixedSpeed: true,
  check: 'A weather-forecasting couple. Their love is a little... cloudy.',
  intro: '* Lanino and Elnina present the weather!',

  setup(battle) {
    battle.flags.tv = 0;
    battle.flags.choice = null;
    battle.flags.forecast = pick(['sunny', 'rainy']);
  },

  statusText(battle) {
    return `"I LOVE TV" ${battle.flags.tv}`;
  },

  get acts() {
    const battle = state.battle;
    const f = battle && battle.boss === LaninoElnina ? battle.flags : null;
    if (f && f.asking) {
      return [
        { name: 'Lanino', description: 'You liked the sun and moon better.', use: b => leChoose(b, 'Lanino') },
        { name: 'Elnina', description: 'You liked the rain and snow better.', use: b => leChoose(b, 'Elnina') }
      ];
    }
    return [
      { name: 'ILoveTV', description: 'Show your love for TV. (+1)', use: b => leTv(b, 1) },
      { name: 'ILoveTVX', tp: 30, description: 'Really show it. (+3)', use: b => leTv(b, 3) }
    ];
  },
  set acts(value) {},

  onFight() {
    return 'miss';
  },

  getFlavor(battle) {
    const f = battle.flags;
    if (f.asking) return '* "Whose weather did you like better?"\n* (Choose with ACT.)';
    return `* FORECAST: ${f.forecast === 'sunny' ? 'Sunny with a chance of moons' : 'Rain, turning to snow'}.`;
  },

  getDialogue(battle) {
    return battle.flags.choice ? `${battle.flags.choice}: Thanks for picking me!` : pick(['And now, the weather!', 'Clear skies ahead!', 'Bring an umbrella!']);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    f.forecast = pick(['sunny', 'rainy']);
    if (battle.turn === 2 && !f.choice && f.tv > 0) f.asking = true;
    return this.attacks[0];
  },

  onTurnEnd(battle) {
    const f = battle.flags;
    if (f.choice) {
      f.afterChoice = (f.afterChoice || 0) + 1;
      if (f.afterChoice >= 3 && !battle.outcome) {
        winBattle(battle, 'spared', `* The forecast was clear: ${f.choice} won the viewers' hearts.\n* "I LOVE TV!" The show is over. YOU WON!`);
      }
    }
  },

  attacks: [
    {
      name: 'Weather',
      duration: 6.5,
      update(run) {
        const f = run.battle ? run.battle.flags : { choice: null };
        const lanino = f.choice !== 'Elnina';
        const elnina = f.choice !== 'Lanino';
        const strong = name => f.choice === name ? 0.7 : 1;
        if (lanino) {
          every(run, 'sun', 0.55 * strong('Lanino') * (f.choice === 'Elnina' ? 2 : 1), () => {
            const y = rand(arena.y + 10, arena.y + arena.h - 10);
            spawn({ kind: 'star', x: arena.x - 10, y, vx: 130, r: 7, maxLife: 4, minLife: 1, color: '#ffd35e', side: 'left' });
          }, 0.2);
        }
        if (elnina) {
          every(run, 'rain', 0.5 * strong('Elnina') * (f.choice === 'Lanino' ? 2 : 1), () => {
            const y = rand(arena.y + 10, arena.y + arena.h - 10);
            spawn({ kind: 'tear', x: arena.x + arena.w + 10, y, vx: -130, r: 5, maxLife: 4, minLife: 1, color: '#7fd4ff', side: 'right' });
          }, 0.4);
        }
        // where sun and rain meet they turn into hearts (before a choice is made)
        if (!f.choice) {
          for (const a of state.bullets) {
            if (a.side !== 'left' || a.dead) continue;
            for (const b of state.bullets) {
              if (b.side !== 'right' || b.dead) continue;
              if (Math.abs(a.x - b.x) < 12 && Math.abs(a.y - b.y) < 12) {
                a.dead = b.dead = true;
                spawn({ kind: 'suit', suit: 'heart', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vy: -30, r: 6, harmless: true, color: '#ff7ab8', faceVelocity: false, maxLife: 1 });
              }
            }
          }
        }
      }
    }
  ]
});

function leTv(battle, n) {
  battle.flags.tv += n;
  return `* Susie shouted "I LOVE TV!"${n > 1 ? ' Three times!' : ''}\n* The forecasters beam.`;
}

function leChoose(battle, name) {
  const f = battle.flags;
  f.choice = name;
  f.asking = false;
  battle.mercy = 60;
  const other = name === 'Lanino' ? 'Elnina' : 'Lanino';
  return `* You told them you liked ${name}'s weather better.\n* ${other} looks heartbroken...`;
}

// ---------------------------------------------------------------- Shuttah
// Reference: a photographer. Water drops fall and freeze when he snaps a photo, drops cross the
// board while he rotates his photos, diamonds aim at the SOUL. Photo ACTs start a timed photo
// challenge: line up the viewfinder (move with the arrows) on the subject and press Z. Good
// photos fill MERCY; at 80 % the next photo is a group photo, and a good one ends the battle.
const Shuttah = registerBoss({
  id: 'shuttah',
  name: 'Shuttah',
  game: 'deltarune',
  color: '#c8c8c8',
  emblem: 'camera',

  player: { name: 'SUSIE', maxHp: 200, power: 55 },
  maxHp: 700,
  attack: 24,
  defense: 0,
  checkAttack: 13,
  checkDefense: 0,
  gold: 0,
  box: { w: 140, h: 140 },
  fixedSpeed: true,
  check: 'A photographer. Say cheese!',
  intro: '* Shuttah wants a photo!',
  flavor: ['* Shuttah is adjusting the lens.', '* Flash!', '* Shuttah is looking for the perfect angle.'],

  setup(battle) {
    battle.flags.photo = null;
    battle.flags.power = false;
  },

  acts: [
    { name: 'EasyPhoto', description: 'A photo challenge with 10 seconds.', use: b => shuttahPhoto(b, 10) },
    { name: 'ToughPhoto', description: 'A photo challenge with 5 seconds.', use: b => shuttahPhoto(b, 5) },
    {
      name: 'PowerPhoto', tp: 25, description: 'Later good photos give more MERCY.',
      use(b) {
        b.flags.power = true;
        return shuttahPhoto(b, 10);
      }
    }
  ],

  onSpare(battle) {
    if (isSpareable(battle)) return false;
    addMercy(battle, 10);
    showResult(battle, '* Susie tried to spare Shuttah.\n* He seems flattered. (+10% MERCY)');
    return true;
  },

  getDialogue(battle, attack) {
    return attack.line || pick(['Say cheese!', 'Hold that pose!', 'Perfect lighting...', 'Click!']);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (f.photo) {
      const photo = f.photo;
      f.photo = null;
      return { ...SHUTTAH_PHOTO, time: photo.time, group: battle.mercy >= 80, name: battle.mercy >= 80 ? 'Group photo!' : 'Photo challenge' };
    }
    return SHUTTAH_ATTACKS[battle.turn % SHUTTAH_ATTACKS.length];
  },

  attacks: []
});

function shuttahPhoto(battle, time) {
  battle.flags.photo = { time };
  return battle.mercy >= 80
    ? '* "Everyone get together! It\'s time for a GROUP PHOTO!"'
    : `* "Ooh, a photo! You have ${time} seconds - line it up and press Z!"`;
}

const SHUTTAH_PHOTO = {
  name: 'Photo challenge',
  duration: 10,
  start(run) {
    run.attack = { ...run.attack, duration: run.attack.time };
    // the subject wanders around the board; the SOUL is the viewfinder
    run.data.subject = spawn({ kind: 'suit', suit: 'heart', x: arena.x + 40, y: arena.y + 40, r: 10, harmless: true, noCull: true, faceVelocity: false, color: '#ffe14d',
      update(b) {
        b.x = arena.x + arena.w / 2 + Math.sin(b.life * 1.3) * (arena.w / 2 - 25);
        b.y = arena.y + arena.h / 2 + Math.sin(b.life * 2.1) * (arena.h / 2 - 25);
      } });
  },
  update(run) {
    if (!consumePress(CONFIRM_KEYS)) return;
    const s = run.data.subject;
    const good = Math.hypot(s.x - state.player.x, s.y - state.player.y) < 22;
    const battle = run.battle;
    addFlash(0.3);
    sfx.select();
    if (battle) {
      if (run.attack.group && good) {
        winBattle(battle, 'spared', '* SNAP! A perfect group photo!\n* "Now THAT\'S going on the wall!"\n* YOU WON!');
      } else {
        const gain = good ? (battle.flags.power ? 20 : 10) * 4 : (battle.flags.power ? 12 : 6) * 2;
        addMercy(battle, gain);
      }
    }
    run.done = true;
  }
};

const SHUTTAH_ATTACKS = [
  {
    name: 'Frozen drops', duration: 6.5,
    update(run) {
      every(run, 'drop', 0.15, () => spawn({ kind: 'tear', x: rand(arena.x, arena.x + arena.w), y: arena.y - 8, vy: 150, r: 4, maxLife: 4, color: '#7fd4ff' }), 0.1);
      // every photo freezes the drops for a moment
      every(run, 'snap', 1.6, () => {
        addFlash(0.25);
        for (const b of state.bullets) {
          if (b.kind !== 'tear') continue;
          b.frozenUntil = b.life + 0.6;
          b.update = (d, dt) => { if (d.life > d.frozenUntil) d.y += d.vy * dt; };
        }
      }, 1.2);
    }
  },
  {
    name: 'Crossing drops', duration: 6.5,
    update(run) {
      every(run, 'drop', 0.25, () => {
        const vertical = chance(0.5);
        if (vertical) spawn({ kind: 'tear', x: rand(arena.x, arena.x + arena.w), y: arena.y - 8, vy: 160, r: 4, maxLife: 4, color: '#7fd4ff' });
        else spawn({ kind: 'tear', x: arena.x - 8, y: rand(arena.y, arena.y + arena.h), vx: 160, r: 4, maxLife: 4, color: '#7fd4ff' });
      }, 0.1);
    }
  },
  {
    name: 'Diamond shots', duration: 6,
    update(run) {
      every(run, 'shot', 0.45, () => {
        const x = arena.x + arena.w + 20;
        const y = rand(arena.y, arena.y + arena.h);
        const v = aimAt(x, y, 180);
        spawn({ kind: 'suit', suit: 'diamond', x, y, vx: v.vx, vy: v.vy, r: 5, maxLife: 4, minLife: 1, faceVelocity: true, color: '#ffffff' });
      }, 0.2);
    }
  }
];
Shuttah.attacks = SHUTTAH_ATTACKS;

// ---------------------------------------------------------------- Jackenstein
// Reference: every attack is a maze in the dark: grab the key (TP), collect treasure (TP), then
// reach the exit - once you have the key his pumpkin appears ("YOUR TAKING TOO LONG") and chases
// you. Attacks can't hurt him; Unleash three times (60 % TP each) to max out MERCY and spare him.
// LightUp widens your light. After the mazes he switches to a bullet rain.
const JACK_MAZES = [
  [
    '##########',
    '#K.....#E#',
    '#.####.#.#',
    '#.#T.....#',
    '#.#####.##',
    '#S...T...#',
    '##########'
  ],
  [
    '##########',
    '#S.#...#E#',
    '#..#.#.#.#',
    '#.T#.#...#',
    '#....###.#',
    '##.#K..T.#',
    '##########'
  ],
  [
    '##########',
    '#S....#..#',
    '####.##.##',
    '#T.#..K..#',
    '#.####.#.#',
    '#......#E#',
    '##########'
  ]
];

const Jackenstein = registerBoss({
  id: 'jackenstein',
  name: 'Jackenstein',
  game: 'deltarune',
  color: '#ff9a1a',
  emblem: 'pumpkin',

  player: { name: 'SUSIE', maxHp: 220, power: 55 },
  maxHp: 1350,
  attack: 30,
  defense: 0,
  checkAttack: 14,
  checkDefense: 0,
  gold: 0,
  cannotBeFought: true,
  box: { w: 140, h: 140 },
  fixedSpeed: true,
  check: 'A pumpkin-headed creature. Scared of... being seen?',
  intro: '* Jackenstein lurches out of the dark!',
  flavor: ['* It\'s pitch black in here.', '* Something is giggling in the dark.', '* Smells like pumpkin spice.'],

  setup(battle) {
    battle.flags.maze = 0;
    battle.flags.light = 1;
  },

  acts: [
    { name: 'Unleash', tp: 60, mercy: 35, text: '* Susie unleashed her light!\n* Jackenstein is exposed! (+35% MERCY)' },
    {
      name: 'LightUp', tp: 1, description: 'See further in the dark.',
      use(battle) {
        battle.flags.light = Math.min(2, battle.flags.light + 0.4);
        return '* Susie lit up the area a little.';
      }
    }
  ],

  onFight(battle) {
    return 'miss';
  },

  getDialogue() {
    return pick(['YOUR TAKING TOO LONG', 'Hee hee hee...', 'Find the key! If you can!', 'Boo!']);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (f.maze >= JACK_MAZES.length) return JACK_RAIN;
    return { ...JACK_MAZE, maze: JACK_MAZES[f.maze++], name: `Maze ${f.maze}` };
  },

  drawArenaOverlay(box) {
    const battle = state.battle;
    if (!battle || !battle.attack || !battle.attack.attack.maze) return;
    const p = state.player;
    const radius = 46 * battle.flags.light;
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.93)';
    ctx.fill();
    ctx.restore();
  },

  attacks: []
});

const JACK_MAZE = {
  name: 'Maze',
  duration: 20,
  box: { w: 300, h: 210 },
  start(run) {
    const maze = run.attack.maze || JACK_MAZES[run.level % JACK_MAZES.length];
    const rows = maze.length;
    const cols = maze[0].length;
    const cw = arena.w / cols;
    const ch = arena.h / rows;
    run.data.cell = { cw, ch };
    maze.forEach((row, y) => [...row].forEach((c, x) => {
      const cx = arena.x + cw * (x + 0.5);
      const cy = arena.y + ch * (y + 0.5);
      if (c === '#') spawn({ kind: 'wall', x: cx, y: cy, hw: cw / 2, hh: ch / 2, solid: true, noCull: true });
      if (c === 'K') run.data.key = spawn({ kind: 'key', x: cx, y: cy, r: 7, harmless: true, noCull: true });
      if (c === 'T') spawn({ kind: 'treasure', x: cx, y: cy, r: 6, harmless: true, noCull: true });
      if (c === 'E') run.data.exit = spawn({ kind: 'exit', x: cx, y: cy, r: 9, harmless: true, noCull: true });
      if (c === 'S') {
        state.player.x = cx;
        state.player.y = cy;
      }
    }));
  },
  update(run) {
    const p = state.player;
    const near = b => b && !b.dead && Math.hypot(b.x - p.x, b.y - p.y) < 14;
    for (const b of state.bullets) {
      if (b.kind === 'treasure' && near(b)) {
        b.dead = true;
        if (run.battle) run.battle.tp = Math.min(100, run.battle.tp + 4);
        sfx.select();
      }
    }
    if (near(run.data.key)) {
      run.data.key.dead = true;
      run.data.hasKey = true;
      if (run.battle) run.battle.tp = Math.min(100, run.battle.tp + 10);
      sfx.select();
      // the pumpkin shows up and gives chase
      run.data.pumpkin = spawn({ kind: 'pumpkin', x: arena.x + arena.w - 20, y: arena.y + 20, r: 10, noCull: true, clip: false,
        update(b, dt) {
          const v = aimAt(b.x, b.y, 55);
          b.x += v.vx * dt;
          b.y += v.vy * dt;
        } });
      addPopup('YOUR TAKING TOO LONG', arena.x + arena.w / 2, arena.y - 10, '#ff9a1a');
    }
    if (run.data.hasKey && near(run.data.exit)) {
      sfx.spare();
      run.done = true;
    }
  }
};

const JACK_RAIN = {
  name: 'Bullet rain', duration: 6.5,
  box: { w: 240, h: 170 },
  update(run) {
    every(run, 'drop', 0.12, () => spawn({ kind: 'normal', x: rand(arena.x, arena.x + arena.w), y: arena.y - 8, vy: 180, r: 4, maxLife: 3, color: '#ff9a1a' }), 0.1);
  }
};

Jackenstein.attacks = [JACK_MAZE, JACK_RAIN];

BULLET_DRAWERS.wall = b => {
  ctx.fillStyle = '#3a2a5a';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.key = b => {
  ctx.fillStyle = '#ffe14d';
  fillCircle(b.x - 3, b.y, 4);
  ctx.fillRect(b.x, b.y - 1, 8, 3);
  ctx.fillRect(b.x + 5, b.y + 1, 2, 4);
};

BULLET_DRAWERS.treasure = b => {
  ctx.fillStyle = '#7dff7d';
  drawSuit('diamond', b.x, b.y, 12, '#7dff7d');
};

BULLET_DRAWERS.exit = b => {
  ctx.strokeStyle = '#7fd4ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x - 8, b.y - 8, 16, 16);
};

BULLET_DRAWERS.pumpkin = b => {
  ctx.fillStyle = '#ff9a1a';
  fillCircle(b.x, b.y, b.r);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(b.x - 5, b.y - 2);
  ctx.lineTo(b.x - 2, b.y - 5);
  ctx.lineTo(b.x - 2, b.y);
  ctx.moveTo(b.x + 5, b.y - 2);
  ctx.lineTo(b.x + 2, b.y - 5);
  ctx.lineTo(b.x + 2, b.y);
  ctx.fill();
  ctx.fillRect(b.x - 5, b.y + 3, 10, 2);
};

// ---------------------------------------------------------------- Sound of Justice
// Reference: a statue that comes alive. The SOUL turns GREEN and arrows fly in from the left,
// right or top - a voice calls out the direction (later only the sound is left). After each
// volley the SOUL turns red and white rectangles mark where the hammer will strike. Nine
// attacks in a fixed order; it can't be damaged, and the battle ends after them - or right away
// when Susie heals (OKHeal).
const SOJ_DIRECTIONS = { left: 300, right: 600, up: 900 };

const SoundOfJustice = registerBoss({
  id: 'sound_of_justice',
  name: 'Sound of Justice',
  game: 'deltarune',
  color: '#c8c8ff',
  emblem: 'hammer',

  player: { name: 'SUSIE', maxHp: 220, power: 55 },
  maxHp: 1350,
  attack: 28,
  defense: 0,
  checkAttack: 14,
  checkDefense: 0,
  gold: 0,
  cannotBeFought: true,
  box: { w: 140, h: 140 },
  fixedSpeed: true,
  check: 'A statue that echoes an old hero\'s justice.',
  intro: '* The statue came alive!',
  flavor: ['* The statue\'s hammer is humming.', '* An echo rings through the study.', '* Listen carefully.'],

  acts: [
    { name: 'Talk', description: 'It doesn\'t listen.', text: '* Susie talked to the statue.\n* ...It didn\'t respond.' },
    {
      name: 'OKHeal', tp: 30, description: 'Susie heals. (Something about it...)',
      use(battle) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 60);
        winBattle(battle, 'spared', '* Susie cast OKHeal...\n* The statue froze, then crumbled. It was only a statue after all.\n* YOU WON!');
        return '';
      }
    }
  ],

  onFight() {
    return 'miss';
  },

  getDialogue() {
    return null;
  },

  chooseAttack(battle) {
    const t = battle.turn;
    const arrows = [6, 8, 0, 10, 12, 0, 16, 0, 16][t % 9];
    const hammers = [0, 0, 4, 0, 0, 6, 0, 9, 3][t % 9];
    return { ...SOJ_ATTACK, arrows, hammers, fast: t % 9 === 8, audioOnly: t >= 4, name: arrows ? `Arrow volley ${t + 1}` : `Hammer ${t + 1}` };
  },

  onTurnEnd(battle) {
    if (battle.turn >= 9 && !battle.outcome) {
      winBattle(battle, 'survived', '* The statue stopped moving.\n* Ralsei smashed it - it was only a statue brought to life.\n* YOU WON!');
    }
  },

  attacks: []
});

const SOJ_ATTACK = {
  name: 'Arrows and hammer',
  duration: 12,
  box: { w: 84, h: 84 },
  soul: 'green',
  start(run) {
    const arrows = run.attack.arrows !== undefined ? run.attack.arrows : 8;
    const hammers = run.attack.hammers !== undefined ? run.attack.hammers : 3;
    run.data.events = [];
    let t = 0.4;
    const gap = run.attack.fast ? 0.42 : 0.6;
    for (let i = 0; i < arrows; i++) {
      const dir = pick(['left', 'right', 'up']);
      run.data.events.push([t, () => {
        // the voice calls the direction (a pitch per side), early on a flash shows it too
        sfx.text();
        playTone({ freq: SOJ_DIRECTIONS[dir], duration: 0.12, type: 'triangle', volume: 0.05 });
        if (!run.attack.audioOnly) addPopup(dir.toUpperCase(), arenaCenter().x, arena.y - 12, '#ffe14d');
      }]);
      run.data.events.push([t + 0.35, () => undyneSpear(dir, 170 * (run.attack.fast ? 1.3 : 1))]);
      t += gap;
    }
    if (hammers) {
      run.data.events.push([t + 0.8, () => {
        setArena(220, 160);
        setSoulMode('red');
      }]);
      t += 1.3;
      for (let i = 0; i < hammers; i++) {
        run.data.events.push([t, () => {
          const w = 70;
          const h = 60;
          warnZone(rand(arena.x, arena.x + arena.w - w), rand(arena.y, arena.y + arena.h - h), w, h, 0.6, 0.18, { color: '#ffffff' });
        }]);
        t += 0.55;
      }
    }
    run.attack = { ...run.attack, duration: t + 1 };
  },
  update(run) {
    timeline(run, run.data.events);
  }
};

SoundOfJustice.attacks = [SOJ_ATTACK];
