// Asriel Dreemurr - Undertale, True Pacifist finale.
// Reference: Phase 1 ("God of Hyperdeath"): Star Blazing (big stars bursting into rings above
// the board), Shocker Breaker (lightning with [!] warnings), Chaos Saber (five swipes, sparks
// that drift then fly), Chaos Buster (waves of 3 or 4 lines - move for 3, stay still for 4 -
// then a charged beam) and their upgrades Galacta Blazing, Shocker Breaker II, Chaos Slicer,
// Chaos Blaster. FIGHT always misses and you can't die: at 0 HP "it refused". ACT has Hope
// and Dream. Hyper Goner fills the screen and pulls the SOUL into a vortex; a hit leaves 1 HP.
// Then the final form: the menu turns into STRUGGLE, later SAVE. Save the lost souls (each
// attacks like the friends they are), then save "someone else"... and Asriel stops fighting.

// The original's 13 turns (the fire-magic opening is folded into Star Blazing).
const ASRIEL_PHASE1 = ['shocker', 'saber', 'shocker', 'starBlazing', 'buster', 'saber', 'buster', 'shocker2', 'galacta',
  'slicer', 'blaster', 'shocker2', 'goner'];
const LOST_SOULS = [
  { name: 'Lost Soul', friends: 'Undyne and Alphys', saves: 3, attack: 'lostSpears' },
  { name: 'Lost Soul', friends: 'Papyrus and Sans', saves: 3, attack: 'lostBones' },
  { name: 'Lost Soul', friends: 'Toriel and Asgore', saves: 4, attack: 'lostFire' }
];

