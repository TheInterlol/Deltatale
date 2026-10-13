// Asgore - Undertale, Neutral finale.
// Reference: he destroys the MERCY button before the fight. His eyes flash cyan and orange in
// a sequence (with rising beeps) and his trident then sweeps the whole board in the same
// order: stand still for cyan, keep moving for orange. Fire: a double helix of fireballs,
// small waves down the middle alternating with big fire clouds over one side, partial rings
// spiralling inwards, hands that sweep the sides and leave fireballs aimed where the SOUL
// was, and rings of fire crossing from corner to corner. With more than 1 HP you survive any
// hit at 1 HP. Talking three times lowers his ATTACK and DEFENSE.

const Asgore = registerBoss({
  id: 'asgore',
  name: 'Asgore',
  game: 'undertale',
  color: '#ffcc4d',
  emblem: 'trident',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 140 },
  items: ['instantNoodles', 'faceSteak', 'legendaryHero', 'legendaryHero', 'snowmanPiece', 'glamburger', 'cinnaBun'],
  maxHp: 1800,
  attack: 7,
  defense: 0,
  checkAttack: 80,
  checkDefense: 80,
  gold: 0,
  noMercy: true,
  hitsLeaveOne: true,
  box: { w: 224, h: 184 },
  check: 'Knows best for you.',
  intro: '* ASGORE attacks!\n* (The MERCY button was destroyed.)',
  flavor: [
    '* ASGORE attacks!',
    '* You feel a strange sense of resolve.',
    '* ASGORE is looking at you with sad eyes.',
    '* ASGORE grips his trident tightly.',
    '* The trident gleams.'
  ],
  lowHpFlavor: '* ASGORE has low HP.',

  setup(battle) {
    this.attack = 7;
    this.defense = 0;
    battle.flags.talks = 0;
    battle.flags.pace = 1;
  },

  acts: [
    {
      name: 'Talk',
      description: 'Try to talk to him.',
      use(battle) {
        battle.flags.talks += 1;
        const t = battle.flags.talks;
        if (t === 1) return '* You tell ASGORE you don\'t want to fight him.\n* His hands tremble for a moment.';
        if (t === 2) return '* You firmly tell ASGORE to STOP fighting.\n* His breathing gets heavier.';
        if (t === 3) {
          Asgore.attack = 6;
          Asgore.defense = -10;
          return '* You told ASGORE to STOP fighting.\n* ASGORE\'s ATTACK dropped. ASGORE\'s DEFENSE dropped.';
        }
        return '* Seems talking won\'t do any more good.';
      }
    }
  ],

  getDialogue(battle) {
    if (battle.turn === 0) return null;
    return pick(['...', '...', 'It is the only way.', '...I am sorry.', null]);
  },

  chooseAttack(battle) {
    battle.flags.pace = Math.min(1.5, 1 + battle.turn * 0.025);
    const order = ['trident', 'helix', 'cloud', 'trident', 'spiral', 'hands', 'trident', 'rings', 'helix', 'tridentFire'];
    return ASGORE_ATTACKS[order[battle.turn % order.length]];
  },

  victoryText(battle, outcome) {
    return '* ASGORE kneels.\n* "...Ah... so that is how it is..."\n* YOU WON.';
  },

  attacks: []
});

const ASGORE_FIRE = '#ffffff';

function asgoreFire(x, y, vx, vy, r = 7, damage = 8) {
  return spawn({ kind: 'fire', x, y, vx, vy, r, damage, color: ASGORE_FIRE, maxLife: 8 });
}

function asgorePace(run) {
  return run.battle ? run.battle.flags.pace : 1 + run.level * 0.1;
}

// The trident: a telegraphed sequence of cyan/orange flashes, then sweeps in that order.
function tridentSequence(run, start, count) {
  const colors = [];
  for (let i = 0; i < count; i++) colors.push(chance(0.5) ? 'cyan' : 'orange');
  const flashGap = 0.45;
  colors.forEach((color, i) => {
    run.data.events.push([start + i * flashGap, () => {
      // his eye flashes the colour; the last beep is lower
      const at = bossPosition(Asgore);
      spawn({ kind: 'eyeFlash', x: at.x + 14, y: at.y - 30, r: 1, color, harmless: true, noCull: true, clip: false, maxLife: 0.35 });
      if (i === colors.length - 1) sfx.slam();
      else sfx.warn();
    }]);
  });
  const sweepStart = start + count * flashGap + 0.35;
  colors.forEach((color, i) => {
    run.data.events.push([sweepStart + i * 0.75, () => {
      const fromLeft = i % 2 === 0;
      spawn({
        kind: 'sweep', x: arena.x + arena.w / 2, y: arena.y + arena.h / 2, hw: arena.w / 2, hh: arena.h / 2,
        color, damage: 6, activeFor: 0.22, noCull: true, fromLeft
      });
    }]);
  });
  return sweepStart + count * 0.75;
}

