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
  box: { w: 140, h: 140 },
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

// Where the Knight stands (top right); its attacks come from there.
function knightOrigin() {
  return { x: arena.x + arena.w + 70, y: arena.y - 50 };
}

// A six-pointed star fired from the Knight's cone: it flies in, grows, slows and drifts back,
// turns red, then bursts into shards. Thin light beams show where the shards will go.
function knightStar(target, phase, delay = 0) {
  const o = knightOrigin();
  const ang = Math.atan2(target.y - o.y, target.x - o.x);
  const dist = Math.hypot(target.x - o.x, target.y - o.y);
  const shardCount = phase === 3 ? 2 : 6;
  const offset = Math.random() * Math.PI * 2;
  const burstAt = 1.35 + delay;
  return spawn({
    kind: 'knightStar', x: o.x, y: o.y, r: 6, noCull: true, clip: false, maxLife: burstAt + 0.05, damage: 30,
    update(b) {
      const t = b.life;
      // in quickly, overshoot, then drift back a little
      const k = Math.min(1, t / 0.7);
      const ease = 1 - Math.pow(1 - k, 3);
      const back = t > 0.7 ? Math.min(1, (t - 0.7) / 0.6) * 18 : 0;
      b.x = o.x + Math.cos(ang) * (dist * ease - back);
      b.y = o.y + Math.sin(ang) * (dist * ease - back);
      b.r = 6 + Math.min(1, t / 0.9) * 6;
      b.red = t > burstAt - 0.45;
      b.rays = t > burstAt - 0.45 ? { count: shardCount, offset } : null;
      if (t >= burstAt && !b.burst) {
        b.burst = true;
        b.dead = true;
        sfx.pop();
        addBurst(b.x, b.y, '#ff6b6b', 6, 80);
        for (let i = 0; i < shardCount; i++) {
          const a = offset + (Math.PI * 2 * i) / shardCount;
          const far = phase === 1 && i % 2 ? 0.55 : 1;
          if (phase === 3) {
            // two red shards that home in on the SOUL one after another
            spawn({
              kind: 'suit', suit: 'diamond', x: b.x, y: b.y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, r: 5,
              color: '#ff5050', maxLife: 3, faceVelocity: true, damage: 30, noCull: true,
              update(s, dt) {
                if (s.life > 0.35 + i * 0.35 && !s.locked) {
                  s.locked = true;
                  const v = aimAt(s.x, s.y, 260);
                  s.vx = v.vx;
                  s.vy = v.vy;
                }
                s.x += s.vx * dt;
                s.y += s.vy * dt;
              }
            });
          } else {
            spawn({
              kind: 'suit', suit: 'diamond', x: b.x, y: b.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 5,
              color: '#e0e0ff', maxLife: far < 1 ? 0.55 : 3, faceVelocity: true, damage: 30
            });
          }
        }
      }
    }
  });
}

