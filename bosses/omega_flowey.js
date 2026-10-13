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
  // no visible board: the SOUL moves around under his face, bullets fly everywhere
  box: { w: 560, h: 200 },
  hideBoard: true,
  freeBullets: true,
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


// ---------------------------------------------------------------- the scene
// His body is one big picture (tools/build_omega.py puts it together from the parts in the
// sprite pack) with the TV on top. The TV laughs between attacks, shows a static-filled face
// while he attacks, flashes WARNING before a SOUL appears and shows that SOUL during its
// segment - when the rest of him disappears.
const OMEGA_S = 405 / 480;
const OMEGA_X0 = 90;
const omegaScene = new Image();
omegaScene.src = 'assets/bosses/omega_flowey/scene.png';

// a point given in the original 640 x 480 screen
function omegaPt(x, y) {
  return { x: OMEGA_X0 + x * OMEGA_S, y: y * OMEGA_S };
}
const OMEGA_POINTS = {
  upperEyes: [[196, 134], [444, 134]],
  lowerEyes: [[263, 201], [377, 201]],
  mouth: [320, 300],
  stalks: [[70, 205], [570, 205]]
};
const omegaAt = ([x, y]) => omegaPt(x, y);

function omegaSegmentNow(battle) {
  if (!battle) return null;
  const attack = battle.phase === 'attack' && battle.attack ? battle.attack.attack : battle.phase === 'enemyTalk' ? battle.nextAttack : null;
  return attack && attack.soulSegment ? attack.soul : null;
}

Object.assign(OmegaFlowey, {
  drawScene(battle) {
    const segment = omegaSegmentNow(battle);
    if (!segment) {
      if (imageReady(omegaScene)) {
        // he breathes a little
        const k = 1 + Math.sin(state.clock * 1.6) * 0.004;
        ctx.drawImage(omegaScene, OMEGA_X0 - (540 * (k - 1)) / 2, 0, 540 * k, 405 * k);
      } else {
        drawBossPresence(OmegaFlowey, 360, 90, state.clock, {});
      }
    }
    omegaDrawTv(battle, segment);
  }
});

function omegaDrawTv(battle, segment) {
  const s = OMEGA_S;
  const tv = { x: OMEGA_X0 + 235 * s, y: -27 * s, w: 190 * s, h: 176 * s };
  const scr = { x: tv.x + 24 * s, y: tv.y + 58 * s, w: 126 * s, h: 86 * s };
  const f = battle ? battle.flags : {};
  const attacking = battle && battle.phase === 'attack';
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
  const warning = battle && ((battle.phase === 'enemyTalk' && segment) || (f.soulNow && !attacking));
  if (segment && attacking) {
    // the SOUL that is fighting right now
    drawSoulShape(scr.x + scr.w / 2, scr.y + scr.h / 2, 11, segment.color);
  } else if (warning) {
    if (Math.floor(state.clock * 4) % 2 === 0) drawArt('omega_warning', scr.x + scr.w / 2, scr.y + scr.h / 2, scr.w, scr.h);
  } else if (attacking) {
    drawArt('omega_static', scr.x + scr.w / 2, scr.y + scr.h / 2, scr.h * 0.86, scr.h, { frame: state.clock * 12 });
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
    drawArt('omega_face', scr.x + scr.w / 2, scr.y + scr.h / 2 + 4, scr.h * 1.05, scr.h * 1.06, { frame: state.clock * 14 });
  }
  ctx.restore();
  if (!drawArt('omega_tv', tv.x + tv.w / 2, tv.y + tv.h / 2, tv.w, tv.h)) {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 6;
    ctx.strokeRect(scr.x - 4, scr.y - 4, scr.w + 8, scr.h + 8);
  }
}

// ---------------------------------------------------------------- helpers
function omegaRun(run) {
  return { healing: Boolean(run.attack.healing), soul: run.attack.soul };
}

// A bullet of a SOUL segment: harmful, or a green healing item once that SOUL is saved.
function soulBullet(run, options) {
  const { healing } = omegaRun(run);
  if (healing) return spawn({ ...options, heal: 5, harmless: true, healing: true });
  return spawn(options);
}

function xBullet(x, y, vx, vy) {
  return spawn({ kind: 'xShot', x, y, vx, vy, r: 6, maxLife: 6, minLife: 1 });
}