const ASGORE_ATTACKS = {
  trident: {
    name: 'Trident',
    duration: 6.5,
    start(run) {
      run.data.events = [];
      const end = tridentSequence(run, 0.3, randInt(2, 4));
      run.attack = { ...run.attack, duration: end + 0.4 };
    },
    update(run) {
      timeline(run, run.data.events);
    }
  },
  tridentFire: {
    name: 'Trident and fire',
    duration: 7,
    start(run) {
      run.data.events = [];
      const end = tridentSequence(run, 0.3, 3);
      run.attack = { ...run.attack, duration: end + 0.4 };
    },
    update(run) {
      timeline(run, run.data.events);
      every(run, 'fire', 0.5 / asgorePace(run), () => asgoreFire(rand(arena.x + 10, arena.x + arena.w - 10), arena.y - 8, 0, 90), 0.4);
    }
  },
  helix: {
    name: 'Fire helix',
    duration: 6.5,
    update(run) {
      const pace = asgorePace(run);
      every(run, 'emit', 0.09 / pace, () => {
        const swing = (arena.w / 2 - 30) * Math.sin(run.t * 2.4 * pace);
        const cx = arena.x + arena.w / 2;
        asgoreFire(cx + swing, arena.y - 10, 0, 130 * pace, 6);
        asgoreFire(cx - swing, arena.y - 10, 0, 130 * pace, 6);
      }, 0);
    }
  },
  cloud: {
    name: 'Fire clouds',
    duration: 7,
    update(run) {
      const pace = asgorePace(run);
      // small waves down the middle...
      every(run, 'wave', 0.14 / pace, () => asgoreFire(arena.x + arena.w / 2 + rand(-22, 22), arena.y - 8, 0, 150, 5, 6), 0);
      // ...alternating with a huge cloud of fire over one side
      every(run, 'cloud', 1.6 / pace, () => {
        const left = run.data.left = !run.data.left;
        warnZone(left ? arena.x : arena.x + arena.w / 2 + 30, arena.y, arena.w / 2 - 30, arena.h, 0.55, 0.6, { kind: 'fireZone', damage: 8 });
      }, 0.5);
    }
  },
  spiral: {
    name: 'Fire circles',
    duration: 7,
    update(run) {
      const pace = asgorePace(run);
      every(run, 'ring', 1.5 / pace, () => {
        // a partial ring around the board that spirals inwards
        const c = { x: state.player.x, y: state.player.y };
        const count = 16;
        const gapStart = randInt(0, count - 1);
        const dir = chance(0.5) ? 1 : -1;
        for (let i = 0; i < count; i++) {
          if ((i - gapStart + count) % count < 4) continue;
          const a0 = (Math.PI * 2 * i) / count;
          spawn({
            kind: 'fire', x: c.x, y: c.y, r: 6, damage: 8, noCull: true, maxLife: 3.2,
            update(b) {
              const r = 170 - b.life * 70 * pace;
              const a = a0 + b.life * 0.9 * dir;
              b.x = c.x + Math.cos(a) * r;
              b.y = c.y + Math.sin(a) * r;
              if (r < 0) b.dead = true;
            }
          });
        }
      }, 0.2);
    }
  },
  hands: {
    name: 'Hands',
    duration: 7,
    update(run) {
      every(run, 'sweep', 2.2, () => {
        // a hand sweeps down one side and leaves big fireballs behind
        const left = run.data.left = !run.data.left;
        const target = { x: state.player.x, y: state.player.y };
        const x = left ? arena.x + 14 : arena.x + arena.w - 14;
        spawn({ kind: 'paw', x, y: arena.y - 10, vy: 150, r: 10, harmless: true, noCull: true, maxLife: 1.4, mirrored: false });
        for (let i = 0; i < 5; i++) {
          const y = arena.y + 15 + i * ((arena.h - 30) / 4);
          spawn({
            kind: 'fire', x, y, r: 9, damage: 6, warn: 0.2 + i * 0.18, noCull: true, maxLife: 4,
            update(b, dt) {
              if (b.life < b.warn + 0.35) return;
              if (!b.vx && !b.vy) {
                const a = Math.atan2(target.y - b.y, target.x - b.x);
                b.vx = Math.cos(a) * 190;
                b.vy = Math.sin(a) * 190;
              }
              b.x += b.vx * dt;
              b.y += b.vy * dt;
            }
          });
        }
      }, 0.2);
    }
  },
  rings: {
    name: 'Corner rings',
    duration: 7,
    update(run) {
      every(run, 'ring', 1.3, () => {
        run.data.n = (run.data.n || 0) + 1;
        const fromLeft = run.data.n % 2 === 1;
        const start = { x: fromLeft ? arena.x - 20 : arena.x + arena.w + 20, y: arena.y - 20 };
        const end = { x: fromLeft ? arena.x + arena.w + 40 : arena.x - 40, y: arena.y + arena.h + 40 };
        const count = 6 + Math.min(4, run.data.n);
        const vx = (end.x - start.x) / 3;
        const vy = (end.y - start.y) / 3;
        for (let i = 0; i < count; i++) {
          const a0 = (Math.PI * 2 * i) / count;
          spawn({
            kind: 'fire', x: start.x, y: start.y, r: 9, damage: 6, noCull: true, maxLife: 3.2,
            update(b) {
              const cx = start.x + vx * b.life;
              const cy = start.y + vy * b.life;
              const a = a0 + b.life * 1.5;
              b.x = cx + Math.cos(a) * 46;
              b.y = cy + Math.sin(a) * 46;
            }
          });
        }
      }, 0.2);
    }
  }
};

