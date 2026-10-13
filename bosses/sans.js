// Sans - Undertale, Genocide finale.
// Reference: he attacks first with his strongest attack (a BLUE slam into a bone floor,
// a bone wave with a gap, four sets of beam cannons). His hits only do 1 damage but come
// every frame and add KARMA, which keeps draining HP afterwards (it can't take your last HP).
// Phase 1 is mostly BLUE SOUL gravity: bone lines to jump, cyan bones, platforms over a
// sea of bones. Around the middle he offers mercy - accepting is a trap. Phase 2 adds more
// beams and gravity slams, then a long final barrage, after which he falls asleep and your
// attack finally connects. He dodges every FIGHT until then.
// In the second half he even throws bones across the command buttons while you choose, and
// his "special attack" is not attacking at all: wait until he falls asleep, then push the
// board left and down onto FIGHT. Push too early and he wakes up and puts you back.

const Sans = registerBoss({
  id: 'sans',
  name: 'Sans',
  game: 'undertale',
  color: '#7fb4ff',
  emblem: 'beam',

  player: { name: 'CHARA', lv: 19, maxHp: 92, power: 999 },
  items: ['butterscotchPie', 'instantNoodles', 'faceSteak', 'legendaryHero', 'legendaryHero', 'legendaryHero', 'snowmanPiece', 'snowmanPiece'],
  maxHp: 1,
  attack: 1,
  defense: 0,
  checkAttack: 1,
  checkDefense: 1,
  hideHp: true,
  karma: true,
  iframes: 1 / 30,
  gold: 0,
  fixedSpeed: true,
  // the wide, low board most of his blue attacks use (the opening and the finale are square)
  box: { w: 330, h: 118 },
  check: 'Can only deal 1 damage. The easiest enemy around.',
  intro: '* You feel like you\'re going to have a bad time.',
  gameOverText: 'you\'re gonna have to try a little harder than that.',

  setup(battle) {
    battle.flags.phase = 1;
    battle.flags.asleep = false;
    battle.flags.mercyOffered = false;
    battle.flags.dodges = 0;
  },

  acts: [],

  getFlavor(battle) {
    const f = battle.flags;
    if (f.asleep) return '* Sans is sleeping.\n* ...This is your chance.';
    if (f.mercyOffered && !f.mercyAnswered) return '* Sans is sparing you.';
    if (f.phase === 2) return pick(['* Sans is starting to look really tired.', '* Sans\'s eye is flickering.', '* Reading this doesn\'t seem like the best use of time.']);
    return pick(['* You feel like you\'re going to have a bad time.', '* Sans is waiting for your move.', '* Sans shrugs.', '* You felt your sins weighing on your neck.']);
  },

  onFight(battle) {
    if (battle.flags.asleep) return undefined;
    battle.flags.dodges += 1;
    if (battle.flags.mercyOffered) battle.flags.mercyAnswered = true;
    return 'miss';
  },

  onSpare(battle) {
    const f = battle.flags;
    if (f.mercyOffered && !f.mercyAnswered) {
      // the trap: the whole board fills with bones
      f.mercyAnswered = true;
      f.trap = true;
      showResult(battle, '* You spared Sans.\n* ...\n* heh. didn\'t think that would actually work, did ya?');
      return true;
    }
    showResult(battle, '* You spared Sans.\n* ...nothing happened.');
    return true;
  },

  victoryText() {
    return '* Sans didn\'t dodge this time.\n* "welp. i\'m going to grillby\'s."\n* YOU WON.';
  },

  getDialogue(battle, attack) {
    const f = battle.flags;
    if (attack.line) return attack.line;
    if (f.asleep) return null;
    const lines = [
      'what? you think i\'m just gonna stand there and take it?',
      'our reports showed a massive anomaly in the timespace continuum.',
      'heh. that\'s a nice look on you, kid.',
      'you can\'t understand how this feels.',
      'that\'s all you\'ve got? come on.',
      'all i can do is keep you here.',
      'let\'s just get to the point.',
      'here we go.'
    ];
    return lines[battle.turn % lines.length];
  },

  chooseAttack(battle) {
    const f = battle.flags;
    const t = battle.turn;
    if (f.trap) return SANS_ATTACKS.trap;
    if (t === 0) return SANS_ATTACKS.opening;
    if (t === 12 && !f.mercyOffered) {
      f.mercyOffered = true;
      return SANS_ATTACKS.mercyOffer;
    }
    if (f.mercyOffered && f.mercyAnswered && !f.surprised) {
      f.surprised = true;
      f.phase = 2;
      return SANS_ATTACKS.surprise;
    }
    if (f.finalDone) {
      return f.asleep ? SANS_ATTACKS.sleeping : SANS_ATTACKS.special;
    }
    if (f.phase === 2 && t >= 20) {
      f.finalDone = true;
      return SANS_ATTACKS.final;
    }
    const phase1 = ['boneLines', 'blueBones', 'randomBones', 'platformsLeft', 'platforms', 'slides', 'platformsRide', 'platformBeams'];
    const phase2 = ['slamCombo', 'beamStorm', 'boneLines', 'platformsRide', 'slamCombo', 'platformBeams', 'beamStorm', 'randomBones'];
    const list = f.phase === 1 ? phase1 : phase2;
    return SANS_ATTACKS[list[(t - 1) % list.length]];
  },

  // turns 13+: bones sweep across the command buttons while you choose (1 damage, no KARMA,
  // never below 1 HP). Move the cursor to another button to dodge them.
  updateMenuHazards(battle, dt) {
    const f = battle.flags;
    if (f.phase !== 2 || f.finalDone || battle.phase !== 'menu') {
      f.menuBones = [];
      return;
    }
    f.menuBones = f.menuBones || [];
    f.menuTimer = (f.menuTimer || 0) + dt;
    if (f.menuTimer > 1.7) {
      f.menuTimer = 0;
      const fromLeft = chance(0.5);
      const B = COMMAND_BUTTON_UT;
      f.menuBones.push({ x: fromLeft ? B.x - 20 : B.x + 4 * B.w + 3 * B.gap + 20, vx: fromLeft ? 230 : -230, hit: false });
    }
    const B = COMMAND_BUTTON_UT;
    const soulX = B.x + battle.command * (B.w + B.gap) + 14;
    for (const bone of f.menuBones) {
      bone.x += bone.vx * dt;
      if (!bone.hit && Math.abs(bone.x - soulX) < 8) {
        bone.hit = true;
        const p = state.player;
        if (p.hp > 1) p.hp -= 1;
        sfx.hurt();
        addShake(3);
      }
    }
    f.menuBones = f.menuBones.filter(b => b.x > -40 && b.x < VIEW_W + 40);
  },

  drawMenuHazards(battle) {
    const bones = battle.flags.menuBones;
    if (!bones || !bones.length) return;
    const B = COMMAND_BUTTON_UT;
    ctx.save();
    for (const bone of bones) drawBoneSprite(bone.x, B.y + B.h / 2, 8, B.h + 10, '#ffffff');
    ctx.restore();
  },

  onTurnEnd(battle) {
    // if the player never answered the offer, it is withdrawn after one turn
    if (battle.flags.mercyOffered && !battle.flags.mercyAnswered && battle.turn > 13) battle.flags.mercyAnswered = true;
  },

  attacks: []
});