const KNIGHT_ATTACKS = {
  stars: {
    name: 'Stars', duration: 7,
    update(run) {
      const phase = knightPhase(run);
      every(run, 'volley', phase >= 2 ? 1.25 : 1.5, () => {
        // a cone of 2-3 stars aimed around the board
        const count = phase >= 2 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const target = pickPointAwayFromPlayer(55, 22);
          knightStar(target, phase, phase === 2 ? i * 0.25 : 0);
        }
      }, 0.2);
    }
  },
  tracking: {
    name: 'Tracking swords', duration: 9,
    start(run) {
      run.data.count = 0;
    },
    update(run) {
      const phase = knightPhase(run);
      // ten swords, each faster than the last
      const gap = Math.max(0.45, (phase >= 3 ? 0.75 : 0.95) - run.data.count * 0.04);
      every(run, 'sword', gap, () => {
        if (run.data.count >= 10) return;
        run.data.count++;
        const dirs = [0, 1, 2, 3, 4, 5, 6, 7].map(i => (i * Math.PI) / 4);
        const a = pick(dirs);
        const countdown = Math.max(0.45, 1.0 - run.data.count * 0.05);
        // the sword hovers at a fixed offset from the SOUL and follows it, pointing at it
        spawn({
          kind: 'knightSword', x: state.player.x, y: state.player.y, len: 34, angle: a + Math.PI, harmless: true,
          noCull: true, clip: false, maxLife: countdown + 0.2,
          update(b) {
            const p = state.player;
            if (b.life < countdown) {
              b.x = p.x + Math.cos(a) * 56;
              b.y = p.y + Math.sin(a) * 56;
              b.red = b.life > countdown - 0.25;
            } else if (!b.cut) {
              // it freezes, vanishes and leaves a white slash along its line
              b.cut = true;
              b.dead = true;
              spawn({ kind: 'slashLine', x: b.x, y: b.y, hw: 420, hh: 5, angle: a, warn: 0.12, activeFor: 0.18, noCull: true, damage: 40 });
              sfx.slash();
            }
          }
        });
      }, 0.3);
      // phase 2: a ring of swords around the board breathes in and out
      if (phase === 2) {
        once(run, 'ring', 0.2, () => {
          const c = arenaCenter();
          const n = 16;
          for (let i = 0; i < n; i++) {
            const a0 = (Math.PI * 2 * i) / n;
            spawn({
              kind: 'knightSword', x: c.x, y: c.y, len: 22, angle: a0 + Math.PI, noCull: true, maxLife: 9, damage: 30, hw: 10, hh: 3,
              update(b) {
                const r = 92 + Math.sin(b.life * 1.4) * 34;
                const a = a0 + b.life * 0.25;
                b.x = c.x + Math.cos(a) * r;
                b.y = c.y + Math.sin(a) * r;
                b.angle = a + Math.PI;
              }
            });
          }
        });
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
        // the board splits open along the cut for a moment
        const c = arenaCenter();
        spawn({
          kind: 'crack', x: burst.vertical ? burst.line : c.x, y: burst.vertical ? c.y : burst.line,
          vertical: burst.vertical, harmless: true, noCull: true, maxLife: 1.1
        });
        for (let i = 0; i < 6; i++) {
          const along = burst.vertical ? arena.y + (arena.h * (i + 0.5)) / 6 : arena.x + (arena.w * (i + 0.5)) / 6;
          for (const dir of [-1, 1]) {
            const x = burst.vertical ? burst.line : along;
            const y = burst.vertical ? along : burst.line;
            const sideways = burst.diag ? rand(-60, 60) : 0;
            // fast and slow diamonds alternate, never more than two of the same speed in a row
            const speed = [210, 210, 110][(i + (dir > 0 ? 1 : 0)) % 3];
            spawn({
              kind: 'suit', suit: 'diamond', x, y,
              vx: burst.vertical ? dir * speed : sideways, vy: burst.vertical ? sideways : dir * speed,
              r: 5, color: '#e0e0ff', maxLife: 2.5, faceVelocity: true, damage: 40
            });
          }
        }
        return false;
      });
    }
  },
  tunnel: {
    name: 'Sword tunnel', duration: 7.5,
    update(run) {
      const phase = knightPhase(run);
      const gapSize = phase >= 3 ? 34 : 46;
      every(run, 'pair', 0.2, () => {
        // swords from above and below, shifting together: stay in the tunnel between them
        const centre = arena.y + arena.h / 2 + Math.sin(run.t * 1.3) * (arena.h / 2 - gapSize);
        const x = arena.x + arena.w + 20;
        const topH = centre - gapSize / 2 - arena.y;
        const bottomH = arena.y + arena.h - (centre + gapSize / 2);
        const tilt = phase >= 2 ? Math.sin(run.t) * 0.2 : 0;
        if (topH > 4) spawn({ kind: 'tunnelSword', x, y: arena.y + topH / 2, vx: -230, hw: 6, hh: topH / 2, angle: tilt, down: true, damage: 20, noCull: true, maxLife: 3 });
        if (bottomH > 4) spawn({ kind: 'tunnelSword', x, y: arena.y + arena.h - bottomH / 2, vx: -230, hw: 6, hh: bottomH / 2, angle: tilt, down: false, damage: 20, noCull: true, maxLife: 3 });
      }, 0.1);
      // the finisher: swords line up outside the board, show red lines, then fly across
      once(run, 'finisher', 5.9, () => {
        for (let i = 0; i < 5; i++) {
          const y = arena.y + (arena.h * (i + 0.5)) / 5;
          const fromLeft = i % 2 === 0;
          const x0 = fromLeft ? arena.x - 30 : arena.x + arena.w + 30;
          spawn({
            kind: 'knightSword', x: x0, y, len: 30, angle: fromLeft ? 0 : Math.PI, warn: 0.7, noCull: true, clip: false, maxLife: 2.4,
            damage: 60, hw: 15, hh: 3, warnLine: true,
            update(b, dt) {
              if (b.life >= b.warn) b.x += (fromLeft ? 1 : -1) * 520 * dt;
            }
          });
        }
      });
    }
  },
  slash: {
    name: 'Rotating slash', duration: 8,
    update(run) {
      const phase = knightPhase(run);
      // six slashes; the number of lines in each follows the original's sequence
      const counts = { 1: [1, 2, 2, 3, 3, 4], 2: [3, 3, 4, 4, 4, 4], 3: [3, 4, 4, 4, 4, 4] }[phase];
      every(run, 'slash', 1.2, () => {
        run.data.cut = (run.data.cut || 0) + 1;
        if (run.data.cut > 6) return;
        const count = counts[run.data.cut - 1];
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
      run.data.events.push([7.2, () => spawnBeam(arena.x + arena.w / 2, arena.y - 80, Math.PI / 2, 70, 0.8, 0.3, { beamColor: '#ffffff', drawEmitter: false, damage: 60 })]);
    },
    update(run) {
      timeline(run, run.data.events);
    }
  }
};

function drawKnightBlade(len, red) {
  // his sword sprite (pointing right), red when it is about to strike
  if (drawArt('knight_sword', 0, 0, len * 1.1, Math.max(8, len * 1.1 * 31 / 175), { flipX: true, tint: red ? '#ff5050' : null })) return;
  drawKnightBladeShape(len, red);
}

function drawKnightBladeShape(len, red) {
  // a long, thin blade with a cross guard (pointing +x)
  ctx.fillStyle = red ? '#ff4040' : '#e8e8ff';
  ctx.beginPath();
  ctx.moveTo(len / 2 + 6, 0);
  ctx.lineTo(-len / 2 + 6, -3);
  ctx.lineTo(-len / 2 + 6, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = red ? '#ffffff' : '#ffffff';
  ctx.fillRect(-len / 2 + 6, -0.6, len - 4, 1.2);
  ctx.fillStyle = '#6a6a8a';
  ctx.fillRect(-len / 2 + 3, -7, 3, 14);
  ctx.fillRect(-len / 2 - 6, -1.5, 9, 3);
}

BULLET_DRAWERS.knightSword = b => {
  ctx.save();
  if (b.warnLine && b.life < b.warn) {
    ctx.strokeStyle = Math.floor(b.life * 14) % 2 ? 'rgba(255, 60, 60, 0.8)' : 'rgba(255, 60, 60, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + Math.cos(b.angle) * 600, b.y + Math.sin(b.angle) * 600);
    ctx.stroke();
  }
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  drawKnightBlade(b.len || 30, b.red);
  ctx.restore();
};

BULLET_DRAWERS.tunnelSword = b => {
  // a column of the tunnel: a blade pointing at the gap; it glows red when the SOUL is close
  const p = state.player;
  const near = Math.abs(p.x - b.x) < 26;
  ctx.translate(b.x, b.y);
  if (b.angle) ctx.rotate(b.angle);
  ctx.rotate(b.down ? Math.PI / 2 : -Math.PI / 2);
  drawKnightBlade(b.hh * 2, near);
};

BULLET_DRAWERS.knightStar = b => {
  ctx.translate(b.x, b.y);
  if (b.rays) {
    // light beams telegraph where the shards will fly
    ctx.strokeStyle = 'rgba(255, 220, 220, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < b.rays.count; i++) {
      const a = b.rays.offset + (Math.PI * 2 * i) / b.rays.count;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 300, Math.sin(a) * 300);
      ctx.stroke();
    }
  }
  ctx.rotate(b.life * 3);
  if (drawArt('knight_star', 0, 0, b.r * 4.2, b.r * 4.2, { frame: state.clock * 8, tint: b.red ? '#ff4d4d' : null })) return;
  const color = b.red ? '#ff4d4d' : '#ffffff';
  ctx.fillStyle = withAlpha(b.red ? '#ff4d4d' : '#c8c8ff', 0.3);
  fillCircle(0, 0, b.r * 1.5);
  // a six-pointed star: two triangles
  ctx.fillStyle = color;
  for (const rot of [0, Math.PI]) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI * 2) / 3;
      ctx.lineTo(Math.cos(a) * b.r, Math.sin(a) * b.r);
    }
    ctx.closePath();
    ctx.fill();
  }
};

