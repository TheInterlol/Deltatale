// The Roaring Knight - Deltarune Chapter 3 finale.
// Reference: a fixed 15-turn cycle (then turns 11-15 loop): Stars (clusters bursting into
// shards), Tracking Swords (swords appear around the SOUL and fire one by one; later a
// shrinking circle of swords), Box Splitter (the board is cut - the cut itself takes a huge
// chunk of HP but never your last point - and diamonds fly out of the gap), Sword Tunnel
// (swords slide in from above and below leaving a gap that gets narrower) and Rotating Slash
// (red lines rotate around the centre, then freeze into slashes). Below 80 % HP it charges up
// and ROARS: the board fills the screen, stars spiral in and burst, ending in one huge slash.
// After that any hit ends the fight. HoldBreath makes the SOUL faster for the rest of the fight.

const KNIGHT_CYCLE = ['stars', 'tracking', 'splitter', 'tunnel', 'slash'];

const Knight = registerBoss({
  id: 'knight',
  name: 'The Roaring Knight',
  shortName: 'The Roaring Knight',
  game: 'deltarune',
  color: '#c8c8ff',
  emblem: 'sword',

  player: { name: 'SUSIE', maxHp: 220, power: 55 },
  items: ['clubsSandwich', 'clubsSandwich', 'topCake', 'topCake', 'reviveMint'],
  maxHp: 1400,
  attack: 42,
  defense: 0,
  checkAttack: '???',
  checkDefense: '???',
  hideHp: true,
  gold: 0,
  box: { w: 220, h: 170 },
  check: '...',
  intro: '* The Knight is here.',
  flavor: [
    '* The Knight is silent.',
    '* The air is cold.',
    '* Your SOUL is trembling.',
    '* The Knight raises its sword.'
  ],

  setup(battle) {
    battle.flags.roarStage = 0;   // 0 = normal, 1 = slash variant, 2 = charging, 3 = roared
    battle.flags.breath = false;
  },

  acts: [
    {
      name: 'HoldBreath',
      description: 'Your SOUL moves faster for the rest of the fight.',
      use(battle) {
        if (battle.flags.breath) return '* You held your breath again.\n* ...Nothing more happened.';
        battle.flags.breath = true;
        return '* You held your breath.\n* Your SOUL feels lighter! (SOUL speed up)';
      }
    }
  ],

  getFlavor(battle) {
    const stage = battle.flags.roarStage;
    if (stage === 2) return '* The Knight is gathering power...\n* (Now\'s your chance to heal.)';
    if (stage === 3) return '* The Knight is staggering.\n* One more hit...!';
    const next = this.peekAttack(battle);
    return {
      stars: '* The stars glimmer in the dark.',
      tracking: '* Swords hang in the air around you.',
      splitter: '* The Knight raises its blade high.',
      tunnel: '* A tunnel of blades opens up.',
      slash: '* The air itself feels sharp.'
    }[next] || null;
  },

  peekAttack(battle) {
    const t = battle.turn;
    const index = t < 15 ? t : 10 + ((t - 15) % 5);
    return KNIGHT_CYCLE[index % 5];
  },

  getDialogue() {
    return null;
  },

  onDamaged(battle) {
    if (battle.flags.roarStage === 3) {
      battle.bossHp = 0;
      return;
    }
    // it can't be finished before the roar
    battle.bossHp = Math.max(1, battle.bossHp);
    if (battle.flags.roarStage === 0 && battle.bossHp < this.maxHp * 0.8) battle.flags.roarStage = 1;
  },

  victoryText() {
    return '* The Knight staggered and vanished into the dark.\n* Susie: "Yeah! Run away, you coward!"\n* YOU WON!';
  },

  chooseAttack(battle) {
    state.player.speed = battle.flags.breath ? SOUL_SPEED * 1.3 : SOUL_SPEED;
    const f = battle.flags;
    if (f.roarStage === 1) {
      f.roarStage = 2;
      return { ...KNIGHT_ATTACKS.slash, name: 'Rotating slash (charged)', phase: 3 };
    }
    if (f.roarStage === 2 && !f.charged) {
      f.charged = true;
      return KNIGHT_ATTACKS.charge;
    }
    if (f.roarStage === 2 && f.charged) {
      f.roarStage = 3;
      return KNIGHT_ATTACKS.roar;
    }
    const phase = battle.turn < 5 ? 1 : battle.turn < 10 ? 2 : 3;
    const id = this.peekAttack(battle);
    return { ...KNIGHT_ATTACKS[id], phase };
  },

  attacks: []
});

function knightPhase(run) {
  return run.attack.phase || 1 + Math.min(2, run.level);
}