// ---------------- Building blocks ----------------
function sansFloor(warnTime = 0.45, height = 26) {
  // red outline on the floor, then bones pop up there
  return spawn({
    kind: 'boneField', x: arena.x + arena.w / 2, y: arena.y + arena.h - height / 2, hw: arena.w / 2, hh: height / 2,
    warn: warnTime, activeFor: 0.55, noCull: true, karma: 2
  });
}

function sansWallBones(side, depth = 26, warn = 0.4, active = 0.55) {
  const box = { up: [arena.x, arena.y, arena.w, depth], down: [arena.x, arena.y + arena.h - depth, arena.w, depth],
    left: [arena.x, arena.y, depth, arena.h], right: [arena.x + arena.w - depth, arena.y, depth, arena.h] }[side];
  return spawn({
    kind: 'boneField', x: box[0] + box[2] / 2, y: box[1] + box[3] / 2, hw: box[2] / 2, hh: box[3] / 2,
    warn, activeFor: active, noCull: true, vertical: side === 'left' || side === 'right', karma: 2
  });
}

function sansBeam(x, y, angle, width, warn = 0.55, active = 0.4) {
  return spawnBeam(x, y, angle, width, warn, active, { karma: 3, emitter: 'blaster' });
}

// Beams along each edge of the board (the centre stays safe).
function beamsOnEdges() {
  const m = 17;
  sansBeam(arena.x + m, arena.y - 70, Math.PI / 2, 34);
  sansBeam(arena.x + arena.w - m, arena.y - 70, Math.PI / 2, 34);
  sansBeam(arena.x - 70, arena.y + m, 0, 34);
  sansBeam(arena.x - 70, arena.y + arena.h - m, 0, 34);
}

