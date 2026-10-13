// Spamton NEO - Deltarune Chapter 2, secret boss.
// Reference: the SOUL turns YELLOW and faces him (right). Tap Z for small shots, hold and
// release for a BIG SHOT, which destroys sturdier things. Attacks: flying heads that dash at
// the SOUL lane by lane (shoot them for TP), mail trucks (BIG SHOT them), a chained heart that
// swings and fires diamonds (destroying it raises MERCY), pipis that bounce and burst into
// little heads, phones gripping the board's edges while a head creeps closer, and a face
// whose eyes, nose and mouth must be shot apart. At 30 % HP / 70 % MERCY it switches to the
// final set ending with POWER OF NEO. Snap his wires (ACT) to spare him.
// (HP and MERCY values are scaled for a one-person party.)

const SpamtonNeo = registerBoss({
  id: 'spamton_neo',
  name: 'Spamton NEO',
  game: 'deltarune',
  color: '#ffd84d',
  emblem: 'phone',

  player: { name: 'SUSIE', maxHp: 160, power: 46 },
  items: ['darkCandy', 'darkCandy', 'clubsSandwich', 'clubsSandwich', 'topCake', 'reviveMint'],
  maxHp: 900,
  attack: 26,
  defense: 0,
  checkAttack: 13,
  checkDefense: 0,
  gold: 0,
  box: { w: 250, h: 125 },
  check: 'A BIG SHOT with strings attached. Snap the wires to free him.',
  intro: '* SPAMTON NEO is here to make you a DEAL!',
  flavor: [
    '* Spamton NEO is laughing on a loop.',
    '* Smells like a [[Cheap Bargain]].',
    '* The wires above him creak.',
    '* Phone lines ring with no one on the other end.'
  ],

  setup(battle) {
    battle.flags.step = 0;
    battle.flags.final = false;
    battle.flags.neoUsed = false;
    battle.flags.wires = 6;
  },

  statusText(battle) {
    return `WIRES ${'|'.repeat(battle.flags.wires)}`;
  },

  acts: [
    {
      name: 'Snap',
      description: 'Snap one of his wires. (+MERCY)',
      use(battle) {
        spamtonSnap(battle, 14);
        return '* Susie yanked one of the wires!\n* Spamton NEO\'s strings loosened.';
      }
    },
    {
      name: 'SnapAll',
      tp: 50,
      description: 'Snap several wires at once.',
      use(battle) {
        spamtonSnap(battle, 32);
        return '* Susie tore at all the wires at once!\n* Spamton NEO is barely hanging on!';
      }
    }
  ],

  onSpare(battle) {
    if (isSpareable(battle)) {
      winBattle(battle, 'spared', '* Susie cut the last wire.\n* Spamton fell... and thanked you, sort of.\n* YOU WON! You got the DEALMAKER.');
      return true;
    }
    return false;
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Spamton NEO tried to become [[Something Bigger]]...\n* ...and blew apart. He left behind a PUPPETSCARF.\n* YOU WON!';
    return null;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick([
      'HEY HEY HEY! IT\'S TIME FOR A [[Limited Time Offer]]!',
      'DON\'T YOU WANT TO BE A [[Big Shot]]!?',
      'NOW\'S YOUR CHANCE TO [[Click Here]]!',
      'KRIS! KRIS! WHERE\'S KRIS!? [[Never mind]]!',
      'I\'M [[Number 1 Rated Salesman]]!'
    ]);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    const hp = battle.bossHp / this.maxHp;
    // reaching 10 % HP or 90 % MERCY triggers POWER OF NEO right away
    if (!f.neoUsed && (hp <= 0.1 || battle.mercy >= 90)) {
      f.neoUsed = true;
      return NEO_ATTACKS.powerOfNeo;
    }
    if (!f.final && (hp <= 0.3 || battle.mercy >= 70)) {
      f.final = true;
      f.step = 0;
    }
    const opening = ['heads', 'mail', 'heart', 'pipis', 'phones', 'face', 'heart2'];
    const loop = ['heads2', 'face', 'phones', 'pipis2', 'mail2'];
    const finale = f.neoUsed ? ['heart3', 'face', 'powerOfNeo'] : ['heart3', 'callForMe', 'powerOfNeo'];
    let id;
    if (f.final) id = finale[f.step++ % finale.length];
    else if (f.step < opening.length) id = opening[f.step++];
    else id = loop[(f.step++ - opening.length) % loop.length];
    if (id === 'powerOfNeo') f.neoUsed = true;
    return NEO_ATTACKS[id];
  },

  // POWER OF NEO: the screen goes dark around the board, with flashing words in the corners
  drawArenaOverlay(box) {
    const run = state.battle && state.battle.attack;
    if (!run || run.attack !== NEO_ATTACKS.powerOfNeo) return;
    const k = run.data.dark || 0;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.75 * k})`;
    ctx.fillRect(0, 0, VIEW_W, box.y - 4);
    ctx.fillRect(0, box.y + box.h + 4, VIEW_W, VIEW_H - box.y - box.h - 4);
    ctx.fillRect(0, box.y - 4, box.x - 4, box.h + 8);
    ctx.fillRect(box.x + box.w + 4, box.y - 4, VIEW_W - box.x - box.w - 4, box.h + 8);
    const words = ['WRECK', 'PAUSE', 'SPEW', '[[BIG SHOT]]'];
    const spots = [[24, 30], [VIEW_W - 24, 30], [24, VIEW_H - 70], [VIEW_W - 24, VIEW_H - 70]];
    ctx.font = `bold 22px ${TITLE_FAMILY}`;
    spots.forEach(([x, y], i) => {
      if (Math.floor(run.t * 3 + i) % 3 === 0) return;
      ctx.textAlign = i % 2 ? 'right' : 'left';
      ctx.fillStyle = i % 2 ? '#ff6be2' : '#ffe84d';
      ctx.fillText(words[(i + Math.floor(run.t)) % words.length], x, y);
    });
    // smoke drifting up from the bottom corners
    for (let i = 0; i < 10; i++) {
      const t = (run.t * 0.4 + i * 0.1) % 1;
      const x = i % 2 ? VIEW_W - 40 - i * 4 : 40 + i * 4;
      ctx.fillStyle = `rgba(160, 160, 160, ${0.25 * (1 - t) * k})`;
      fillCircle(x + Math.sin(t * 6 + i) * 10, VIEW_H - 60 - t * 120, 10 + t * 18);
    }
    ctx.restore();
  },

  attacks: []
});

function spamtonSnap(battle, amount) {
  const before = battle.flags.wires;
  addMercy(battle, amount);
  battle.flags.wires = Math.max(1, 6 - Math.floor(battle.mercy / 17));
  if (battle.flags.wires < before) sfx.slash();
}

function neoTp(amount) {
  if (state.battle) state.battle.tp = Math.min(100, state.battle.tp + amount);
}

function neoMercyOrDamage(percent) {
  const battle = state.battle;
  if (!battle) return;
  const at = bossPosition(battle.boss);
  if (battle.bossHp >= battle.boss.maxHp) {
    // he hasn't been hurt: it counts as mercy, but can never fill it completely
    const amount = Math.min(percent, 99 - battle.mercy);
    if (amount > 0) addMercy(battle, amount);
  } else {
    const damage = Math.max(1, Math.round(battle.boss.maxHp * percent / 100));
    battle.bossHp = Math.max(1, battle.bossHp - damage);
    addPopup(damage, at.x, at.y - 10, '#ff4fd8');
  }
}

// A head that flies in, aims at the SOUL's lane, then dashes left. Shoot it for TP.
function neoHead(y, delay, options = {}) {
  return spawn({
    kind: 'neoHead', x: arena.x + arena.w + 40, y, r: 11, hw: 12, hh: 11, noCull: true, maxLife: 6, shootHp: 2,
    onDestroyed: () => neoTp(3),
    update(b, dt) {
      if (b.life < delay) return;
      const t = b.life - delay;
      if (t < 0.45) {
        b.x += (arena.x + arena.w - 30 - b.x) * Math.min(1, dt * 10);
        b.y += (state.player.y - b.y) * Math.min(1, dt * (options.track ? 6 : 0));
        b.aiming = true;
        if (options.shoots && t > 0.3 && !b.fired) {
          b.fired = true;
          for (const off of [-0.2, 0, 0.2]) {
            const v = aimAt(b.x, b.y, 170, off);
            spawn({ kind: 'suit', suit: 'diamond', x: b.x, y: b.y, vx: v.vx, vy: v.vy, r: 5, color: '#ff6be2', maxLife: 4, faceVelocity: true });
          }
        }
      } else {
        b.aiming = false;
        b.x -= (options.speed || 380) * dt;
        // heads you didn't shoot spit a bullet at you on the way past
        if (!b.spat && b.x < arena.x + arena.w * 0.6) {
          b.spat = true;
          const v = aimAt(b.x, b.y, 200);
          spawn({ kind: 'normal', x: b.x, y: b.y, vx: v.vx, vy: v.vy, r: 4, color: '#ff6be2', maxLife: 3 });
        }
      }
    }
  });
}

const NEO_ATTACKS = {
  heads: {
    name: 'Flying heads', duration: 6.5,
    start(run) {
      for (let i = 0; i < 4; i++) neoHead(arena.y + 30 + i * 37, 0.4 + i * 1.1, { track: true });
    },
    update() {}
  },
  heads2: {
    name: 'Flying heads II', duration: 7,
    start(run) {
      for (let i = 0; i < 6; i++) neoHead(arena.y + rand(20, arena.h - 20), 0.3 + i * 0.8, { track: true, shoots: true, speed: 420 });
    },
    update(run) {
      // the arm cannon fires big bullets
      every(run, 'cannon', 1.6, () => {
        const y = state.player.y;
        spawn({ kind: 'normal', x: arena.x + arena.w + 20, y, vx: -260, r: 12, warn: 0.3, color: '#ffffff', noCull: true, maxLife: 3,
          update(b, dt) { if (b.life >= b.warn) b.x += b.vx * dt; } });
      }, 1.2);
    }
  },
  mail: {
    name: 'Spam mail', duration: 7,
    update(run) {
      every(run, 'truck', 1.25 / run.speed, () => neoTruck(150 * run.speed, run.data.mailBomb = !run.data.mailBomb), 0.2);
    }
  },
  mail2: {
    name: 'Spam mail II', duration: 7.5,
    update(run) {
      every(run, 'truck', 0.85 / run.speed, () => neoTruck(200 * run.speed, chance(0.4)), 0.2);
    }
  },
  heart: {
    name: 'A heart attack', duration: 7,
    line: 'MY HEART GOES OUT TO YOU! [[Literally]]!',
    start(run) {
      neoHeart(run, 0);
    },
    update(run) {
      neoHeartFire(run);
    }
  },
  heart2: {
    name: 'A heart attack II', duration: 7.5,
    start(run) {
      neoHeart(run, 2);
    },
    update(run) {
      neoHeartFire(run);
    }
  },
  heart3: {
    name: 'A heart attack III', duration: 8,
    start(run) {
      neoHeart(run, 4);
    },
    update(run) {
      neoHeartFire(run);
    }
  },
  pipis: {
    name: 'A call for you', duration: 7,
    line: 'IT\'S FOR YOU! [[Pipis]] DELIVERY!',
    update(run) {
      every(run, 'pipis', 1.6, () => neoPipis(), 0.3);
    }
  },
  pipis2: {
    name: 'A call for you II', duration: 7.5,
    update(run) {
      every(run, 'pipis', 1.5, () => {
        neoPipis();
        neoPipis();
      }, 0.3);
    }
  },
  phones: {
    name: 'Gripping phones', duration: 8,
    start(run) {
      // a head creeps in from the right; BIG SHOTs push it back
      run.data.head = spawn({
        kind: 'neoHead', big: true, x: arena.x + arena.w + 30, y: arena.y + arena.h / 2, r: 22, hw: 22, hh: 20, noCull: true,
        shootHp: 9999, bigOnly: true,
        update(b, dt) {
          b.x -= 24 * dt;
          b.y += (state.player.y - b.y) * Math.min(1, dt * 1.5);
        }
      });
      run.data.head.onShot = null;
    },
    update(run) {
      const head = run.data.head;
      // shots hitting the head push it back instead of hurting it
      if (head.shootHp < 9999) {
        head.x = Math.min(arena.x + arena.w + 30, head.x + (9999 - head.shootHp) * 14);
        head.shootHp = 9999;
      }
      // the creeping head fires big bullets that burst
      every(run, 'headShot', 1.7, () => {
        if (head.dead) return;
        spawn({
          kind: 'normal', x: head.x - 20, y: head.y, vx: -150, vy: 0, r: 10, color: '#ffffff', noCull: true, maxLife: 3,
          update(b, dt) {
            b.x += b.vx * dt;
            if (!b.burst && b.x < arena.x + arena.w * 0.45) {
              b.burst = true;
              b.dead = true;
              spawnRing(b.x, b.y, 8, 130, 4, 'normal', Math.random(), { color: '#ffffff', maxLife: 3 });
            }
          }
        });
      }, 1);
      every(run, 'phone', 1.15, () => {
        const top = chance(0.5);
        const x = rand(arena.x + 30, arena.x + arena.w - 60);
        const y = top ? arena.y - 4 : arena.y + arena.h + 4;
        spawn({ kind: 'phone', x, y, r: 10, harmless: true, noCull: true, maxLife: 1.1, clip: false, top });
        // the phone fires a big bullet that bursts
        spawn({
          kind: 'normal', x, y: top ? arena.y + 10 : arena.y + arena.h - 10, vx: 0, vy: (top ? 1 : -1) * 150, r: 9, warn: 0.35,
          color: '#ffe84d', noCull: true, maxLife: 3,
          update(b, dt) {
            if (b.life < b.warn) return;
            b.y += b.vy * dt;
            if (!b.burst && b.life > b.warn + 0.55) {
              b.burst = true;
              b.dead = true;
              spawnRing(b.x, b.y, 6, 140, 4, 'normal', Math.random(), { color: '#ffe84d', maxLife: 3 });
            }
          }
        });
      }, 0.4);
    }
  },
  face: {
    name: 'Eyes, nose and mouth', duration: 9,
    box: { w: 220, h: 170, offsetX: -40 },
    start(run) {
      // the face sits on its own board on the right; shoot its parts apart
      const x = arena.x + arena.w + 70;
      run.data.parts = [
        { name: 'eyeL', y: arena.y + 40 },
        { name: 'nose', y: arena.y + arena.h / 2 },
        { name: 'mouth', y: arena.y + arena.h - 40 }
      ].map(part => spawn({
        kind: 'facePart', part: part.name, x, y: part.y, r: 16, hw: 16, hh: 14, harmless: true, noCull: true, clip: false,
        shootHp: 16, onDestroyed: () => neoTp(4)
      }));
    },
    update(run) {
      const alive = run.data.parts.filter(p => !p.dead);
      if (!alive.length) {
        // all three destroyed: they come back
        run.data.parts.forEach(p => {
          p.dead = false;
          p.shootHp = 16;
          if (!state.bullets.includes(p)) state.bullets.push(p);
        });
        neoMercyOrDamage(3);
      }
      every(run, 'fire', 0.7 / run.speed, () => {
        const shooter = pick(run.data.parts.filter(p => !p.dead));
        if (!shooter) return;
        if (shooter.part === 'mouth') {
          neoHead(shooter.y, 0, { speed: 300 }).x = shooter.x - 30;
        } else {
          const v = aimAt(shooter.x - 20, shooter.y, 200);
          spawn({ kind: 'normal', x: shooter.x - 20, y: shooter.y, vx: v.vx, vy: v.vy, r: 5, color: '#ff6be2', maxLife: 4, clip: false });
        }
      }, 0.4);
    }
  },
  callForMe: {
    name: 'A call for me', duration: 3.5,
    line: 'HOLD ON, I\'VE GOT A [[Call on line 2]]!',
    update(run) {
      // harmless: little heads fly at him instead
      every(run, 'mini', 0.25, () => {
        spawn({ kind: 'neoHead', x: arena.x - 10, y: rand(arena.y + 15, arena.y + arena.h - 15), vx: 260, r: 6, hw: 6, hh: 6, harmless: true, clip: false, maxLife: 3 });
      }, 0);
    }
  },
  powerOfNeo: {
    name: 'POWER OF NEO', duration: 11,
    line: 'NOW I\'M A [[BIG SHOT]]! WITNESS THE POWER OF NEO!',
    start(run) {
      run.data.events = [
        [0, () => { run.data.inhale = true; }],
        [2.2, () => { run.data.inhale = false; }],
        [2.4, () => neoFaceWave(0)],
        [3.6, () => neoFaceWave(1)],
        [4.8, () => neoFaceWave(0)],
        [6.0, () => neoFaceWave(1)],
        [7.4, () => neoWall()]
      ];
    },
    update(run, dt) {
      timeline(run, run.data.events);
      run.data.dark = Math.min(1, run.t / 0.6);
      if (run.data.inhale) {
        // everything is pulled towards him
        const p = state.player;
        p.x = Math.min(arena.x + arena.w - p.r, p.x + 70 * dt);
        every(run, 'debris', 0.08, () => spawn({ kind: 'normal', x: arena.x - 5, y: rand(arena.y + 8, arena.y + arena.h - 8), vx: 420, r: 3, harmless: true, color: '#777', maxLife: 2 }), 0);
      }
      if (run.t > 10.6 && !run.data.ended) {
        run.data.ended = true;
        neoMercyOrDamage(5);
      }
    }
  }
};

function neoTruck(speed, withBomb) {
  const lane = randInt(0, 2);
  const y = arena.y + 30 + lane * ((arena.h - 60) / 2);
  const truck = spawn({ kind: 'truck', x: arena.x + arena.w + 40, y, vx: -speed, hw: 26, hh: 14, noCull: true, maxLife: 6, shootHp: 4, bigOnly: true });
  // a tower of mail on top; the head on it can be shot
  spawn({ kind: 'neoHead', x: truck.x, y: y - 26, vx: -speed, r: 9, hw: 10, hh: 9, noCull: true, maxLife: 6, shootHp: 2, onDestroyed: () => neoTp(2) });
  if (withBomb) {
    spawn({
      kind: 'bomb', x: truck.x + 34, y, vx: -speed, r: 9, noCull: true, maxLife: 6, fuse: 99, shootHp: 1,
      update(b, dt) { b.x += b.vx * dt; },
      onDestroyed: b => spawnRing(b.x, b.y, 8, 150, 4, 'normal', 0, { color: '#ffe84d', maxLife: 3 })
    });
  }
}

function neoHeart(run, level) {
  const x = arena.x + arena.w - 40;
  const heart = spawn({
    kind: 'neoHeart', suit: 'heart', x, y: arena.y + arena.h / 2, r: 15, color: '#ff4fa3', noCull: true, shootHp: 12 + level * 2,
    faceVelocity: false, chained: true, clip: false,
    onDestroyed: () => neoMercyOrDamage(8),
    update(b) {
      b.y = arena.y + arena.h / 2 + Math.sin(b.life * 1.8) * (arena.h / 2 - 24);
      b.x = x - Math.abs(Math.sin(b.life * 0.9)) * (40 + level * 10);
    }
  });
  run.data.heart = heart;
  run.data.level = level;
}

// The heart fires diamonds at the SOUL while it swings.
function neoHeartFire(run) {
  const heart = run.data.heart;
  const level = run.data.level;
  every(run, 'diamonds', Math.max(0.28, 0.5 - level * 0.05), () => {
    if (heart.dead) return;
    for (const off of level >= 2 ? [-0.25, 0.25] : [0]) {
      const v = aimAt(heart.x, heart.y, 190 + level * 15, off);
      spawn({ kind: 'suit', suit: 'diamond', x: heart.x, y: heart.y, vx: v.vx, vy: v.vy, r: 5, color: '#ff6be2', maxLife: 4, faceVelocity: true });
    }
    // later versions add small optional hearts
    if (level >= 2 && chance(0.25)) {
      spawn({ kind: 'suit', suit: 'heart', x: heart.x, y: heart.y, vx: -120, vy: rand(-40, 40), r: 8, color: '#ff8fc4', shootHp: 2, maxLife: 4, faceVelocity: false, onDestroyed: () => neoTp(2) });
    }
  }, 0.6);
}

function neoPipis() {
  // a bouncing egg; when it lands it bursts into little heads
  const x = arena.x + arena.w + 20;
  const y = arena.y + rand(20, 60);
  spawn({
    kind: 'pipis', x, y, vx: rand(-170, -120), vy: rand(-40, 40), r: 10, noCull: true, maxLife: 6, shootHp: 3, color: '#5ec8ff',
    onDestroyed: () => neoTp(3),
    update(b, dt) {
      b.vy += 380 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y > arena.y + arena.h - b.r) {
        b.dead = true;
        addBurst(b.x, b.y, '#5ec8ff', 8, 80);
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + rand(-1.1, 1.1);
          spawn({ kind: 'neoHead', x: b.x, y: b.y - 8, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 5, hw: 5, hh: 5, maxLife: 3 });
        }
      }
    }
  });
}

function neoFaceWave(variant) {
  const count = 5;
  for (let i = 0; i < count; i++) {
    if ((i + variant) % 2 === 0) continue;
    const y = arena.y + (arena.h * (i + 0.5)) / count;
    spawn({ kind: 'neoHead', big: true, x: arena.x + arena.w + 30, y, vx: -230, r: 16, hw: 17, hh: 15, noCull: true, maxLife: 4, warn: 0.35 });
  }
}

function neoWall() {
  // a board-tall explosive bullet: BIG SHOT it before it reaches you
  spawn({
    kind: 'truck', wall: true, x: arena.x + arena.w + 20, y: arena.y + arena.h / 2, vx: -70, hw: 14, hh: arena.h / 2 - 2, noCull: true,
    maxLife: 10, shootHp: 16, bigOnly: true,
    onDestroyed: b => {
      addShake(8);
      spawnRing(b.x, b.y, 10, 160, 4, 'normal', 0, { color: '#ffe84d', maxLife: 3 });
    }
  });
}

SpamtonNeo.attacks = Object.values(NEO_ATTACKS).filter(a => a !== NEO_ATTACKS.callForMe);
SpamtonNeo.attacks.forEach(a => {
  a.soul = 'yellow';
  a.soulOptions = { facing: 'right', bigShot: true };
});
NEO_ATTACKS.callForMe.soul = 'yellow';
NEO_ATTACKS.callForMe.soulOptions = { facing: 'right', bigShot: true };

// ---------------- Drawing (generic shapes) ----------------
BULLET_DRAWERS.neoHead = b => {
  // a generic grinning puppet-head token
  ctx.translate(b.x, b.y);
  const s = (b.hw || b.r) / 12;
  ctx.scale(s, s);
  ctx.fillStyle = b.aiming ? '#ffe0f3' : '#f2f2f2';
  fillRoundRect(-12, -11, 24, 22, 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(-8, -4, 5, 4);
  ctx.fillRect(3, -4, 5, 4);
  ctx.fillRect(-6, 4, 12, 3);
};

BULLET_DRAWERS.truck = b => {
  ctx.translate(b.x, b.y);
  if (b.wall) {
    ctx.fillStyle = '#ffe84d';
    ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
    ctx.fillStyle = '#000';
    ctx.font = TINY_FONT;
    ctx.textAlign = 'center';
    for (let y = -b.hh + 16; y < b.hh; y += 22) ctx.fillText('$', 0, y);
    return;
  }
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) ctx.fillRect(-20 + i * 14, -b.hh - 10, 12, 8);
  ctx.fillStyle = '#333';
  fillCircle(-16, b.hh, 5);
  fillCircle(16, b.hh, 5);
};

BULLET_DRAWERS.neoHeart = b => {
  // the heart hangs on a chain from his chest (off the right edge of the board)
  const anchorX = arena.x + arena.w + 70;
  const anchorY = arena.y + arena.h / 2;
  ctx.strokeStyle = '#9a9aa8';
  ctx.lineWidth = 2;
  const links = 9;
  for (let i = 0; i < links; i++) {
    const t = i / links;
    const x = anchorX + (b.x - anchorX) * t;
    const y = anchorY + (b.y - anchorY) * t + Math.sin(t * Math.PI) * 8;
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2.5, Math.atan2(b.y - anchorY, b.x - anchorX), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.translate(b.x, b.y);
  drawSuitBullet('heart', b.r * 2.6, '#ff4fa3');
  // a tiny grinning face on the heart
  ctx.fillStyle = '#000';
  ctx.fillRect(-6, -4, 4, 3);
  ctx.fillRect(2, -4, 4, 3);
  ctx.fillRect(-5, 3, 10, 2);
};

BULLET_DRAWERS.pipis = b => {
  ctx.fillStyle = '#5ec8ff';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.r * 0.85, b.r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  fillCircle(b.x - 3, b.y - 4, 2);
};

BULLET_DRAWERS.phone = b => {
  ctx.translate(b.x, b.y);
  if (!b.top) ctx.scale(1, -1);
  ctx.fillStyle = '#f2f2f2';
  fillRoundRect(-14, -6, 28, 12, 5);
  ctx.fillStyle = '#ff4d4d';
  fillCircle(-12, 4, 5);
  fillCircle(12, 4, 5);
};

BULLET_DRAWERS.facePart = b => {
  ctx.translate(b.x, b.y);
  ctx.fillStyle = '#fff';
  if (b.part === 'mouth') {
    fillRoundRect(-18, -8, 36, 16, 4);
    ctx.fillStyle = '#000';
    ctx.fillRect(-14, -2, 28, 4);
  } else if (b.part === 'nose') {
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
  } else {
    fillRoundRect(-18, -10, 36, 20, 6);
    ctx.fillStyle = '#ff2fb0';
    fillCircle(0, 0, 6);
  }
  // health pips
  ctx.fillStyle = '#ffe84d';
  ctx.fillRect(-16, 16, 32 * (b.shootHp / 16), 3);
};