const KNIGHT_ATTACKS = {
  stars: {
    name: 'Stars', duration: 6.5,
    update(run) {
      const phase = knightPhase(run);
      every(run, 'cluster', 0.8, () => {
        const p = pickPointAwayFromPlayer(60, 20);
        spawn({
          kind: 'star', x: p.x, y: p.y, r: 9, warn: 0.6, activeFor: 0, noCull: true, maxLife: 0.62, color: '#ffffff',
          update(b) {
            if (b.life >= 0.6 && !b.burst) {
              b.burst = true;
              const count = phase === 1 ? 3 : phase === 2 ? 6 : 2;
              const base = phase === 3 ? aimAt(b.x, b.y, 1).angle : Math.random() * Math.PI * 2;
              for (let i = 0; i < count; i++) {
                const a = phase === 3 ? base + (i - 0.5) * 0.2 : base + (Math.PI * 2 * i) / count;
                spawn({ kind: 'suit', suit: 'diamond', x: b.x, y: b.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 5, color: '#e0e0ff', maxLife: 3, faceVelocity: true, damage: 30 });
              }
            }
          }
        });
      }, 0.2);
    }
  },
  tracking: {
    name: 'Tracking swords', duration: 7,
    update(run) {
      const phase = knightPhase(run);
      every(run, 'sword', 0.7, () => {
        // a sword appears near the SOUL, aims, then fires
        const p = state.player;
        const a = Math.random() * Math.PI * 2;
        const x = p.x + Math.cos(a) * 90;
        const y = p.y + Math.sin(a) * 90;
        const aim = Math.atan2(p.y - y, p.x - x);
        spawn({
          kind: 'spear', x, y, hw: 16, hh: 3, angle: aim, warn: 0.5, noCull: true, maxLife: 2, color: '#e0e0ff', damage: 50,
          update(b, dt) {
            if (b.life < b.warn) {
              b.angle = Math.atan2(state.player.y - b.y, state.player.x - b.x);
              return;
            }
            b.x += Math.cos(b.angle) * 380 * dt;
            b.y += Math.sin(b.angle) * 380 * dt;
          }
        });
      }, 0.2);
      if (phase >= 2) {
        every(run, 'ring', 2.4, () => {
          const c = { x: state.player.x, y: state.player.y };
          const gap = randInt(0, 11);
          for (let i = 0; i < 12; i++) {
            if (i === gap) continue;
            const a0 = (Math.PI * 2 * i) / 12;
            spawn({
              kind: 'spear', x: c.x, y: c.y, hw: 12, hh: 2, warn: 0.4, noCull: true, maxLife: 2.2, color: '#c8c8ff', damage: 40,
              update(b) {
                const r = 120 - Math.max(0, b.life - b.warn) * 75;
                b.x = c.x + Math.cos(a0) * r;
                b.y = c.y + Math.sin(a0) * r;
                b.angle = a0 + Math.PI;
                if (r < 0) b.dead = true;
              }
            });
          }
        }, 1.2);
      }
    }
  },
  splitter: {
    name: 'Box splitter', duration: 7,
    update(run) {
      const phase = knightPhase(run);
      every(run, 'cut', 2.2, () => {
        // a line flashes across the board, then the cut: it takes 66 % of max HP, never the last point
        const vertical = phase >= 2 ? chance(0.5) : false;
        const c = arenaCenter();
        const offset = rand(-30, 30);
        const x = vertical ? c.x + offset : arena.x - 80;
        const y = vertical ? arena.y - 80 : c.y + offset;
        const cut = spawnBeam(x, y, vertical ? Math.PI / 2 : 0, 10, 0.8, 0.15, { beamColor: '#ff3030', drawEmitter: false, damage: 0 });
        cut.onHit = () => {
          const p = state.player;
          p.hp = Math.max(1, p.hp - Math.round(p.maxHp * 0.66));
          addPopup('CUT', p.x, p.y - 14, '#ff3030');
        };
        // diamonds burst out of the gap
        run.data.bursts = run.data.bursts || [];
        run.data.bursts.push({ at: run.t + 0.95, vertical, line: vertical ? c.x + offset : c.y + offset, diag: phase >= 3 });
      }, 0.3);
      run.data.bursts = (run.data.bursts || []).filter(burst => {
        if (run.t < burst.at) return true;
        addShake(6);
        for (let i = 0; i < 6; i++) {
          const along = burst.vertical ? arena.y + (arena.h * (i + 0.5)) / 6 : arena.x + (arena.w * (i + 0.5)) / 6;
          for (const dir of [-1, 1]) {
            const x = burst.vertical ? burst.line : along;
            const y = burst.vertical ? along : burst.line;
            const sideways = burst.diag ? rand(-60, 60) : 0;
            spawn({
              kind: 'suit', suit: 'diamond', x, y,
              vx: burst.vertical ? dir * 150 : sideways, vy: burst.vertical ? sideways : dir * 150,
              r: 5, color: '#e0e0ff', maxLife: 2.5, faceVelocity: true, damage: 40
            });
          }
        }
        return false;
      });
    }
  },
  tunnel: {
    name: 'Sword tunnel', duration: 7,
    update(run) {
      const phase = knightPhase(run);
      const gapSize = phase >= 3 ? 34 : 46;
      every(run, 'pair', 0.2, () => {
        // the gap drifts: follow it
        const centre = arena.y + arena.h / 2 + Math.sin(run.t * 1.3) * (arena.h / 2 - gapSize);
        const x = arena.x + arena.w + 20;
        const topH = centre - gapSize / 2 - arena.y;
        const bottomH = arena.y + arena.h - (centre + gapSize / 2);
        const tilt = phase >= 2 ? Math.sin(run.t) * 0.2 : 0;
        if (topH > 4) spawn({ kind: 'normal', x, y: arena.y + topH / 2, vx: -230, hw: 7, hh: topH / 2, angle: tilt, color: '#e0e0ff', damage: 20, noCull: true, maxLife: 3 });
        if (bottomH > 4) spawn({ kind: 'normal', x, y: arena.y + arena.h - bottomH / 2, vx: -230, hw: 7, hh: bottomH / 2, angle: tilt, color: '#e0e0ff', damage: 20, noCull: true, maxLife: 3 });
      }, 0.1);
      once(run, 'finisher', 6.2, () => spawnBeam(arena.x - 60, state.player.y, 0, 26, 0.5, 0.2, { beamColor: '#ffffff', drawEmitter: false, damage: 60 }));
    }
  },
  slash: {
    name: 'Rotating slash', duration: 7,
    update(run) {
      const phase = knightPhase(run);
      const count = 1 + Math.min(3, Math.floor(run.t / 2)) + (phase >= 3 ? 1 : 0);
      every(run, 'slash', 1.3, () => {
        const c = arenaCenter();
        for (let i = 0; i < count; i++) {
          const start = Math.random() * Math.PI;
          // a red line spins around the centre, then freezes into a slash
          spawn({
            kind: 'slashLine', x: c.x, y: c.y, hw: 260, hh: 4, angle: start, warn: 0.9, activeFor: 0.2, noCull: true, clip: true, damage: 30,
            update(b, dt) {
              if (b.life < b.warn - 0.25) b.angle += dt * (1.8 + i * 0.4);
            }
          });
        }
      }, 0.2);
    }
  },
  charge: {
    name: 'Charging', duration: 1.5, quiet: true,
    update() {}
  },
  roar: {
    name: 'ROARING', duration: 9,
    box: { w: 620, h: 300 },
    start(run) {
      run.data.events = [];
      for (let w = 0; w < 4; w++) {
        run.data.events.push([0.3 + w * 1.6, () => {
          // stars spiral in towards the centre, then burst in six directions
          const c = arenaCenter();
          for (let i = 0; i < 6; i++) {
            const a0 = (Math.PI * 2 * i) / 6 + w;
            spawn({
              kind: 'star', x: c.x, y: c.y, r: 7, noCull: true, maxLife: 4, color: '#ffffff', damage: 25,
              update(b, dt) {
                if (b.life < 1.2) {
                  const r = 260 * (1 - b.life / 1.2) + 10;
                  const a = a0 + b.life * 2;
                  b.x = c.x + Math.cos(a) * r;
                  b.y = c.y + Math.sin(a) * r * 0.55;
                } else {
                  if (!b.vx) {
                    b.vx = Math.cos(a0) * 220;
                    b.vy = Math.sin(a0) * 220;
                  }
                  b.x += b.vx * dt;
                  b.y += b.vy * dt;
                }
              }
            });
          }
        }]);
      }
      run.data.events.push([7.2, () => spawnBeam(arena.x + arena.w / 2 + rand(-120, 120), arena.y - 80, Math.PI / 2, 60, 0.8, 0.3, { beamColor: '#ffffff', drawEmitter: false, damage: 60 })]);
    },
    update(run) {
      timeline(run, run.data.events);
    }
  }
};

BULLET_DRAWERS.slashLine = b => {
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  if (b.life < b.warn) {
    ctx.fillStyle = 'rgba(255, 40, 40, 0.6)';
    ctx.fillRect(-b.hw, -1, b.hw * 2, 2);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
  }
};

Knight.attacks = KNIGHT_CYCLE.map(id => KNIGHT_ATTACKS[id]).concat([KNIGHT_ATTACKS.roar]);