function beamsCross() {
  const a = Math.atan2(arena.h, arena.w);
  sansBeam(arena.x - 50, arena.y - 50 * Math.tan(a), a, 30);
  sansBeam(arena.x + arena.w + 50, arena.y - 50 * Math.tan(a), Math.PI - a, 30);
  sansBeam(arena.x - 50, arena.y + arena.h + 50 * Math.tan(a), -a, 30);
  sansBeam(arena.x + arena.w + 50, arena.y + arena.h + 50 * Math.tan(a), Math.PI + a, 30);
}

function beamAtSoul(width = 26) {
  const p = state.player;
  const c = arenaCenter();
  const angle = Math.random() * Math.PI * 2;
  const x = c.x + Math.cos(angle) * 190;
  const y = c.y + Math.sin(angle) * 150;
  sansBeam(x, y, Math.atan2(p.y - y, p.x - x), width, 0.5, 0.35);
}

// A pair of bones (short from the floor + long from the ceiling) to jump between.
function sansBonePair(dist, speed, floorH, gap = 44, fromLeft = false) {
  const x = fromLeft ? arena.x - 12 - dist : arena.x + arena.w + 12 + dist;
  const vx = fromLeft ? speed : -speed;
  floorBone(x, floorH, vx, { karma: 1 });
  const ceilingH = arena.h - floorH - gap;
  if (ceilingH > 8) ceilingBone(x, ceilingH, vx, { karma: 1 });
}

function sansPlatform(x, y, vx, w = 56) {
  return spawn({ kind: 'platform', platform: true, x, y, vx, hw: w / 2, hh: 4, noCull: true, maxLife: 14 });
}