BULLET_DRAWERS.eyeFlash = b => {
  ctx.fillStyle = b.color === 'cyan' ? SOUL_COLORS.cyan : SOUL_COLORS.orange;
  ctx.globalAlpha = Math.max(0, 1 - b.life / b.maxLife);
  fillCircle(b.x, b.y, 10);
  fillCircle(b.x - 28, b.y, 10);
};

BULLET_DRAWERS.sweep = (b, fill) => {
  // the trident's swing: a bright crescent racing across the board with a fading wake
  const k = Math.min(1, b.life / 0.22);
  const fade = 1 - Math.max(0, (b.life - 0.18) / 0.2);
  const w = b.hw * 2;
  const left = b.x - b.hw;
  const edge = b.fromLeft ? left + w * k : left + w * (1 - k);
  const dir = b.fromLeft ? 1 : -1;
  const top = b.y - b.hh;
  const h = b.hh * 2;
  ctx.save();
  ctx.globalAlpha *= Math.max(0, fade);
  const wake = ctx.createLinearGradient(edge, 0, edge - dir * w * 0.9, 0);
  wake.addColorStop(0, withAlpha(fill, 0.85));
  wake.addColorStop(1, withAlpha(fill, 0));
  ctx.fillStyle = wake;
  ctx.fillRect(Math.min(edge, edge - dir * w * 0.9), top, w * 0.9, h);
  // the crescent at the leading edge
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(edge, top);
  ctx.quadraticCurveTo(edge + dir * 26, b.y, edge, top + h);
  ctx.quadraticCurveTo(edge + dir * 10, b.y, edge, top);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(edge - dir * 4, top);
  ctx.quadraticCurveTo(edge + dir * 14, b.y, edge - dir * 4, top + h);
  ctx.quadraticCurveTo(edge - dir * 8, b.y, edge - dir * 4, top);
  ctx.fill();
  ctx.restore();
};

BULLET_DRAWERS.fireZone = (b, fill) => {
  const x = b.x - b.hw;
  const y = b.y - b.hh;
  if (b.life < b.warn) {
    ctx.strokeStyle = Math.floor(b.life * 14) % 2 === 0 ? '#ff3030' : '#801010';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, b.hw * 2 - 2, b.hh * 2 - 2);
    return;
  }
  ctx.fillStyle = '#fff';
  for (let yy = y + 8; yy < y + b.hh * 2; yy += 16) {
    for (let xx = x + 8 + ((yy / 16) % 2) * 8; xx < x + b.hw * 2; xx += 16) drawFlame(xx, yy, 8, state.clock);
  }
};

Asgore.attacks = Object.values(ASGORE_ATTACKS);