BULLET_DRAWERS.crack = b => {
  // the two halves of the board pushed apart: a dark gap with bright edges
  const k = Math.sin(Math.min(1, b.life / 1.1) * Math.PI);
  const gap = 4 + k * 16;
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  if (b.vertical) {
    ctx.fillRect(b.x - gap / 2, arena.y - 2, gap, arena.h + 4);
    ctx.strokeRect(b.x - gap / 2, arena.y - 2, gap, arena.h + 4);
  } else {
    ctx.fillRect(arena.x - 2, b.y - gap / 2, arena.w + 4, gap);
    ctx.strokeRect(arena.x - 2, b.y - gap / 2, arena.w + 4, gap);
  }
};

BULLET_DRAWERS.slashLine = b => {
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  if (b.life < b.warn) {
    ctx.fillStyle = 'rgba(255, 40, 40, 0.6)';
    ctx.fillRect(-b.hw, -1, b.hw * 2, 2);
  } else {
    if (drawArt('knight_quickslash', 0, 0, b.hw * 2, Math.max(b.hh * 4, 16), { frame: (b.life - b.warn) * 24 })) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
  }
};

Knight.attacks = KNIGHT_CYCLE.map(id => KNIGHT_ATTACKS[id]).concat([KNIGHT_ATTACKS.roar]);

// The dark: purple smoke drifting behind everything (from the fight).
Knight.drawBackdrop = () => {
  if (!attackImage('knight_flow')) return false;
  ctx.save();
  ctx.globalAlpha = 0.6;
  const off = (state.clock * 14) % 720;
  for (let x = -off; x < VIEW_W; x += 720) drawArt('knight_flow', x + 360, 202, 720, 540, { frame: 0 });
  ctx.restore();
  return true;
};
