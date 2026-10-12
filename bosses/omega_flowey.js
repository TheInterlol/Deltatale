// Omega Flowey ("Photoshop Flowey") - Undertale, Neutral finale.
// Reference: a huge board and a relentless barrage. Phases 1/4: X-shaped bullets from his
// lower eyes in a wide arc, triplets from the upper eyes surrounding you, flamethrower blasts,
// a ring of "friendliness pellets" closing in, vines shooting along flashing lines, sometimes
// a mouth beam. Phases 2/6: a venus flytrap sucking in flies, bombs exploding on the floor,
// finger guns from the sides, ricocheting cactus snakes. Phases 3/5: eyes and vines, and he
// reloads FILE 2 to repeat an attack. Between phases a human SOUL appears with its own attack
// (knives, gloves, ballet shoes, books, frying pans, a gun); those can't kill you. ACT calls
// for help: the SOUL turns its attack into healing. With all six SOULs on your side his
// DEFENSE drops - when his HP runs out he panics... and finally you decide: FIGHT or MERCY.

const OMEGA_SOULS = [
  { id: 'cyan', color: '#2ad8ff', name: 'Light blue SOUL', attack: 'knives' },
  { id: 'orange', color: '#ff9a1a', name: 'Orange SOUL', attack: 'gloves' },
  { id: 'blue', color: '#3d5cff', name: 'Blue SOUL', attack: 'shoes' },
  { id: 'purple', color: '#d52fd9', name: 'Purple SOUL', attack: 'books' },
  { id: 'green', color: '#16c916', name: 'Green SOUL', attack: 'pans' },
  { id: 'yellow', color: '#ffe11a', name: 'Yellow SOUL', attack: 'gun' }
];
const OMEGA_PHASE_ATTACKS = {
  1: ['lowerEyes', 'pellets', 'flamethrower', 'vines'],
  2: ['flytrap', 'bombs', 'fingerGuns', 'dentata'],
  3: ['upperEyes', 'vines']
};