// ---------------------------------------------------------------- attacks
const OMEGA_ATTACKS = {
  lowerEyes: {
    name: 'X-bullets', duration: 6,
    update(run) {
      // the eyes on his cheeks take turns spraying arcs of X bullets
      every(run, 'arc', 0.6, () => {
        run.data.side = (run.data.side || 0) + 1;
        const eye = omegaAt(OMEGA_POINTS.lowerEyes[run.data.side % 2]);
        const base = aimAt(eye.x, eye.y, 1).angle;
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.26;
          xBullet(eye.x, eye.y, Math.cos(a) * 105, Math.sin(a) * 105);
        }
      }, 0.2);
    }
  },
  upperEyes: {
    name: 'Eye triplets', duration: 6,
    update(run) {
      // three rings flash around you - then X bullets shoot out of them at where you were
      every(run, 'triplet', 0.9, () => {
        const p = state.player;
        const a0 = Math.random() * Math.PI * 2;
        for (let i = 0; i < 3; i++) {
          const a = a0 + (i * Math.PI * 2) / 3;
          const x = p.x + Math.cos(a) * 110;
          const y = p.y + Math.sin(a) * 80;
          const v = aimAt(x, y, 140);
          spawn({ kind: 'xShot', x, y, vx: v.vx, vy: v.vy, r: 6, warn: 0.45, maxLife: 4, noCull: true, ownWarn: true,
            update(b, dt) { if (b.life > b.warn) { b.x += b.vx * dt; b.y += b.vy * dt; } } });
        }
      }, 0.2);
    }
  },
  flamethrower: {
    name: 'Flamethrowers', duration: 6.5,
    update(run) {
      every(run, 'blast', 1.6, () => {
        run.data.left = !run.data.left;
        run.data.blastUntil = run.t + 0.7;
        run.data.aim = aimAt(omegaAt(OMEGA_POINTS.stalks[run.data.left ? 0 : 1]).x, omegaAt(OMEGA_POINTS.stalks[0]).y, 1).angle;
      }, 0.2);
      if (run.data.blastUntil > run.t) {
        every(run, 'flame', 0.035, () => {
          const from = omegaAt(OMEGA_POINTS.stalks[run.data.left ? 0 : 1]);
          // the stream sweeps across while it burns
          const sweep = (run.data.blastUntil - run.t) * (run.data.left ? -0.9 : 0.9);
          const a = run.data.aim + sweep + rand(-0.12, 0.12);
          spawn({ kind: 'omegaFlame', x: from.x, y: from.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 7, maxLife: 1.8 });
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
      // orange lines flash from below - then thick vines shoot up along them
      every(run, 'vine', 0.75, () => {
        const p = state.player;
        const x0 = chance(0.5) ? rand(80, 260) : rand(460, 640);
        const base = Math.atan2(p.y - 420, p.x - x0);
        for (const off of [-0.09, 0, 0.09]) {
          spawnBeam(x0 + off * 80, 420, base + off + rand(-0.03, 0.03), 14, 0.65, 0.35, { kind: 'omegaVine', drawEmitter: false });
        }
      }, 0.2);
    }
  },
  mouthBeam: {
    name: 'Mouth beam', duration: 5,
    line: 'Hee hee hee... say "AHHH"!',
    update(run) {
      every(run, 'beam', 1.9, () => {
        const m = omegaAt(OMEGA_POINTS.mouth);
        const a = aimAt(m.x, m.y, 1).angle;
        spawnBeam(m.x, m.y, a, 56, 1.0, 0.6, { kind: 'omegaMouthBeam', drawEmitter: false, damage: 8 });
      }, 0.3);
    }
  },
  flytrap: {
    name: 'Venus flytrap', duration: 6.5,
    start(run) {
      const left = chance(0.5);
      run.data.trap = { x: left ? arena.x + 40 : arena.x + arena.w - 40, y: arena.y + arena.h - 24, left };
      spawn({ kind: 'flytrap', x: run.data.trap.x, y: run.data.trap.y, r: 22, noCull: true, left, noFx: true });
    },
    update(run, dt) {
      const trap = run.data.trap;
      const p = state.player;
      // it sucks everything in - flies and the SOUL
      p.x += Math.sign(trap.x - p.x) * 28 * dt;
      every(run, 'fly', 0.16, () => {
        spawn({
          kind: 'fly', x: rand(arena.x, arena.x + arena.w), y: arena.y - 10, r: 5, noCull: true, maxLife: 6,
          update(b, dt2) {
            const v = { x: trap.x - b.x, y: trap.y - b.y };
            const d = Math.hypot(v.x, v.y) || 1;
            b.x += (v.x / d) * 120 * dt2 + Math.sin(b.life * 9) * 40 * dt2;
            b.y += (v.y / d) * 120 * dt2;
            if (d < 16) b.dead = true;
          }
        });
      }, 0);
    }
  },
  bombs: {
    name: 'Flowey nukes', duration: 6.5,
    update(run) {
      every(run, 'bomb', 0.7, () => {
        const floor = rand(arena.y + arena.h * 0.45, arena.y + arena.h - 10);
        spawn({
          kind: 'omegaNuke', x: rand(arena.x + 20, arena.x + arena.w - 20), y: -30, vy: 210, hw: 9, hh: 18, noCull: true, maxLife: 4,
          update(b, dt) {
            b.y += b.vy * dt;
            if (b.y >= floor) {
              b.dead = true;
              addShake(4);
              spawn({ kind: 'omegaBoom', x: b.x, y: b.y - 10, r: 34, activeFor: 0.35, fadeOut: 0.4, noCull: true, noFx: true });
            }
          }
        });
      }, 0.2);
    }
  },
  fingerGuns: {
    name: 'Finger guns', duration: 6.5,
    update(run) {
      // hands with finger guns pop up on both sides and fire at you
      every(run, 'hand', 0.7, () => {
        const left = chance(0.5);
        const x = left ? arena.x - 30 : arena.x + arena.w + 30;
        const y = rand(arena.y + 20, arena.y + arena.h - 20);
        spawn({ kind: 'omegaHand', x, y, r: 10, harmless: true, noCull: true, maxLife: 1.4, left, noFx: true, shots: [0.35, 0.6, 0.85],
          update(b) {
            // three shots while it is out
            while (b.shots.length && b.life >= b.shots[0]) {
              b.shots.shift();
              const mx = b.x + (left ? 80 : -80);
              const v = aimAt(mx, b.y - 8, 230);
              spawn({ kind: 'dirBullet', x: mx, y: b.y - 8, vx: v.vx, vy: v.vy, r: 5, maxLife: 3, minLife: 1 });
            }
          } });
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
        const head = spawn({ kind: 'dentataHead', x: arena.x + 60 + i * 200, y: arena.y + 10, vx, vy, r: 11, noCull: true, maxLife: 7, bounces: 0,
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
        for (let k = 0; k < 5; k++) segs.push(spawn({ kind: 'dentataBody', x: head.x, y: head.y, r: 7, noCull: true, maxLife: 7 }));
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
  // Light blue: a lattice of knives slides across (bandages once saved).
  knives: {
    name: 'Knives', duration: 6.5, soulSegment: true,
    update(run) {
      every(run, 'row', 0.55, () => {
        const shift = ((run.data.row = (run.data.row || 0) + 1) % 2) * 45;
        for (let x = arena.x - 140 + shift; x < arena.x + arena.w + 40; x += 90) {
          soulBullet(run, { kind: 'soulKnife', x, y: arena.y - 30, vx: 55, vy: 120, angle: 1.15, hw: 22, hh: 3, maxLife: 4, noCull: true });
        }
      }, 0.1);
    }
  },
  // Orange: gloves circle around you, then punch inwards (thumbs up once saved).
  gloves: {
    name: 'Gloves', duration: 6.5, soulSegment: true,
    update(run) {
      every(run, 'ring', 1.6, () => {
        const c = { x: state.player.x, y: state.player.y };
        for (let i = 0; i < 9; i++) {
          const a0 = (Math.PI * 2 * i) / 9;
          soulBullet(run, {
            kind: 'soulGlove', x: c.x, y: c.y, r: 9, noCull: true, maxLife: 2.4,
            update(b) {
              const r = b.life < 1 ? 130 + Math.sin(b.life * 6) * 8 : 130 - (b.life - 1) * 95;
              const a = a0 + b.life * 1.3;
              b.x = c.x + Math.cos(a) * r;
              b.y = c.y + Math.sin(a) * r;
              b.angle = a + Math.PI;
            }
          });
        }
      }, 0.2);
    }
  },
  // Dark blue: a row of stars on the floor and ballet shoes kicking along in a line
  // (music notes once saved).
  shoes: {
    name: 'Ballet shoes', duration: 7, soulSegment: true,
    start(run) {
      for (let x = arena.x + 8; x < arena.x + arena.w; x += 22) {
        soulBullet(run, { kind: 'soulStar', x, y: arena.y + arena.h - 6, r: 6, noCull: true, maxLife: 7 });
      }
    },
    update(run) {
      every(run, 'shoe', 0.32, () => {
        const i = (run.data.i = (run.data.i || 0) + 1);
        const y0 = arena.y + arena.h - 50;
        soulBullet(run, { kind: 'soulShoe', x: arena.x + arena.w + 20, y: y0, vx: -150, hw: 9, hh: 20, noCull: true, maxLife: 6,
          update(b, dt) {
            b.x += b.vx * dt;
            // a kick line: each shoe jumps up in turn
            b.y = y0 - Math.max(0, Math.sin(b.life * 4 + i * 0.9)) * 85;
          } });
      }, 0.1);
    }
  },
  // Purple: books on both sides throw words across ("HOPE" and friends once saved).
  books: {
    name: 'Books', duration: 6.5, soulSegment: true,
    start(run) {
      for (const left of [true, false]) {
        for (let y = arena.y + 20; y < arena.y + arena.h; y += 64) {
          spawn({ kind: 'soulBook', x: left ? arena.x - 20 : arena.x + arena.w + 20, y, r: 10, harmless: true, noCull: true, left, noFx: true });
        }
      }
    },
    update(run) {
      const healing = omegaRun(run).healing;
      every(run, 'word', 0.45, () => {
        const left = chance(0.5);
        const word = healing ? pick(['HOPE', 'DREAMS', 'KINDNESS', 'FRIENDS', 'LOVE']) : pick(['DOOM', 'DESPAIR', 'TERROR', 'HATRED', 'CORRUPT', 'TRAPPED']);
        soulBullet(run, { kind: 'soulWord', word, x: left ? arena.x + 10 : arena.x + arena.w - 10, y: rand(arena.y + 12, arena.y + arena.h - 12), vx: left ? 140 : -140, hw: word.length * 6, hh: 7, maxLife: 5, minLife: 1, color: healing ? '#7dff7d' : '#ffffff' });
      }, 0.2);
    }
  },
  // Green: frying pans along the top flip fire down (eggs once saved).
  pans: {
    name: 'Frying pans', duration: 6.5, soulSegment: true,
    start(run) {
      for (let i = 0; i < 4; i++) spawn({ kind: 'soulPan', x: arena.x + 70 + i * 140, y: arena.y - 6, r: 10, harmless: true, noCull: true, noFx: true, flip: i % 2 });
    },
    update(run) {
      every(run, 'flip', 0.22, () => {
        const pan = randInt(0, 3);
        const x = arena.x + 70 + pan * 140 + rand(-30, 30);
        soulBullet(run, { kind: 'soulFire', x, y: arena.y, vx: rand(-40, 40), vy: rand(-90, -30), ay: 260, r: 7, maxLife: 3, noCull: true });
      }, 0.2);
    }
  },
  // Yellow: a big revolver in the middle; crosshairs land on you and it fires (flowers once saved).
  gun: {
    name: 'Gun', duration: 6.5, soulSegment: true,
    start(run) {
      run.data.gun = spawn({ kind: 'soulGun', x: arena.x + arena.w / 2, y: arena.y + 40, r: 10, harmless: true, noCull: true, noFx: true });
    },
    update(run) {
      const gun = run.data.gun;
      gun.angle = aimAt(gun.x, gun.y, 1).angle;
      every(run, 'shot', 0.55, () => {
        const p = state.player;
        const healing = omegaRun(run).healing;
        spawn({ kind: 'soulCross', x: p.x, y: p.y, r: 12, harmless: true, maxLife: 0.45, healing, noFx: true });
        const v = aimAt(gun.x, gun.y, 330);
        soulBullet(run, { kind: 'soulBullet', x: gun.x, y: gun.y, vx: v.vx, vy: v.vy, r: 6, warn: 0.4, maxLife: 3, noCull: true, ownWarn: true,
          update(b, dt) { if (b.life > b.warn) { b.x += b.vx * dt; b.y += b.vy * dt; } } });
      }, 0.2);
    }
  }
};

// ---------------------------------------------------------------- drawing
const OMEGA_HEAL_TINT = '#7dff7d';
const healTint = b => (b.heal || b.healing ? OMEGA_HEAL_TINT : null);

BULLET_DRAWERS.xShot = b => {
  if (b.warn && b.life < b.warn) {
    // the warning ring the X comes out of
    ctx.globalAlpha *= 0.5 + 0.5 * Math.sin(b.life * 30);
    if (drawArt('omega_eyewarning', b.x, b.y, 26, 26)) return;
  }
  if (drawArt('omega_eyeshot', b.x, b.y, 17, 17, { angle: b.life * 4 })) return;
  ctx.translate(b.x, b.y);
  ctx.rotate(b.life * 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-b.r, -2, b.r * 2, 4);
  ctx.fillRect(-2, -b.r, 4, b.r * 2);
};

BULLET_DRAWERS.pellet = b => {
  if (drawArt('omega_pellet', b.x, b.y, 11, 11, { angle: b.life * 6, tint: healTint(b) })) return;
  ctx.fillStyle = b.heal ? OMEGA_HEAL_TINT : '#ffffff';
  ctx.translate(b.x, b.y);
  ctx.rotate(b.life * 6);
  ctx.fillRect(-3, -3, 6, 6);
};

BULLET_DRAWERS.dirBullet = b => {
  if (drawArt('omega_dirbullet', b.x, b.y, 12, 12, { frame: b.life * 30 })) return;
  ctx.fillStyle = '#fff';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.omegaFlame = b => {
  const k = 0.7 + b.life * 0.8;
  if (drawArt('omega_flame', b.x, b.y, 16 * k, 16 * k, { angle: b.life * 5 })) return;
  ctx.fillStyle = '#ff8a1a';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.omegaVine = b => {
  const charging = b.life < b.warn;
  ctx.translate(b.originX, b.originY);
  ctx.rotate(b.angle);
  if (charging) {
    ctx.fillStyle = Math.floor(b.life * 16) % 2 ? '#ffb02e' : '#ff6a00';
    ctx.fillRect(0, -1, 900, 2);
    return;
  }
  const info = ATTACK_ART.omega_vine;
  if (info && attackImage('omega_vine')) {
    const h = b.hh * 2.4;
    const w = (info.w * h) / info.h;
    for (let x = 0; x < 900; x += w - 2) drawArt('omega_vine', x + w / 2, 0, w, h);
    return;
  }
  ctx.fillStyle = '#3ddc5a';
  ctx.fillRect(0, -b.hh, 900, b.hh * 2);
};

BULLET_DRAWERS.omegaMouthBeam = b => {
  const charging = b.life < b.warn;
  ctx.translate(b.originX, b.originY);
  ctx.rotate(b.angle);
  if (charging) {
    // the mouth lights up
    const k = b.life / b.warn;
    ctx.globalAlpha *= 0.4 + 0.6 * k;
    if (!drawArt('omega_mouthflash', 0, 0, 60 * k + 20, null, { angle: -Math.PI / 2 })) {
      ctx.fillStyle = '#fff';
      fillCircle(0, 0, 20 * k);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, -1, 900, 2);
    return;
  }
  ctx.fillStyle = '#5aa8ff';
  ctx.fillRect(0, -b.hh, 900, b.hh * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, -b.hh * 0.7, 900, b.hh * 1.4);
};

BULLET_DRAWERS.flytrap = b => {
  if (drawArt('omega_venus', b.x, b.y - 20, 110, null, { frame: state.clock * 6, flipX: !b.left })) return;
  ctx.fillStyle = '#3ddc5a';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.fly = b => {
  if (drawArt('omega_fly', b.x, b.y, 18, null, { frame: state.clock * 20 })) return;
  ctx.fillStyle = '#ffffff';
  fillCircle(b.x, b.y, 3);
};

BULLET_DRAWERS.omegaNuke = b => {
  if (drawArt('omega_nuke', b.x, b.y, 30, null, { angle: Math.PI })) return;
  ctx.fillStyle = '#444';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.omegaBoom = b => {
  const info = ATTACK_ART.omega_explosion;
  const frame = info ? Math.min(info.frames - 1, (b.life / 0.75) * info.frames) : 0;
  if (drawArt('omega_explosion', b.x, b.y - 20, 110, null, { frame })) return;
  ctx.fillStyle = '#ffb02e';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.omegaHand = b => {
  // slides in, aims, slides back out
  const k = Math.min(1, b.life * 5, (1.4 - b.life) * 5);
  const x = b.x + (b.left ? 1 : -1) * k * 40;
  if (drawArt('omega_handgun', x, b.y, 76, null, { frame: Math.floor(b.life * 4) % 2, flipX: !b.left })) return;
  ctx.fillStyle = '#e8b896';
  fillCircle(x, b.y, b.r);
};

BULLET_DRAWERS.dentataHead = b => {
  if (drawArt('omega_dentata', b.x, b.y, 38, 38, { frame: state.clock * 15 })) return;
  ctx.fillStyle = '#3ddc5a';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.dentataBody = b => {
  if (drawArt('omega_dentata', b.x, b.y, 22, 22, { frame: 0 })) return;
  ctx.fillStyle = '#2f9a44';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.soulKnife = b => {
  const name = b.heal ? 'soul_bandage' : 'soul_knife';
  if (drawArt(name, b.x, b.y, 50, 19, { angle: b.angle, tint: healTint(b) })) return;
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  ctx.fillStyle = b.heal ? OMEGA_HEAL_TINT : '#fff';
  ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.soulGlove = b => {
  const name = b.heal ? 'soul_thumbsup' : 'soul_glove';
  if (drawArt(name, b.x, b.y, 44, null, { angle: b.angle || 0, tint: healTint(b) })) return;
  ctx.fillStyle = b.heal ? OMEGA_HEAL_TINT : '#fff';
  fillRoundRect(b.x - 8, b.y - 7, 16, 14, 4);
};

BULLET_DRAWERS.glove = BULLET_DRAWERS.soulGlove;

BULLET_DRAWERS.soulStar = b => {
  const name = b.heal ? 'soul_note' : 'soul_star';
  if (drawArt(name, b.x, b.y, 14, null, { tint: healTint(b) })) return;
  ctx.fillStyle = '#fff';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.soulShoe = b => {
  const name = b.heal ? 'soul_note' : 'soul_shoe';
  if (drawArt(name, b.x, b.y, b.heal ? 22 : 24, b.heal ? null : 44, { tint: healTint(b) })) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.soulWord = b => {
  ctx.fillStyle = b.heal ? OMEGA_HEAL_TINT : '#ffffff';
  ctx.font = `bold 15px ${TITLE_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText(b.word, b.x, b.y + 5);
};

BULLET_DRAWERS.soulBook = b => {
  if (drawArt('soul_book', b.x, b.y, 44, 60, { flipX: !b.left })) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(b.x - 18, b.y - 26, 36, 52);
};

BULLET_DRAWERS.soulPan = b => {
  if (drawArt('soul_pan', b.x, b.y, 80, null, { frame: Math.floor(state.clock * 3 + b.flip) % 2 })) return;
  ctx.fillStyle = '#888';
  ctx.fillRect(b.x - 30, b.y - 4, 60, 8);
};

BULLET_DRAWERS.soulFire = b => {
  const name = b.heal ? 'soul_egg' : 'soul_fire';
  if (drawArt(name, b.x, b.y, b.heal ? 22 : 14, null, { frame: state.clock * 10, tint: healTint(b) })) return;
  ctx.fillStyle = b.heal ? OMEGA_HEAL_TINT : '#fff';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.soulGun = b => {
  if (drawArt('soul_gun', b.x, b.y, 96, null, { angle: (b.angle || 0) + Math.PI, flipX: false })) return;
  ctx.fillStyle = '#fff';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.soulCross = b => {
  ctx.globalAlpha *= Math.floor(b.life * 16) % 2 ? 1 : 0.5;
  if (drawArt(b.healing ? 'soul_crossheart' : 'soul_crosshair', b.x, b.y, 30, 33)) return;
  ctx.strokeStyle = '#ff3030';
  ctx.beginPath();
  ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
  ctx.stroke();
};

BULLET_DRAWERS.soulBullet = b => {
  if (b.life < b.warn) return;
  const name = b.heal ? 'soul_flower' : 'soul_bullet';
  if (drawArt(name, b.x, b.y, 26, null, { angle: Math.atan2(b.vy, b.vx), tint: healTint(b) })) return;
  ctx.fillStyle = b.heal ? OMEGA_HEAL_TINT : '#ffe11a';
  fillCircle(b.x, b.y, b.r);
};

OmegaFlowey.attacks = ['lowerEyes', 'upperEyes', 'flamethrower', 'pellets', 'vines', 'mouthBeam', 'flytrap', 'bombs', 'fingerGuns', 'dentata',
  'knives', 'gloves', 'shoes', 'books', 'pans', 'gun'].map(id => OMEGA_ATTACKS[id]);