const SANS_ATTACKS = {
  opening: {
    name: 'Strongest attack',
    duration: 9.4,
    box: { w: 140, h: 140 },
    soul: 'blue',
    line: 'it\'s a beautiful day... let\'s get this over with.',
    start(run) {
      run.data.events = [
        [0.05, () => { slamSoul('down'); sansFloor(0.5); }],
        [1.5, () => setSoulMode('red')],
        [1.6, () => {
          // a wall of bones from the left with one horizontal gap
          const gapY = arena.y + arena.h / 2 + rand(-20, 20);
          for (let i = 0; i < 12; i++) {
            const x = arena.x - 20 - i * 16;
            ceilingBone(x, gapY - 18 - arena.y, 230, { karma: 1 });
            floorBone(x, arena.y + arena.h - (gapY + 18), 230, { karma: 1 });
          }
        }],
        [3.9, beamsOnEdges],
        [5.1, beamsCross],
        [6.3, beamsOnEdges],
        [7.5, () => {
          sansBeam(arena.x - 70, arena.y + arena.h / 2, 0, arena.h - 40, 0.65, 0.45);
          sansBeam(arena.x + arena.w + 70, arena.y + arena.h / 2, Math.PI, arena.h - 40, 0.65, 0.45);
        }]
      ];
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },

  boneLines: {
    name: 'Bone lines',
    duration: 12.5,
    soul: 'blue',
    start(run) {
      // 8 lines from the right, then 8 from the left: short bones below, long ones above,
      // a small gap between them - eight small hops each way
      const speed = 190 + run.level * 15;
      for (let i = 0; i < 8; i++) sansBonePair(i * 105, speed, 16 + (i % 2) * 6, 52);
      for (let i = 0; i < 8; i++) sansBonePair(1100 + i * 105, speed, 16 + (i % 2) * 6, 52, true);
    },
    update() {}
  },

  blueBones: {
    name: 'Blue bones',
    duration: 8,
    soul: 'blue',
    start(run) {
      const speed = 170;
      // left: long cyan then short white; right: short white then long cyan
      for (let i = 0; i < 6; i++) {
        floorBone(arena.x - 12 - i * 130, arena.h - 10, speed, { color: 'cyan', karma: 1 });
        floorBone(arena.x - 12 - i * 130 - 60, 18, speed, { karma: 1 });
      }
      for (let i = 0; i < 6; i++) {
        floorBone(arena.x + arena.w + 12 + i * 130 + 65, 18, -speed, { karma: 1 });
        floorBone(arena.x + arena.w + 12 + i * 130 + 125, arena.h - 10, -speed, { color: 'cyan', karma: 1 });
      }
    },
    update() {}
  },

  randomBones: {
    name: 'Random bones',
    duration: 7,
    soul: 'blue',
    update(run) {
      every(run, 'pair', 0.75, () => {
        const fromLeft = chance(0.5);
        sansBonePair(0, rand(150, 260), randInt(14, 40), rand(42, 60), fromLeft);
      }, 0.2);
    }
  },

  platforms: {
    name: 'Platforms',
    duration: 9,
    soul: 'blue',
    box: { w: 380, h: 128 },
    start(run) {
      // a sea of short bones; ride the platforms across
      for (let x = arena.x + 8; x < arena.x + arena.w; x += 12) floorBone(x, 18, 0, { karma: 1, maxLife: 20 });
      // spawn one platform under the SOUL so it can land
      const p = state.player;
      p.y = arena.y + arena.h - 60;
      sansPlatform(p.x, arena.y + arena.h - 46, -40, 70);
      run.data.alt = 0;
    },
    update(run) {
      every(run, 'plat', 1.0, () => {
        run.data.alt++;
        const y = arena.y + arena.h - (run.data.alt % 2 ? 46 : 76);
        sansPlatform(arena.x + arena.w + 34, y, -70, 56);
      }, 0.6);
      every(run, 'top', 2.2, () => {
        // bones hanging from the top force short hops
        ceilingBone(arena.x + arena.w + 12, arena.h - 92, -70, { karma: 1 });
      }, 1.5);
    }
  },

  slides: {
    name: 'Bone slides',
    duration: 7,
    soul: 'red',
    update(run) {
      every(run, 'slide', 0.9, () => {
        // small bones from the bottom-left, big ones from the top-right
        const fromLeft = run.data.left = !run.data.left;
        if (fromLeft) {
          floorBone(arena.x - 12, arena.h * 0.45, 210, { karma: 1 });
        } else {
          ceilingBone(arena.x + arena.w + 12, arena.h * 0.55, -210, { karma: 1 });
        }
      }, 0.2);
      every(run, 'rise', 1.8, () => {
        lyingBone(arena.x + arena.w / 2, arena.y + arena.h + 10, arena.w * 0.7, 0, -120, { karma: 1 });
      }, 1.2);
    }
  },

  // Platforms 1: three platforms come from the left over a sea of bones; bones wait above the
  // third one and a long bone comes down at the end.
  platformsLeft: {
    name: 'Platforms over the bones',
    duration: 9,
    soul: 'blue',
    box: { w: 380, h: 128 },
    start(run) {
      for (let x = arena.x + 8; x < arena.x + arena.w; x += 12) floorBone(x, 18, 0, { karma: 1, maxLife: 20 });
      const p = state.player;
      p.x = arena.x + 40;
      p.y = arena.y + arena.h - 60;
      sansPlatform(arena.x + 40, arena.y + arena.h - 46, 34, 70);
      run.data.events = [
        [1.2, () => sansPlatform(arena.x - 40, arena.y + arena.h - 70, 60, 64)],
        [2.6, () => {
          sansPlatform(arena.x - 40, arena.y + arena.h - 52, 60, 64);
          // three bones hanging just above the third platform: hop low
          for (let i = 0; i < 3; i++) ceilingBone(arena.x - 60 + i * 20, arena.h - 92, 60, { karma: 1 });
        }],
        [6.4, () => ceilingBone(arena.x + arena.w * 0.7, 10, 0, {
          karma: 1,
          update(b, dt) { if (b.hh * 2 < arena.h - 30) { b.hh += 60 * dt; b.y = arena.y + b.hh; } }
        })]
      ];
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },

  // Platforms 4: ride a small platform that drifts left and right over a sea of bones while
  // three rows of floating bones close in - the middle row sinks, the outer rows rise.
  platformsRide: {
    name: 'Riding the platform',
    duration: 9,
    soul: 'blue',
    box: { w: 380, h: 136 },
    start(run) {
      for (let x = arena.x + 8; x < arena.x + arena.w; x += 12) floorBone(x, 18, 0, { karma: 1, maxLife: 20 });
      const p = state.player;
      p.x = arena.x + arena.w / 2;
      p.y = arena.y + arena.h - 64;
      const left = arena.x + 40;
      const right = arena.x + arena.w - 40;
      sansPlatform(p.x, arena.y + arena.h - 46, 70, 64).update = (b) => {
        if (b.x > right) b.vx = -Math.abs(b.vx);
        if (b.x < left) b.vx = Math.abs(b.vx);
      };
      const rows = [
        { x: arena.x + 50, dir: -1 },
        { x: arena.x + arena.w / 2, dir: 1 },
        { x: arena.x + arena.w - 50, dir: -1 }
      ];
      for (const row of rows) {
        for (let i = -1; i <= 1; i++) {
          spawnBone({
            x: row.x + i * 14, y: arena.y + arena.h / 2 - 20, hw: 4, hh: 14, karma: 1, noCull: true, maxLife: 20,
            update(b, dt) {
              const speed = 9 + run.level * 2;
              b.y += row.dir * speed * dt;
              b.y = Math.max(arena.y + 16, Math.min(arena.y + arena.h - 48, b.y));
            }
          });
        }
      }
    },
    update() {}
  },

  platformBeams: {
    name: 'Platforms and beams',
    duration: 9,
    soul: 'blue',
    box: { w: 380, h: 128 },
    start(run) {
      for (let x = arena.x + 8; x < arena.x + arena.w; x += 12) floorBone(x, 18, 0, { karma: 1, maxLife: 20 });
      const p = state.player;
      p.y = arena.y + arena.h - 60;
      sansPlatform(p.x, arena.y + arena.h - 46, 0, 90);
      sansPlatform(arena.x + 50, arena.y + arena.h - 82, 30, 70);
      sansPlatform(arena.x + arena.w - 50, arena.y + arena.h - 82, -30, 70);
    },
    update(run) {
      every(run, 'beam', 1.4, () => {
        // thin beams above or below the platforms
        const high = chance(0.5);
        const y = high ? arena.y + 18 : arena.y + arena.h - 64;
        const fromLeft = chance(0.5);
        sansBeam(fromLeft ? arena.x - 60 : arena.x + arena.w + 60, y, fromLeft ? 0 : Math.PI, 22);
      }, 1);
      every(run, 'plat', 2.6, () => sansPlatform(arena.x + arena.w + 40, arena.y + arena.h - 46, -50, 70), 2.6);
    }
  },

  slamCombo: {
    name: 'Gravity slams',
    duration: 8,
    soul: 'blue',
    update(run) {
      every(run, 'slam', 1.1, () => {
        const side = pick(['down', 'up', 'left', 'right']);
        slamSoul(side);
        sansWallBones(side, 26, 0.4, 0.5);
      }, 0.2);
    }
  },

  beamStorm: {
    name: 'Beam storm',
    duration: 7,
    soul: 'red',
    update(run) {
      every(run, 'beam', 0.6, () => beamAtSoul(26), 0.3);
      every(run, 'bones', 1.5, () => sansBonePair(0, 220, 30, 70, chance(0.5)), 0.8);
    }
  },

  mercyOffer: {
    name: 'A break',
    duration: 1.2,
    line: 'listen... i know you didn\'t mean it. let\'s just be pals. come on, spare me.',
    update() {}
  },

  surprise: {
    name: 'Surprise',
    duration: 6,
    box: { w: 150, h: 150 },
    soul: 'blue',
    line: 'heh. guess you\'re not a fan of second chances.',
    start(run) {
      run.data.events = [
        [0.1, () => { slamSoul('down'); sansWallBones('down', 30, 0.35, 0.5); }],
        [1.0, () => { slamSoul('up'); sansWallBones('up', 30, 0.35, 0.5); }],
        [1.9, () => { slamSoul('left'); sansWallBones('left', 30, 0.35, 0.5); }],
        [2.8, () => { slamSoul('right'); sansWallBones('right', 30, 0.35, 0.5); }],
        [3.7, () => { setSoulMode('red'); beamsCross(); }],
        [4.8, beamsOnEdges]
      ];
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },

  trap: {
    name: 'Dunk',
    duration: 3,
    line: 'should\'ve seen that coming.',
    start() {
      const zone = sansFloor(0.2, arena.h);
      zone.damage = 99;
      zone.karma = 0;
    },
    update() {}
  },

  final: {
    name: 'Final attack',
    duration: 26,
    box: { w: 150, h: 150 },
    soul: 'blue',
    line: 'ready? here comes my special attack.',
    start(run) {
      run.data.events = [];
      // a huge bone array to open with: lines from both sides, faster and faster
      for (let i = 0; i < 10; i++) {
        run.data.events.push([0.2 + i * 0.32, () => sansBonePair(0, 260 + i * 8, 16 + (i % 3) * 8, 50, i % 2 === 0)]);
      }
    },
    update(run) {
      timeline(run, run.data.events);
      if (run.t < 3.8) return;
      // slams take 1 HP each and never kill
      every(run, 'slam', 0.75, () => {
        const side = pick(['down', 'up', 'left', 'right']);
        slamSoul(side);
        const p = state.player;
        if (p.hp > 1) p.hp -= 1;
        sansWallBones(side, 22, 0.35, 0.4);
      }, 0.3);
      if (run.t > 10) every(run, 'beam', 0.9, () => beamAtSoul(30), 0);
      if (run.t > 17) every(run, 'cross', 2.2, beamsCross, 0);
    }
  },

  // The "special attack": Sans just stalls. Wait for him to fall asleep, then push the board
  // left (onto the FIGHT column) and down (onto the FIGHT button). Pushing while he is awake
  // wakes him: the SOUL snaps back to the middle and the board goes back.
  special: {
    name: 'Special attack',
    duration: 600,
    soul: 'red',
    quiet: true,
    box: { w: 120, h: 96 },
    line: 'so, uh... you\'re not getting a turn. ever.',
    start(run) {
      run.data.home = { x: arena.x, y: arena.y };
      run.data.sleep = 0;
      run.data.stage = 0;
      run.data.talk = 0;
    },
    update(run, dt) {
      const d = run.data;
      const battle = run.battle;
      const p = state.player;
      d.sleep += dt;
      const asleep = d.sleep > 8;
      if (battle) battle.flags.dozing = asleep;

      // he keeps talking while he stalls
      const lines = ['i\'m not gonna attack. i\'m just gonna stand here.', 'you\'ll get bored and quit eventually.', 'heh... any minute now...', 'zzz...'];
      const lineIndex = Math.min(lines.length - 1, Math.floor(d.sleep / 2.6));
      if (battle && d.talk !== lineIndex + 1) {
        d.talk = lineIndex + 1;
        battle.bubble = createTyper(lines[lineIndex], bubbleRect(battle).w - 24, BUBBLE_FONT);
      }

      const pushLeft = isHeld(LEFT_KEYS) && p.x - p.r <= arena.x + 2;
      const pushDown = isHeld(DOWN_KEYS) && p.y + p.r >= arena.y + arena.h - 2;
      if ((pushLeft || pushDown) && !asleep) {
        // caught: back to the middle, and he is wide awake again
        arena.x = d.home.x;
        arena.y = d.home.y;
        p.x = arena.x + arena.w / 2;
        p.y = arena.y + arena.h / 2;
        d.sleep = 0;
        d.stage = 0;
        d.talk = 0;
        sfx.warn();
        addFlash(0.4);
        return;
      }
      const B = COMMAND_BUTTON_UT;
      if (d.stage === 0 && pushLeft) {
        arena.x -= 45 * dt;
        if (arena.x <= B.x + 10) {
          arena.x = B.x + 10;
          d.stage = 1;
        }
      } else if (d.stage === 1 && pushDown) {
        arena.y += 45 * dt;
        if (arena.y + arena.h >= B.y + B.h / 2) {
          // the board is on FIGHT: attack!
          if (battle) battle.flags.asleep = true;
          run.done = true;
        }
      }
    }
  },

  sleeping: {
    name: '...',
    duration: 0.8,
    quiet: true,
    line: 'zzz...',
    update() {}
  }
};

BULLET_DRAWERS.boneField = b => {
  const x = b.x - b.hw;
  const y = b.y - b.hh;
  if (b.life < b.warn) {
    ctx.strokeStyle = Math.floor(b.life * 14) % 2 === 0 ? '#ff2020' : '#901010';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, b.hw * 2 - 2, b.hh * 2 - 2);
    return;
  }
  // a row of bones filling the zone
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, b.hw * 2, b.hh * 2);
  ctx.clip();
  if (b.vertical) {
    for (let yy = y + 6; yy < y + b.hh * 2; yy += 12) (ctx.save(), ctx.translate(b.x, yy), ctx.rotate(Math.PI / 2), drawBoneSprite(0, 0, 8, b.hw * 2 - 8, '#fff'), ctx.restore());
  } else {
    for (let xx = x + 6; xx < x + b.hw * 2; xx += 12) {
      ctx.save();
      drawBoneSprite(xx, b.y, 8, b.hh * 2 - 8, '#fff');
      ctx.restore();
    }
  }
  ctx.restore();
};

BULLET_DRAWERS.platform = b => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
  ctx.fillStyle = '#22d022';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, 2);
};

// The regular attacks (survival mode plays these back to back); the scripted ones
// (mercy offer, trap, sleeping) are only picked by chooseAttack().
Sans.attacks = ['opening', 'boneLines', 'blueBones', 'randomBones', 'platformsLeft', 'platforms', 'slides', 'platformsRide',
  'platformBeams', 'slamCombo', 'beamStorm', 'surprise', 'final'].map(id => SANS_ATTACKS[id]);