const OmegaFlowey = registerBoss({
  id: 'omega_flowey',
  name: 'Omega Flowey',
  game: 'undertale',
  color: '#ffe14d',
  emblem: 'flower',

  player: { name: 'FRISK', lv: 1, maxHp: 50, power: 46 },
  items: ['butterscotchPie', 'faceSteak', 'snowmanPiece', 'cinnaBun'],
  maxHp: 2400,
  attack: 4,
  defense: 0,
  checkAttack: '???',
  checkDefense: '???',
  gold: 0,
  box: { w: 380, h: 200 },
  fixedSpeed: true,
  check: 'Your best friend.',
  intro: '* Flowey took the six human SOULs...\n* Howdy! I\'m FLOWEY. FLOWEY THE FLOWER!',

  setup(battle) {
    this.defense = 0;
    battle.flags.phase = 1;
    battle.flags.attackInPhase = 0;
    battle.flags.soulIndex = 0;        // the next SOUL to appear
    battle.flags.soulNow = null;       // SOUL segment waiting for ACT
    battle.flags.saved = [];
    battle.flags.healNext = null;      // healing segment after a SOUL was saved
    battle.flags.panic = 0;
    battle.flags.choice = false;
    battle.flags.reload = false;
  },

  getCommands(battle) {
    const f = battle.flags;
    if (f.choice) return COMMAND_SETS.undertale.filter(c => c.id === 'fight' || c.id === 'mercy');
    if (f.soulNow) return [COMMAND_SETS.undertale[0], { id: 'act', label: 'ACT', run: omegaCallForHelp }];
    return [COMMAND_SETS.undertale[0], COMMAND_SETS.undertale[2]];
  },

  onFight(battle) {
    const f = battle.flags;
    if (f.choice) {
      battle.bossHp = 0;
      return undefined;
    }
    if (f.panic) return 'miss';
    return undefined;
  },

  onDamaged(battle, damage) {
    const f = battle.flags;
    // with all six SOULs saved, every hit counts much more
    if (f.saved.length >= 6) battle.bossHp = Math.max(0, battle.bossHp - damage * 4);
    if (f.choice) return;
    if (battle.bossHp <= 0) {
      battle.bossHp = 1;
      if (!f.panic) f.panic = 1;
    }
  },

  onSpare(battle) {
    if (battle.flags.choice) {
      winBattle(battle, 'spared', '* You spared Flowey.\n* "...Why? Why are you being... so nice to me?"\n* Flowey ran away. YOU WON!');
      return true;
    }
    showResult(battle, '* ...\n* (There\'s no MERCY here.)');
    return true;
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Flowey was torn apart.\n* The SOULs drifted away...\n* YOU WON.';
    return null;
  },

  // SOUL segments can hurt but not kill
  onLethal(battle) {
    if (battle.attack && battle.attack.attack.soulSegment) {
      state.player.hp = 1;
      return true;
    }
    return false;
  },

  getFlavor(battle) {
    const f = battle.flags;
    if (f.choice) return '* The SOULs left Flowey.\n* He\'s just a flower again.';
    if (f.soulNow) return `* The ${f.soulNow.name} is calling...\n* (ACT to call for help.)`;
    if (f.reload) return '* Flowey loaded FILE 2.';
    if (f.saved.length >= 6) return '* Flowey\'s DEFENSE dropped to 0!';
    return pick(['* Flowey is laughing.', '* The TV screen shows a static-filled face.', '* Vines writhe everywhere.', '* You feel very, very small.']);
  },

  statusText(battle) {
    return `SOULs saved: ${battle.flags.saved.length} / 6`;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick(['Hee hee hee.', 'This is all just a bad dream!', 'Did you really think you could win?', 'I\'m the god of this world!', null]);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (f.choice) return OMEGA_ATTACKS.silence;
    if (f.panic) {
      f.panic += 1;
      if (f.panic > 3) {
        f.choice = true;
        return OMEGA_ATTACKS.soulsLeave;
      }
      return OMEGA_ATTACKS.panic;
    }
    // a saved SOUL heals you with its attack once
    if (f.healNext) {
      const soul = f.healNext;
      f.healNext = null;
      return { ...OMEGA_ATTACKS[soul.attack], name: `${soul.name} (healing)`, healing: true, soul, soulSegment: true };
    }
    // every third turn a SOUL appears (and keeps coming back until it's saved)
    if (battle.turn % 3 === 2 && f.soulIndex < OMEGA_SOULS.length) {
      const soul = OMEGA_SOULS[f.soulIndex];
      f.soulNow = soul;
      return { ...OMEGA_ATTACKS[soul.attack], name: soul.name, soul, soulSegment: true, line: 'W-what? A SOUL is fighting back!?' };
    }
    if (f.saved.length >= 6) return OMEGA_ATTACKS.weakPellets;
    // Flowey's own attacks, by phase
    const phase = [1, 2, 3, 1, 3, 2][Math.min(5, Math.floor(battle.turn / 3))];
    const list = OMEGA_PHASE_ATTACKS[phase];
    // phases 3 and 5: he reloads FILE 2 to repeat the last attack
    if (phase === 3 && f.lastAttack && !f.reload && chance(0.5)) {
      f.reload = true;
      return { ...f.lastAttack, line: 'Hee hee... let\'s try that again!' };
    }
    f.reload = false;
    const id = list[f.attackInPhase++ % list.length];
    let attack = OMEGA_ATTACKS[id];
    if (id === 'vines' && chance(0.2)) attack = OMEGA_ATTACKS.mouthBeam;
    f.lastAttack = attack;
    return attack;
  },

  attacks: []
});

function omegaCallForHelp(battle) {
  const f = battle.flags;
  const soul = f.soulNow;
  f.soulNow = null;
  f.saved.push(soul.id);
  f.soulIndex += 1;
  f.healNext = soul;
  sfx.spare();
  if (f.saved.length >= 6) OmegaFlowey.defense = -30;
  showResult(battle, `* You called for help...\n* The ${soul.name} answered!`);
}