const Asriel = registerBoss({
  id: 'asriel',
  name: 'Asriel Dreemurr',
  game: 'undertale',
  color: '#ffffff',
  emblem: 'rainbow',

  get shortName() {
    const battle = state.battle;
    if (battle && battle.boss === Asriel && battle.flags.form === 'souls' && battle.flags.soul < LOST_SOULS.length) return 'Lost Soul';
    return 'Asriel Dreemurr';
  },

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['butterscotchPie', 'faceSteak', 'snowmanPiece'],
  maxHp: 9999,
  attack: 8,
  defense: 0,
  checkAttack: 8,
  checkDefense: 9999,
  hideHp: true,
  cannotBeFought: true,
  cannotLose: true,
  gold: 0,
  box: { w: 316, h: 136 },
  fixedSpeed: true,
  check: 'The absolute GOD of HYPERDEATH.',
  intro: '* Asriel Dreemurr blocks the way!\n* (...it\'s the end.)',
  flavor: [
    '* Asriel Dreemurr is laughing.',
    '* You feel your friends\' SOULs resonating within ASRIEL!',
    '* The air is crackling with stars.',
    '* Reality itself is bending.'
  ],

  setup(battle) {
    battle.flags.form = 'god';      // 'god' -> 'final' -> 'souls' -> 'end'
    battle.flags.step = 0;
    battle.flags.hope = false;
    battle.flags.struggles = 0;
    battle.flags.soul = 0;
    battle.flags.saves = 0;
    battle.flags.endStep = 0;
  },

  acts: [
    {
      name: 'Hope',
      description: 'Hold on. Heals 1 HP and softens the next attack.',
      use(battle) {
        battle.flags.hope = true;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
        battle.attackMult = 0.6;
        return '* You closed your eyes...\n* You remembered happy days. Recovered 1 HP.\n* The next attack will be weaker.';
      }
    },
    {
      name: 'Dream',
      description: 'Heals 4 HP and makes a Last Dream.',
      use(battle) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 4);
        const stack = battle.inventory.find(s => s.id === 'lastDream');
        if (stack) stack.count += 1;
        else battle.inventory.push({ id: 'lastDream', count: 1 });
        return '* You dreamed of a happy ending.\n* Recovered 4 HP. You got a Last Dream!';
      }
    }
  ],

  // the menu changes in the final form
  getCommands(battle) {
    const f = battle.flags;
    if (f.form === 'god') return COMMAND_SETS.undertale;
    if (f.form === 'final' || f.form === 'goner') {
      return [{ id: 'struggle', label: f.struggles >= 3 ? 'SAVE' : 'STRUGGLE', run: asrielStruggle }];
    }
    if (f.form === 'souls') {
      const soul = LOST_SOULS[f.soul];
      return [{ id: 'save', label: soul ? 'SAVE' : 'SAVE', run: asrielSave }];
    }
    return [{ id: 'save', label: 'SAVE', run: asrielSave }];
  },

  onFight() {
    return 'miss';
  },

  onSpare(battle) {
    showResult(battle, '* You tried to spare Asriel...\n* ...but he isn\'t listening.');
    return true;
  },

  // you cannot lose this fight
  onLethal(battle) {
    state.player.hp = state.player.maxHp;
    battle.flags.refused = (battle.flags.refused || 0) + 1;
    addPopup('...', partyPopupPos().x, partyPopupPos().y, '#ffffff');
    setHint('* But it refused.');
    if (battle.attack) battle.attack.done = true;
    return true;
  },

  getFlavor(battle) {
    const f = battle.flags;
    if (f.refused) {
      f.refused = 0;
      return '* But it refused.';
    }
    if (f.form === 'final') return f.struggles >= 3 ? '* You reached out... to SAVE something.' : '* Asriel is laughing. You can\'t move.';
    if (f.form === 'souls') {
      const soul = LOST_SOULS[f.soul];
      if (!soul) return '* Your friends are back. But there\'s still someone else...';
      return `* The Lost Soul looks familiar...\n* (It feels like ${soul.friends}.)`;
    }
    if (f.form === 'end') return '* Asriel is crying.';
    return null;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    const f = battle.flags;
    if (f.form === 'souls') return null;
    return pick([
      'Howdy! It\'s me, your best friend!',
      'Don\'t you understand? I\'m the GOD of this world!',
      'Let\'s play a game, just like old times!',
      'Hee hee hee... still holding on?',
      'Why won\'t you just give up?'
    ]);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (f.form === 'god') {
      const id = ASRIEL_PHASE1[f.step++];
      if (id === 'goner') f.form = 'goner';
      return ASRIEL_ATTACKS[id];
    }
    if (f.form === 'goner' || f.form === 'final') {
      f.form = 'final';
      return ASRIEL_ATTACKS.angel;
    }
    if (f.form === 'souls') {
      const soul = LOST_SOULS[f.soul];
      return soul ? ASRIEL_ATTACKS[soul.attack] : ASRIEL_ATTACKS.angel;
    }
    // "someone else"
    const ending = ['dense', 'sparse', 'gentleFire', 'finalBeam'];
    const id = ending[Math.min(f.endStep++, ending.length - 1)];
    return ASRIEL_ATTACKS[id];
  },

  onTurnEnd(battle) {
    const f = battle.flags;
    if (f.form === 'goner') f.form = 'final';
    if (f.form === 'end' && f.endStep >= 4 && !battle.outcome) {
      winBattle(battle, 'spared', '* Asriel stopped fighting.\n* "...I\'m so sorry. I just didn\'t want to say goodbye."\n* YOU WON! Everyone was saved.');
    }
  },

  victoryText() {
    return null;
  },

  // HYPER GONER: a huge vortex swirling into a dark maw in the middle of the screen
  drawArenaBackground(box) {
    const run = state.battle && state.battle.attack;
    if (!run || !run.attack.vortex) return;
    const c = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    const t = run.t;
    ctx.save();
    for (let arm = 0; arm < 6; arm++) {
      ctx.strokeStyle = `hsla(${(arm * 60 + t * 90) % 360}, 80%, 70%, 0.35)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 60; i++) {
        const r = 320 - i * 5;
        const a = arm * (Math.PI / 3) + i * 0.12 - t * 2.2;
        ctx.lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.6);
      }
      ctx.stroke();
    }
    const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 60);
    grad.addColorStop(0, '#000');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.9)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 60 + Math.sin(t * 6) * 4, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  attacks: []
});

ITEMS.lastDream = { name: 'Last Dream', heal: 17, text: '* Through DETERMINATION, the dream became true.' };

function asrielStruggle(battle) {
  const f = battle.flags;
  if (f.struggles >= 3) {
    f.form = 'souls';
    showResult(battle, '* You tried to reach your SAVE file.\n* Nothing happened...\n* But something else is listening. You can SAVE them.');
    return;
  }
  f.struggles += 1;
  const lines = ['* You struggled.', '* You struggled harder.', '* You struggled with all your might... something is changing.'];
  showResult(battle, lines[f.struggles - 1]);
}

function asrielSave(battle) {
  const f = battle.flags;
  const soul = LOST_SOULS[f.soul];
  if (!soul) {
    const lines = [
      '* You reached out to SAVE someone else...\n* ...Asriel.',
      '* You told Asriel you wouldn\'t give up on him.',
      '* You held on to Asriel.\n* He\'s trembling.',
      '* You stayed by Asriel\'s side.',
      '* ...'
    ];
    f.form = 'end';
    showResult(battle, lines[Math.min(f.endStep, lines.length - 1)]);
    return;
  }
  f.saves += 1;
  if (f.saves >= soul.saves) {
    f.saves = 0;
    f.soul += 1;
    state.player.hp = state.player.maxHp;
    sfx.spare();
    showResult(battle, `* You reached out to ${soul.friends}...\n* They remember you! You feel your HP fill up.`);
    return;
  }
  const hints = [
    `* You reached out to the Lost Soul.\n* It reminds you of ${soul.friends}.`,
    '* You called their names.\n* Something stirs inside...',
    '* You reminded them of the good times.\n* They\'re starting to remember...'
  ];
  showResult(battle, hints[Math.min(f.saves - 1, hints.length - 1)]);
}

// The small square board of Chaos Saber (from the fight).
const ASRIEL_SABER_BOX = { w: 104, h: 92 };

// ---------------- Building blocks ----------------
function asrielStar(x, y, vx, vy, r = 6, options = {}) {
  return spawn({ kind: 'star', x, y, vx, vy, r, maxLife: 6, ...options });
}

function burstStars(x, y, count, speed, spin = 0) {
  const off = Math.random() * Math.PI;
  for (let i = 0; i < count; i++) {
    const a0 = off + (Math.PI * 2 * i) / count;
    asrielStar(x, y, 0, 0, 5, {
      update(b, dt) {
        const a = a0 + b.life * spin;
        b.x += Math.cos(a) * speed * dt;
        b.y += Math.sin(a) * speed * dt + 30 * dt;
      }
    });
  }
}

function bigFallingStar(x, burstY, count, speed, spin, delay = 0) {
  const startX = x + 120;
  asrielStar(startX, arena.y - 140, 0, 0, 12, {
    noCull: true, clip: false, harmless: true, warn: delay,
    update(b, dt) {
      if (b.life < b.warn) return;
      b.x += (x - startX) * dt * 1.4;
      b.y += 170 * dt;
      if (b.y >= burstY) {
        b.dead = true;
        sfx.pop();
        burstStars(b.x, b.y, count, speed, spin);
      }
    }
  });
}

function lightningColumn(x, width, warn, active = 0.25) {
  return warnZone(x - width / 2, arena.y, width, arena.h, warn, active, { kind: 'asrielBolt', color: '#fff7a8', ownWarn: true, clip: false });
}

function saberSwipe(side, warn) {
  // half of the board flashes, then the blade sweeps it; sparks stay behind
  const half = arena.w / 2;
  const x = side === 'left' ? arena.x : arena.x + half;
  warnZone(x, arena.y, half, arena.h, warn, 0.18, { kind: 'saber', color: '#ffe14d', side, ownWarn: true, clip: false });
  for (let i = 0; i < 2; i++) {
    const sx = rand(x + 10, x + half - 10);
    const sy = rand(arena.y + 10, arena.y + arena.h - 10);
    asrielStar(sx, sy, 0, 0, 4, {
      kind: 'asrielTwinkle', warn: warn + 0.25, noCull: true, maxLife: warn + 3,
      update(b, dt) {
        if (b.life < b.warn) return;
        const t = b.life - b.warn;
        b.x += (side === 'left' ? 1 : -1) * (t < 0.8 ? 25 : 130) * dt;
      }
    });
  }
}

// One wave of Chaos Buster: 3 lines aimed at you (move!) or 4 lines around you (stay!).
function busterWave(lines, warn = 0.5) {
  const p = state.player;
  const offsets = lines === 3 ? [-34, 0, 34] : [-70, -34, 34, 70];
  for (const off of offsets) {
    const x = p.x + off;
    spawnBeam(x, arena.y - 60, Math.PI / 2, 16, warn, 0.2, { beamColor: '#ffe14d' });
  }
}

// ---------------- Attacks ----------------
const ASRIEL_ATTACKS = {
  starBlazing: {
    name: 'Star Blazing', duration: 7, pose: 'stars',
    line: 'Let\'s see how you like THIS!',
    start(run) {
      for (let i = 0; i < 4; i++) bigFallingStar(rand(arena.x + 30, arena.x + arena.w - 30), arena.y - 20, 10, 90, 0, 0.3 + i * 1.1);
      bigFallingStar(arena.x + arena.w / 2, arena.y - 10, 18, 95, 0, 5);
    },
    update() {}
  },
  galacta: {
    name: 'Galacta Blazing', duration: 7.5, pose: 'stars',
    line: 'Behold... GALACTA BLAZING!',
    start() {
      for (let i = 0; i < 7; i++) bigFallingStar(rand(arena.x + 20, arena.x + arena.w - 20), arena.y - 20, 12, 95, -0.8, 0.2 + i * 0.75);
      bigFallingStar(arena.x + arena.w / 2, arena.y - 10, 22, 100, -0.8, 5.6);
    },
    update() {}
  },
  shocker: {
    name: 'Shocker Breaker', duration: 6.5, pose: 'shocker',
    start(run) {
      run.data.events = [];
      for (let i = 0; i < 4; i++) {
        const left = i % 2 === 0;
        run.data.events.push([0.2 + i * 0.7, () => lightningColumn(arena.x + arena.w * (left ? 0.3 : 0.7), 30, 0.55)]);
      }
      for (let i = 0; i < 3; i++) {
        run.data.events.push([3.2 + i * 0.95, () => lightningColumn(state.player.x, 90, 0.6)]);
      }
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },
  shocker2: {
    name: 'Shocker Breaker II', duration: 7.5, pose: 'shocker',
    start(run) {
      run.data.events = [];
      for (let i = 0; i < 3; i++) run.data.events.push([0.2 + i * 0.55, () => lightningColumn(arena.x + arena.w * (0.2 + 0.3 * i), 28, 0.5)]);
      for (let i = 0; i < 4; i++) run.data.events.push([2 + i * 0.6, () => lightningColumn(state.player.x, 36, 0.45)]);
      // a sweep of big bolts from left to right
      for (let i = 0; i < 5; i++) run.data.events.push([4.6 + i * 0.42, () => lightningColumn(arena.x + arena.w * (0.1 + i * 0.2), arena.w * 0.2, 0.4, 0.2)]);
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },
  saber: {
    name: 'Chaos Saber', duration: 7, box: ASRIEL_SABER_BOX, pose: 'saber',
    line: 'Chaos... SABER!',
    start(run) {
      run.data.events = [];
      const sides = ['right', 'left', 'right', 'left', 'right'];
      sides.forEach((side, i) => run.data.events.push([0.2 + i * 0.95, () => saberSwipe(side, 0.55)]));
      run.data.events.push([5.2, () => { saberSwipe('left', 0.6); saberSwipe('right', 1.05); }]);
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },
  slicer: {
    name: 'Chaos Slicer', duration: 7, box: ASRIEL_SABER_BOX, pose: 'saber',
    line: 'Chaos... SLICER!',
    start(run) {
      run.data.events = [];
      for (let i = 0; i < 6; i++) run.data.events.push([0.2 + i * 0.75, () => saberSwipe(i % 2 ? 'left' : 'right', 0.42)]);
      run.data.events.push([5, () => { saberSwipe('left', 0.45); saberSwipe('right', 0.9); }]);
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },
  buster: {
    name: 'Chaos Buster', duration: 9, pose: 'buster',
    line: 'Chaos... BUSTER!',
    start(run) {
      run.data.events = [];
      for (let i = 0; i < 9; i++) run.data.events.push([0.2 + i * 0.75, () => busterWave(i % 2 === 0 ? 3 : 4)]);
      run.data.events.push([7.2, () => spawnBeam(state.player.x, arena.y - 60, Math.PI / 2, 60, 0.9, 0.4, { beamColor: '#ffffff' })]);
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },
  blaster: {
    name: 'Chaos Blaster', duration: 8, pose: 'buster',
    line: 'Chaos... BLASTER!',
    start(run) {
      run.data.events = [];
      for (let i = 0; i < 8; i++) run.data.events.push([0.2 + i * 0.6, () => {
        const x = rand(arena.x + 10, arena.x + arena.w - 10);
        spawnBeam(x, arena.y - 60, Math.PI / 2, 18, 0.45, 0.2, { beamColor: '#ffe14d' });
      }]);
      run.data.events.push([5.4, () => {
        const p = state.player;
        spawnBeam(p.x, arena.y - 60, Math.PI / 2, 60, 0.9, 0.35, { beamColor: '#ffffff' });
        run.data.burstAt = { x: p.x, y: arena.y + arena.h / 2 };
      }]);
      run.data.events.push([6.4, () => burstStars(run.data.burstAt.x, run.data.burstAt.y, 20, 120, 0)]);
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },
  goner: {
    name: 'HYPER GONER', duration: 7,
    box: { w: 640, h: 310 },
    line: 'Hee hee hee... it\'s time to say goodbye.',
    vortex: true,
    update(run, dt) {
      const c = arenaCenter();
      const p = state.player;
      // the vortex pulls the SOUL in
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.x += (dx / d) * 55 * dt;
      p.y += (dy / d) * 55 * dt;
      every(run, 'diamond', 0.12, () => {
        const a = Math.random() * Math.PI * 2;
        const x = c.x + Math.cos(a) * 340;
        const y = c.y + Math.sin(a) * 200;
        spawn({ kind: 'suit', suit: 'diamond', x, y, vx: (c.x - x) / 2, vy: (c.y - y) / 2, r: 7, color: '#ffffff', maxLife: 2.2, noCull: true, faceVelocity: true,
          // a hit drops you to 1 HP, no matter what
          damage: 0, onHit: () => { p.hp = 1; } });
      }, 0);
    },
    end(run) {
      if (run.battle) run.battle.noDamage = true;
    }
  },
  angel: {
    name: 'Angel of Death', duration: 6,
    update(run) {
      every(run, 'comet', 0.35, () => {
        const fromLeft = chance(0.5);
        const x = fromLeft ? arena.x - 20 : arena.x + arena.w + 20;
        const y = rand(arena.y, arena.y + arena.h);
        spawn({
          kind: 'star', x, y, vx: 0, vy: 0, r: 5, noCull: true, maxLife: 4, color: '#c8a2ff', damage: 0,
          update(b, dt) {
            const v = aimAt(b.x, b.y, 140);
            b.vx += (v.vx - b.vx) * Math.min(1, dt * 1.5);
            b.vy += (v.vy - b.vy) * Math.min(1, dt * 1.5);
            b.x += b.vx * dt;
            b.y += b.vy * dt;
          }
        });
      }, 0.2);
    }
  },
  lostSpears: {
    name: 'Lost Soul: spears', soul: 'green', box: { w: 84, h: 84 },
    start(run) {
      run.data.pace = 1;
      run.data.script = makeSpearScript(0, 1);
      run.data.next = 0;
      run.data.clock = 0;
    },
    update: (run, dt) => UNDYNE_ATTACKS.green.update(run, dt)
  },
  lostBones: {
    name: 'Lost Soul: bones', soul: 'blue', duration: 6, box: { w: 280, h: 140 },
    start() {
      for (let i = 0; i < 6; i++) floorBone(arena.x + arena.w + 12 + i * 120, i % 3 === 2 ? 42 : 22, -170);
      floorBone(arena.x - 12 - 300, arena.h - 10, 170, { color: 'cyan' });
    },
    update() {}
  },
  lostFire: {
    name: 'Lost Soul: fire', duration: 6,
    start(run) {
      run.data.events = [];
      tridentSequenceFor(run, 2.5, 2);
    },
    update(run) {
      timeline(run, run.data.events);
      every(run, 'fire', 0.16, () => {
        const swing = (arena.w / 2 - 30) * Math.sin(run.t * 2.1);
        spawn({ kind: 'fire', x: arena.x + arena.w / 2 + swing, y: arena.y - 8, vy: 110, r: 6, maxLife: 4 });
      }, 0);
    }
  },
  dense: {
    name: 'A desperate wave', duration: 5,
    line: 'S... stop it! Stop it NOW!',
    update(run) {
      every(run, 'shot', 0.06, () => {
        spawn({ kind: 'star', x: rand(arena.x, arena.x + arena.w), y: arena.y - 8, vy: 220, r: 4, maxLife: 3, damage: 0 });
      }, 0);
    }
  },
  sparse: {
    name: 'A weaker wave', duration: 5,
    line: 'Why... why are you being so nice to me?',
    update(run) {
      // can't reach a SOUL that stays in the middle
      every(run, 'shot', 0.2, () => {
        const c = arenaCenter();
        const x = chance(0.5) ? rand(arena.x, c.x - 40) : rand(c.x + 40, arena.x + arena.w);
        spawn({ kind: 'star', x, y: arena.y - 8, vy: 150, r: 4, maxLife: 3, damage: 0 });
      }, 0);
    }
  },
  gentleFire: {
    name: 'Fire that misses', duration: 4.5,
    line: 'I... I can\'t...',
    update(run) {
      every(run, 'fire', 0.15, () => {
        const f = spawn({ kind: 'fire', x: rand(arena.x + 10, arena.x + arena.w - 10), y: arena.y - 8, vy: 120, r: 6, maxLife: 4 });
        f.avoidSoul = true;
        f.harmless = true;
      }, 0);
    }
  },
  finalBeam: {
    name: 'Last beam', duration: 3.5,
    line: 'Frisk... I...',
    start() {
      spawnBeam(arena.x - 60, arena.y + arena.h / 2, 0, arena.h, 1.2, 1.2, { damage: 0, beamColor: '#ffffff' });
    },
    update() {}
  }
};

// Asgore's trident, reused for the Toriel & Asgore lost soul.
function tridentSequenceFor(run, start, count) {
  const colors = [];
  for (let i = 0; i < count; i++) colors.push(chance(0.5) ? 'cyan' : 'orange');
  colors.forEach((color, i) => {
    run.data.events.push([start + i * 0.8, () => spawn({
      kind: 'sweep', x: arena.x + arena.w / 2, y: arena.y + arena.h / 2, hw: arena.w / 2, hh: arena.h / 2,
      color, activeFor: 0.22, noCull: true, fromLeft: i % 2 === 0, warn: 0.5
    })]);
  });
}

BULLET_DRAWERS.star = (b, fill) => {
  ctx.translate(b.x, b.y);
  ctx.rotate(b.life * 4);
  ctx.fillStyle = b.color && !SEMANTIC_COLORS[b.color] ? b.color : '#ffe14d';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? b.r * 1.3 : b.r * 0.55;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
};

BULLET_DRAWERS.saber = (b, fill) => {
  const x = b.x - b.hw;
  const y = b.y - b.hh;
  if (b.life < b.warn) {
    ctx.fillStyle = Math.floor(b.life * 14) % 2 === 0 ? 'rgba(255, 60, 60, 0.25)' : 'rgba(255, 60, 60, 0.08)';
    ctx.fillRect(x, y, b.hw * 2, b.hh * 2);
    return;
  }
  // a bright diagonal slash over that half
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + b.hw * 2, y + b.hh * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 225, 77, 0.35)';
  ctx.fillRect(x, y, b.hw * 2, b.hh * 2);
};

Asriel.attacks = ASRIEL_PHASE1.map(id => ASRIEL_ATTACKS[id]).concat([ASRIEL_ATTACKS.angel, ASRIEL_ATTACKS.lostBones, ASRIEL_ATTACKS.lostFire]);

// ---------------------------------------------------------------- the look of the fight
// God of Hyperdeath fights in front of the game's shifting rainbow background; the final form
// spreads wings filled with it. Lost Souls show the friends they used to be, glitching.
function asrielPattern(x, y, w, h, alpha = 1) {
  const img = attackImage('asriel_bg');
  if (!img) return false;
  // drawn large and soft, so it reads as big blocks of colour
  const scale = 1.25;
  const tw = 1600 * scale;
  const off = (state.clock * 40) % tw;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha *= alpha;
  // the colours keep cycling, like in the game
  ctx.filter = `hue-rotate(${Math.round((state.clock * 60) % 360)}deg)`;
  ctx.imageSmoothingEnabled = true;
  for (let tx = -off; tx < VIEW_W; tx += tw) ctx.drawImage(img, tx, -170, tw, 600 * scale);
  ctx.restore();
  return true;
}

let asrielWingCanvas = null;
function drawAsrielWing(x, y, w, h, flip) {
  const mask = attackImage('asriel_wing_mask');
  if (!mask) return;
  if (!asrielWingCanvas) asrielWingCanvas = document.createElement('canvas');
  const c = asrielWingCanvas;
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(mask, 0, 0, w, h);
  g.globalCompositeOperation = 'source-in';
  const img = attackImage('asriel_bg');
  if (img) {
    g.filter = `hue-rotate(${Math.round((state.clock * 60) % 360)}deg)`;
    const off = (state.clock * 40) % 400;
    g.drawImage(img, -off, -40, 1600 * 0.6, 600 * 0.6);
  }
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0, w, h);
  ctx.restore();
}

function asrielPose(battle) {
  if (!battle || battle.phase !== 'attack' || !battle.attack) return null;
  return battle.attack.attack.pose || null;
}

const LOST_SOUL_ART = [['undyne'], ['papyrus', 'sans'], ['toriel', 'asgore']];

Object.assign(Asriel, {
  drawBackdrop(battle) {
    const form = battle ? battle.flags.form : 'god';
    if (form !== 'god' && form !== 'goner') return false;
    return asrielPattern(-20, -20, VIEW_W + 40, VIEW_H + 40, 0.8);
  },

  drawScene(battle) {
    const f = battle ? battle.flags : { form: 'god' };
    const at = bossPosition(Asriel);
    const look = battle ? { hurt: Math.min(1, battle.bossHurt * 2) } : {};
    if (f.form === 'souls' && f.soul < LOST_SOUL_ART.length) {
      // the friends, flickering with white blocks where their faces should be
      const ids = LOST_SOUL_ART[f.soul];
      ids.forEach((id, i) => {
        const x = ids.length === 1 ? at.x : at.x + (i ? 140 : -140);
        const boss = BOSSES[id];
        if (!boss) return;
        drawBossFigure(boss, x, at.y, state.clock, { maxH: 130 });
        const seed = Math.floor(state.clock * 8) + i * 7;
        for (let k = 0; k < 8; k++) {
          ctx.fillStyle = k % 3 ? '#fff' : '#000';
          const rx = ((seed * 37 + k * 53) % 40) - 20;
          const ry = ((seed * 17 + k * 29) % 34) - 62;
          ctx.fillRect(x + rx - 6, at.y + ry, 10 + (k % 3) * 6, 8 + (k % 2) * 6);
        }
      });
      return;
    }
    if (f.form === 'goner' && battle && battle.phase === 'attack') {
      // HYPER GONER: a giant goat skull opens its jaws over the screen
      const k = 1 + Math.sin(state.clock * 3) * 0.04;
      if (drawArt('asriel_hg_face', at.x, 120, 300 * k, null)) return;
    }
    if (['final', 'souls', 'end'].includes(f.form)) {
      // Angel of Death: rainbow wings and the white body
      const bob = Math.sin(state.clock * 2) * 3;
      const wingW = 230;
      const wingH = wingW * 113 / 156;
      drawAsrielWing(at.x + 30, -6 + bob, wingW, wingH, false);
      drawAsrielWing(at.x - 30, -6 + bob, wingW, wingH, true);
      if (!drawArt('asriel_final_body', at.x, 82 + bob, 140, null)) drawBossFigure(Asriel, at.x, at.y, state.clock, look);
      return;
    }
    // God of Hyperdeath, with the props of the attack he is doing
    const pose = asrielPose(battle);
    const hx = 48;
    const hy = at.y + 10;
    if (pose === 'saber') {
      drawArt('asriel_sword', at.x - hx - 10, hy - 50, 62, null, { flipX: true });
      drawArt('asriel_sword', at.x + hx + 10, hy - 50, 62, null);
    }
    drawBossFigure(Asriel, at.x, at.y, state.clock, look);
    if (pose === 'shocker' || pose === 'stars') {
      for (const side of [-1, 1]) {
        if (pose === 'shocker') drawArt('asriel_handlightning', at.x + side * (hx + 18), hy - 4, 60, 20, { flipX: side < 0, frame: 0 });
        else if (Math.floor(state.clock * 10 + side) % 2) drawArt('asriel_star', at.x + side * (hx + 6), hy - 8, 16, 16, { angle: state.clock * 5 });
      }
    }
    if (pose === 'buster') drawArt('asriel_gunarm', at.x + hx + 6, hy + 10, 40, null, { frame: state.clock * 6 });
  }
});

// ---------------------------------------------------------------- bullets
// stars: the big ones are pastel and see-through, the small ones white
const ASRIEL_STAR_TINTS = ['#ffd6f5', '#d6e6ff', '#d8ffd6', '#fff3c4', '#e6d6ff'];
BULLET_DRAWERS.star = (b, fill) => {
  const asriel = state.currentBoss && state.currentBoss.id === 'asriel';
  if (asriel && b.r >= 10 && attackImage('asriel_bigstar')) {
    ctx.globalAlpha *= 0.8;
    b.tint = b.tint || pick(ASRIEL_STAR_TINTS);
    drawArt('asriel_bigstar', b.x, b.y, b.r * 7, null, { angle: b.life * 1.5, tint: b.tint });
    return;
  }
  if (asriel && drawArt('asriel_star', b.x, b.y, b.r * 3.2, null, { angle: b.life * 4, tint: b.color && !SEMANTIC_COLORS[b.color] ? b.color : null })) return;
  ctx.translate(b.x, b.y);
  ctx.rotate(b.life * 4);
  ctx.fillStyle = b.color && !SEMANTIC_COLORS[b.color] ? b.color : '#ffe14d';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? b.r * 1.3 : b.r * 0.55;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
};

// Shocker Breaker: "!" targets, then rainbow lightning from the top of the screen
BULLET_DRAWERS.asrielBolt = b => {
  const left = b.x - b.hw;
  const bottom = b.y + b.hh;
  if (b.life < b.warn) {
    ctx.globalAlpha *= 0.25;
    ctx.fillStyle = '#fff';
    ctx.fillRect(left, b.y - b.hh, b.hw * 2, b.hh * 2);
    ctx.globalAlpha /= 0.25;
    for (let x = left + 10; x <= left + b.hw * 2 - 8; x += 22) drawArt('asriel_target', x, bottom - 12, 18, 18, { frame: b.life * 12 });
    return;
  }
  const hue = Math.round((state.clock * 300 + b.x) % 360);
  const tint = `hsl(${hue}, 90%, 65%)`;
  const n = Math.max(1, Math.round((b.hw * 2) / 30));
  for (let i = 0; i < n; i++) {
    const x = left + (i + 0.5) * (b.hw * 2 / n);
    for (let y = bottom; y > -60; y -= 196) drawArt('asriel_bolt', x, y - 98, 32, 200, { frame: state.clock * 20 + i, tint });
  }
  ctx.globalAlpha *= 0.5;
  ctx.fillStyle = '#fff';
  ctx.fillRect(left + b.hw * 0.6, 0, b.hw * 0.8, bottom);
};

// Chaos Saber: the half flashes, then a huge white crescent slashes through it
BULLET_DRAWERS.saber = b => {
  const x = b.x - b.hw;
  const y = b.y - b.hh;
  if (b.life < b.warn) {
    ctx.fillStyle = Math.floor(b.life * 14) % 2 === 0 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, y, b.hw * 2, b.hh * 2);
    return;
  }
  const k = Math.min(1, (b.life - b.warn) / 0.12);
  ctx.globalAlpha *= 0.85;
  const h = Math.max(b.hh * 2 * 2.4, 160);
  if (drawArt('asriel_swordsmear', b.x + (b.side === 'left' ? -10 : 10), b.y - (1 - k) * 60, h * 158 / 168, h, { flipX: b.side === 'left' })) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.asrielTwinkle = b => {
  ctx.globalAlpha *= b.life < b.warn ? 0.5 : 1;
  if (drawArt('asriel_twinkle', b.x, b.y, 12, 12, { angle: b.life * 3 })) return;
  ctx.fillStyle = '#fff';
  fillCircle(b.x, b.y, 3);
};