function omegaRun(run) {
  return { healing: Boolean(run.attack.healing), soul: run.attack.soul };
}

// A bullet of a SOUL segment: harmful, or a green healing item once that SOUL is saved.
function soulBullet(run, options) {
  const { healing } = omegaRun(run);
  if (healing) return spawn({ ...options, heal: 5, harmless: true, color: '#7dff7d' });
  return spawn(options);
}

function xBullet(x, y, vx, vy) {
  return spawn({ kind: 'xShot', x, y, vx, vy, r: 6, maxLife: 6, minLife: 1 });
}

const OMEGA_ATTACKS = {
  lowerEyes: {
    name: 'X-bullets', duration: 6,
    update(run) {
      every(run, 'arc', 1.2, () => {
        const x = arena.x + arena.w / 2;
        const y = arena.y - 20;
        const base = aimAt(x, y, 1).angle;
        for (let i = -3; i <= 3; i++) {
          const a = base + i * 0.22;
          xBullet(x, y, Math.cos(a) * 95, Math.sin(a) * 95);
        }
      }, 0.2);
    }
  },
  upperEyes: {
    name: 'Eye triplets', duration: 6,
    update(run) {
      every(run, 'triplet', 0.9, () => {
        const p = state.player;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const x = p.x + Math.cos(a) * 120;
          const y = p.y + Math.sin(a) * 90;
          const v = aimAt(x, y, 120);
          spawn({ kind: 'xShot', x, y, vx: v.vx, vy: v.vy, r: 6, warn: 0.35, maxLife: 4, noCull: true,
            update(b, dt) { if (b.life > b.warn) { b.x += b.vx * dt; b.y += b.vy * dt; } } });
        }
      }, 0.2);
    }
  },
  flamethrower: {
    name: 'Flamethrowers', duration: 6.5,
    update(run) {
      every(run, 'blast', 1.6, () => {
        const left = run.data.left = !run.data.left;
        run.data.blastUntil = run.t + 0.6;
        run.data.blastSide = left;
      }, 0.2);
      if (run.data.blastUntil > run.t) {
        every(run, 'flame', 0.04, () => {
          const left = run.data.blastSide;
          const x = left ? arena.x - 10 : arena.x + arena.w + 10;
          const y = arena.y + arena.h * 0.35;
          const a = (left ? 0 : Math.PI) + rand(-0.35, 0.35) + (left ? 0.3 : -0.3);
          spawn({ kind: 'fire', x, y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 6, maxLife: 1.6 });
        }, 0);
      }
    }
  },
  pellets: {
    name: 'Friendliness pellets', duration: 6,
    update(run) {
      every(run, 'ring', 1.8, () => {
        const c = { x: state.player.x, y: state.player.y };
        for (let i = 0; i < 16; i++) {
          const a0 = (Math.PI * 2 * i) / 16;
          spawn({
            kind: 'pellet', x: c.x, y: c.y, r: 4, warn: 0.6, noCull: true, maxLife: 3,
            update(b) {
              const t = Math.max(0, b.life - b.warn);
              // trace the circle, close in, then fly away
              const r = t < 0.5 ? 80 : t < 1 ? 80 - (t - 0.5) * 120 : 20 + (t - 1) * 260;
              const a = a0 + t * 1.2;
              b.x = c.x + Math.cos(a) * r;
              b.y = c.y + Math.sin(a) * r;
            }
          });
        }
      }, 0.2);
    }
  },
  vines: {
    name: 'Vines', duration: 6,
    update(run) {
      every(run, 'vine', 0.55, () => {
        const c = arenaCenter();
        const a = Math.random() * Math.PI * 2;
        const x = c.x + Math.cos(a) * 260;
        const y = c.y + Math.sin(a) * 180;
        spawnBeam(x, y, Math.atan2(state.player.y - y, state.player.x - x), 12, 0.55, 0.3, { beamColor: '#3ddc5a', drawEmitter: false, kind: 'beam' });
      }, 0.2);
    }
  },
  mouthBeam: {
    name: 'Mouth beam', duration: 5,
    line: 'Hee hee hee... say "AHHH"!',
    start() {
      const y = state.player.y;
      spawnBeam(arena.x - 80, y, 0, 70, 1.1, 0.8, { beamColor: '#ffffff', drawEmitter: false, damage: 8 });
    },
    update() {}
  },
  flytrap: {
    name: 'Venus flytrap', duration: 6.5,
    start(run) {
      run.data.trap = { x: chance(0.5) ? arena.x + 20 : arena.x + arena.w - 20, y: arena.y + arena.h - 20 };
      spawn({ kind: 'flytrap', x: run.data.trap.x, y: run.data.trap.y, r: 16, noCull: true });
    },
    update(run, dt) {
      const trap = run.data.trap;
      const p = state.player;
      // it sucks everything in - flies and the SOUL
      p.x += Math.sign(trap.x - p.x) * 25 * dt;
      every(run, 'fly', 0.18, () => {
        spawn({
          kind: 'fly', x: rand(arena.x, arena.x + arena.w), y: arena.y - 6, r: 4, noCull: true, maxLife: 5,
          update(b, dt2) {
            const v = { x: trap.x - b.x, y: trap.y - b.y };
            const d = Math.hypot(v.x, v.y) || 1;
            b.x += (v.x / d) * 120 * dt2 + Math.sin(b.life * 9) * 40 * dt2;
            b.y += (v.y / d) * 120 * dt2;
            if (d < 14) b.dead = true;
          }
        });
      }, 0);
    }
  },
  bombs: {
    name: 'Bombs', duration: 6.5,
    update(run) {
      every(run, 'bomb', 0.8, () => {
        spawn({
          kind: 'mttBomb', x: rand(arena.x + 15, arena.x + arena.w - 15), y: arena.y - 10, vy: 150, r: 8, noCull: true, maxLife: 4,
          update(b, dt) {
            b.y += b.vy * dt;
            if (b.y >= arena.y + arena.h - 10) {
              b.dead = true;
              addShake(3);
              // the blast covers a wide area of the floor
              warnZone(b.x - 40, arena.y + arena.h - 50, 80, 50, 0.01, 0.25, { color: '#ffe14d' });
            }
          }
        });
      }, 0.2);
    }
  },
  fingerGuns: {
    name: 'Finger guns', duration: 6.5,
    update(run) {
      every(run, 'shot', 0.35, () => {
        const left = chance(0.5);
        const x = left ? arena.x - 10 : arena.x + arena.w + 10;
        const y = rand(arena.y + 15, arena.y + arena.h - 15);
        const v = aimAt(x, y, 200);
        spawn({ kind: 'pellet', x, y, vx: v.vx, vy: v.vy, r: 4, maxLife: 3, minLife: 1 });
      }, 0.2);
    }
  },
  dentata: {
    name: 'Dentata snakes', duration: 7,
    start() {
      for (let i = 0; i < 3; i++) {
        const segs = [];
        const vx = rand(120, 160) * (chance(0.5) ? 1 : -1);
        const vy = rand(90, 130);
        const head = spawn({ kind: 'segment', x: arena.x + 40 + i * 120, y: arena.y + 10, vx, vy, r: 8, color: '#3ddc5a', noCull: true, maxLife: 7, bounces: 0,
          update(b, dt) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            // ricochet off the walls a few times, then leave
            if (b.bounces < 4) {
              if (b.x < arena.x + b.r || b.x > arena.x + arena.w - b.r) { b.vx *= -1; b.bounces++; }
              if (b.y < arena.y + b.r || b.y > arena.y + arena.h - b.r) { b.vy *= -1; b.bounces++; }
            }
            b.trail = b.trail || [];
            b.trail.unshift({ x: b.x, y: b.y });
            b.trail.length = Math.min(b.trail.length, 40);
            segs.forEach((s, k) => {
              const t = b.trail[(k + 1) * 6];
              if (t) { s.x = t.x; s.y = t.y; }
            });
          } });
        for (let k = 0; k < 5; k++) segs.push(spawn({ kind: 'segment', x: head.x, y: head.y, r: 6, color: '#3ddc5a', noCull: true, maxLife: 7 }));
      }
    },
    update() {}
  },
  weakPellets: {
    name: 'Weak pellets', duration: 5,
    update(run) {
      every(run, 'pellet', 0.3, () => {
        const x = rand(arena.x, arena.x + arena.w);
        spawn({ kind: 'pellet', x, y: arena.y - 6, vy: 110, r: 4, maxLife: 3, damage: 1 });
        // the SOULs send help
        spawn({ kind: 'suit', suit: 'heart', x: rand(arena.x, arena.x + arena.w), y: arena.y - 6, vy: 90, r: 6, heal: 4, harmless: true, color: '#7dff7d', faceVelocity: false, maxLife: 4 });
      }, 0.2);
    }
  },
  panic: {
    name: 'Panic', duration: 5,
    line: 'N-no! I\'ll just load my SAVE again! It doesn\'t matter how many times you win!',
    update(run) {
      every(run, 'ring', 0.9, () => {
        spawnRing(state.player.x, state.player.y - 140, 18, 120, 4, 'pellet', Math.random(), { damage: 1, maxLife: 3, noCull: true });
      }, 0.2);
    }
  },
  soulsLeave: {
    name: 'The SOULs leave', duration: 3, quiet: true,
    line: 'W-wait! What are you doing!? NO! STOP IT!',
    update() {}
  },
  silence: {
    name: '...', duration: 1, quiet: true,
    update() {}
  },
  // ---------------- SOUL segments ----------------
  knives: {
    name: 'Knives', duration: 6, soulSegment: true,
    update(run) {
      every(run, 'knife', 0.45, () => {
        const fromLeft = chance(0.5);
        const x = fromLeft ? arena.x - 10 : arena.x + arena.w + 10;
        const y = arena.y - 10;
        soulBullet(run, { kind: 'spear', x, y, vx: (fromLeft ? 1 : -1) * 150, vy: 110, hw: 12, hh: 3, spin: 8, angle: 0, maxLife: 4, minLife: 1, color: '#ffffff' });
      }, 0.2);
    }
  },
  gloves: {
    name: 'Gloves', duration: 6.5, soulSegment: true,
    update(run) {
      every(run, 'ring', 2, () => {
        const c = { x: state.player.x, y: state.player.y };
        for (let i = 0; i < 8; i++) {
          const a0 = (Math.PI * 2 * i) / 8;
          soulBullet(run, {
            kind: 'glove', x: c.x, y: c.y, r: 7, noCull: true, maxLife: 2.6, color: '#ff9a1a',
            update(b) {
              const r = b.life < 1 ? 110 + Math.sin(b.life * 6) * 10 : 110 - (b.life - 1) * 70;
              const a = a0 + b.life * 1.4;
              b.x = c.x + Math.cos(a) * r;
              b.y = c.y + Math.sin(a) * r;
            }
          });
        }
      }, 0.2);
    }
  },
  shoes: {
    name: 'Ballet shoes', duration: 6.5, soulSegment: true,
    start(run) {
      // stars hem the SOUL in
      for (let i = 0; i < 6; i++) soulBullet(run, { kind: 'star', x: arena.x + 30 + i * 64, y: arena.y + arena.h / 2 + (i % 2 ? -40 : 40), r: 7, color: '#3d5cff', noCull: true, maxLife: 7 });
    },
    update(run) {
      every(run, 'shoe', 0.7, () => {
        const x = rand(arena.x + 10, arena.x + arena.w - 10);
        const up = chance(0.5);
        soulBullet(run, { kind: 'normal', x, y: up ? arena.y + arena.h + 10 : arena.y - 10, vy: up ? -170 : 170, hw: 6, hh: 12, color: '#3d5cff', maxLife: 3, minLife: 1 });
      }, 0.2);
    }
  },
  books: {
    name: 'Books', duration: 6.5, soulSegment: true,
    update(run) {
      const healing = omegaRun(run).healing;
      every(run, 'word', 0.6, () => {
        const left = chance(0.5);
        const word = healing ? pick(['HOPE', 'HOPE', 'DREAMS', 'FRIENDS']) : pick(['FAIL', 'DUMB', 'WEAK', 'LOSER', 'NO']);
        soulBullet(run, { kind: 'word', word, x: left ? arena.x - 30 : arena.x + arena.w + 30, y: rand(arena.y + 12, arena.y + arena.h - 12), vx: left ? 130 : -130, hw: word.length * 6, hh: 6, maxLife: 4, minLife: 1, color: '#d52fd9' });
      }, 0.2);
    }
  },
  pans: {
    name: 'Frying pans', duration: 6.5, soulSegment: true,
    update(run) {
      every(run, 'flip', 0.6, () => {
        const pan = randInt(0, 2);
        const x = arena.x + arena.w * (0.2 + pan * 0.3);
        soulBullet(run, { kind: 'fire', x, y: arena.y + arena.h - 10, vx: rand(-90, 90), vy: -260, ay: 300, r: 6, maxLife: 3, noCull: true });
      }, 0.2);
    }
  },
  gun: {
    name: 'Gun', duration: 6.5, soulSegment: true,
    update(run) {
      every(run, 'shot', 0.6, () => {
        const p = state.player;
        const x = arena.x + arena.w / 2;
        const y = arena.y - 20;
        // the crosshair flashes, then the bullet flies there
        spawn({ kind: 'mark', x: p.x, y: p.y, r: 10, harmless: true, maxLife: 0.35 });
        const v = aimAt(x, y, 300);
        soulBullet(run, { kind: 'normal', x, y, vx: v.vx, vy: v.vy, r: 5, warn: 0.35, maxLife: 3, noCull: true, color: '#ffe11a',
          update(b, dt) { if (b.life > b.warn) { b.x += b.vx * dt; b.y += b.vy * dt; } } });
      }, 0.2);
    }
  }
};

BULLET_DRAWERS.xShot = b => {
  ctx.translate(b.x, b.y);
  ctx.rotate(b.life * 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-b.r, -2, b.r * 2, 4);
  ctx.fillRect(-2, -b.r, 4, b.r * 2);
};

BULLET_DRAWERS.pellet = (b, fill) => {
  ctx.fillStyle = b.heal ? '#7dff7d' : '#ffffff';
  ctx.translate(b.x, b.y);
  ctx.rotate(b.life * 6);
  ctx.fillRect(-3, -3, 6, 6);
};

BULLET_DRAWERS.flytrap = b => {
  ctx.fillStyle = '#3ddc5a';
  fillCircle(b.x, b.y, b.r);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(b.x - b.r, b.y);
  ctx.lineTo(b.x + b.r, b.y);
  ctx.lineTo(b.x, b.y - 4);
  ctx.closePath();
  ctx.fill();
};

BULLET_DRAWERS.fly = b => {
  ctx.fillStyle = '#ffffff';
  fillCircle(b.x, b.y, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  fillCircle(b.x - 3, b.y - 3, 2);
  fillCircle(b.x + 3, b.y - 3, 2);
};

BULLET_DRAWERS.glove = (b, fill) => {
  ctx.fillStyle = b.heal ? '#7dff7d' : fill;
  fillRoundRect(b.x - 7, b.y - 6, 14, 12, 4);
};

OmegaFlowey.attacks = ['lowerEyes', 'upperEyes', 'flamethrower', 'pellets', 'vines', 'mouthBeam', 'flytrap', 'bombs', 'fingerGuns', 'dentata',
  'knives', 'gloves', 'shoes', 'books', 'pans', 'gun'].map(id => OMEGA_ATTACKS[id]);
