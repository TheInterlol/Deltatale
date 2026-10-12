// The Titan - Deltarune Chapter 4 finale.
// Reference: the fight happens in darkness. The SOUL gives off light: white bullets that
// enter the light are purified into COURAGE, which is where TP comes from (Brighten widens the
// light). The Titan has a shield that halves damage; Unleash (80 % TP) drops it for two turns
// and moves the fight to the next phase. Shield-up phases: Swarm (spawn chase the SOUL),
// Centipedes (segmented bodies circle and rush), The Hands (giant hands close in and fire;
// their eyes have to be purified). Shield-down phases: Big Shots of darkness that can't be
// purified. At half HP it covers itself and heals - then an old man with a hammer breaks the
// shield and joins, DualBuster breaks it again, and Susie's Idea finishes the Titan.

const TITAN_LIGHT = 34;

const Titan = registerBoss({
  id: 'titan',
  name: 'Titan',
  game: 'deltarune',
  color: '#9b7bff',
  emblem: 'star',

  player: { name: 'SUSIE', maxHp: 240, power: 58 },
  items: ['clubsSandwich', 'clubsSandwich', 'topCake', 'topCake', 'reviveMint'],
  maxHp: 2000,
  attack: 40,
  defense: 0,
  checkAttack: 30,
  checkDefense: 18,
  gold: 0,
  box: { w: 240, h: 180 },
  cannotBeFought: true,
  check: 'A colossal creature of darkness. Fight with LIGHT.',
  intro: '* The TITAN rises out of the dark!\n* (Your SOUL glows. White bullets become COURAGE.)',
  flavor: [
    '* The darkness is suffocating.',
    '* The Titan\'s eyes burn.',
    '* Your SOUL\'s light flickers.',
    '* Spawn crawl at the edge of the light.'
  ],

  setup(battle) {
    battle.flags.shield = true;
    battle.flags.downTurns = 0;
    battle.flags.phase = 1;
    battle.flags.unleashes = 0;
    battle.flags.bright = false;
    battle.flags.ending = 0;   // 0 = normal, 1..4 healing turns, 5 = old man, 6 = dual buster done, 7 = susie's idea
    battle.flags.dualBusters = 0;
  },

  statusText(battle) {
    const f = battle.flags;
    if (f.ending >= 5) return 'SHIELD: cracked by the old man\'s hammer';
    return f.shield ? 'SHIELD UP (damage halved)' : `SHIELD DOWN for ${f.downTurns} turn(s)!`;
  },

  get acts() {
    const battle = state.battle;
    const f = battle && battle.boss === Titan ? battle.flags : null;
    if (f && f.ending >= 5) {
      if (f.dualBusters >= 2) return [{ name: 'Susie\'s Idea', description: 'Finish it.', use: titanFinish }];
      return [{ name: 'DualBuster', description: 'Susie and the old man fire together.', use: titanDualBuster }];
    }
    return [
      {
        name: 'Unleash', tp: 80, description: 'Drop the shield for 2 turns.',
        use(b) {
          b.flags.shield = false;
          b.flags.downTurns = 2;
          b.flags.unleashes += 1;
          b.flags.phase = Math.min(6, b.flags.phase + 1);
          addShake(6);
          return '* Susie unleashed all her courage!\n* The Titan\'s shield shattered! (2 turns)';
        }
      },
      {
        name: 'Brighten', tp: 4, description: 'Your light grows for one turn.',
        use(b) {
          b.flags.bright = true;
          return '* Susie shouted into the dark!\n* The SOUL\'s light grew brighter!';
        }
      },
      {
        name: 'Heal', tp: 16, description: 'Heal some HP.',
        use(b) {
          b.flags.heals = (b.flags.heals || 0) + 1;
          const amount = Math.max(20, 70 - b.flags.heals * 10);
          const healed = Math.min(amount, state.player.maxHp - state.player.hp);
          state.player.hp += healed;
          return `* Susie gritted her teeth and pushed on.\n* Recovered ${healed} HP.`;
        }
      }
    ];
  },
  set acts(value) {},

  onDamaged(battle, damage) {
    const f = battle.flags;
    // the shield halves damage; with it down the Titan takes a beating
    if (f.shield && f.ending < 5) battle.bossHp = Math.min(battle.boss.maxHp, battle.bossHp + Math.floor(damage / 2));
    else if (!f.shield) battle.bossHp = Math.max(1, battle.bossHp - damage * 2);
    // it can't be killed by damage alone
    battle.bossHp = Math.max(1, battle.bossHp);
    if (!f.ending && battle.bossHp <= battle.boss.maxHp / 2) f.ending = 1;
  },

  getFlavor(battle) {
    const f = battle.flags;
    if (f.ending >= 1 && f.ending <= 4) return '* The Titan covered itself with its wings...\n* It\'s healing!';
    if (f.ending === 5) return '* An old man with a hammer cracked the shield!\n* "Hohoho! Let me help, youngster!"';
    if (f.dualBusters >= 2) return '* Susie has an idea...';
    return null;
  },

  getDialogue() {
    return null;
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (f.ending >= 1 && f.ending <= 4) {
      f.ending += 1;
      const heal = f.ending === 5 ? 300 : 120;
      battle.bossHp = Math.min(battle.boss.maxHp, battle.bossHp + heal);
      f.shield = true;
      return TITAN_ATTACKS.wings;
    }
    if (!f.shield) return f.phase >= 6 ? TITAN_ATTACKS.desperation : TITAN_ATTACKS.bigShots;
    const list = ['swarm', 'centipedes', 'hands'];
    return TITAN_ATTACKS[list[battle.turn % list.length]];
  },

  onTurnEnd(battle) {
    const f = battle.flags;
    f.bright = false;
    if (!f.shield) {
      f.downTurns -= 1;
      if (f.downTurns <= 0) f.shield = true;
    }
    if (f.ending === 5 && !f.oldMan) {
      f.oldMan = true;
      f.shield = false;
      f.downTurns = 99;
    }
  },

  victoryText() {
    return '* Susie threw Kris straight into the Titan!\n* Light burst out from inside it... and the Titan crumbled.\n* YOU WON!';
  },

  attacks: []
});

function titanDualBuster(battle) {
  battle.flags.dualBusters += 1;
  sfx.buster();
  addShake(8);
  const at = bossPosition(battle.boss);
  addSlash(at.x, at.y);
  battle.bossHp = Math.max(1, battle.bossHp - 250);
  addPopup('250', at.x, at.y - 10, '#ff4fd8');
  return battle.flags.dualBusters >= 2
    ? '* DUAL BUSTER! The shield broke for good!\n* Susie: "Hey... I\'ve got an idea."'
    : '* Susie and the old man fired a DUAL BUSTER!\n* The Titan reeled back!';
}

function titanFinish(battle) {
  battle.bossHp = 0;
  winBattle(battle, 'defeated');
  return '';
}

// Purification: white bullets that touch the SOUL's light turn into COURAGE (TP).
function titanPurify(run) {
  const p = state.player;
  const battle = run.battle;
  const radius = TITAN_LIGHT * (battle && battle.flags.bright ? 1.6 : 1);
  for (const b of state.bullets) {
    if (!b.pure || b.dead) continue;
    if (Math.hypot(b.x - p.x, b.y - p.y) < radius + (b.r || 6)) {
      b.dead = true;
      addBurst(b.x, b.y, '#fff7a8', 5, 60);
      if (battle) battle.tp = Math.min(100, battle.tp + 4);
      if (b.onPurified) b.onPurified(b);
    }
  }
}

function titanPurifiable(options) {
  return spawn({ color: '#ffffff', pure: true, ...options });
}

const TITAN_ATTACKS = {
  swarm: {
    name: 'Swarm', duration: 7,
    update(run) {
      const lvl = Math.ceil((run.battle ? run.battle.flags.phase : 1 + run.level * 2) / 2);
      every(run, 'spawn', 0.55 - lvl * 0.08, () => {
        // spawn creep in from the edges and chase the SOUL; white ones can be purified
        const edge = randInt(0, 3);
        const x = edge === 0 ? arena.x - 10 : edge === 1 ? arena.x + arena.w + 10 : rand(arena.x, arena.x + arena.w);
        const y = edge === 2 ? arena.y - 10 : edge === 3 ? arena.y + arena.h + 10 : rand(arena.y, arena.y + arena.h);
        const make = chance(0.6) ? titanPurifiable : spawn;
        make({
          kind: 'spawnBug', x, y, r: 7, noCull: true, maxLife: 6, color: make === spawn ? '#4b2a7a' : '#ffffff',
          update(b, dt) {
            const v = aimAt(b.x, b.y, 70 + lvl * 15);
            b.x += v.vx * dt;
            b.y += v.vy * dt;
          }
        });
      }, 0.2);
      titanPurify(run);
    }
  },
  centipedes: {
    name: 'Centipedes', duration: 7.5,
    start(run) {
      const lvl = run.battle ? run.battle.flags.phase : 1;
      const count = lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
      run.data.heads = [];
      for (let c = 0; c < count; c++) {
        const segments = [];
        for (let i = 0; i < 8; i++) {
          segments.push(titanPurifiable({ kind: 'segment', x: arena.x, y: arena.y, r: 7, noCull: true, color: i === 0 ? '#4b2a7a' : '#ffffff', pure: i !== 0 }));
        }
        run.data.heads.push({ segments, phase: c * 2.1 });
      }
    },
    update(run, dt) {
      const c = arenaCenter();
      for (const cp of run.data.heads) {
        cp.segments.forEach((s, i) => {
          if (s.dead) return;
          const t = run.t * 1.4 + cp.phase - i * 0.12;
          // circle, then rush through the middle every few seconds
          const rush = Math.max(0, Math.sin(run.t * 0.9 + cp.phase)) ** 6;
          const r = 90 * (1 - rush) + 10;
          s.x = c.x + Math.cos(t) * r;
          s.y = c.y + Math.sin(t) * r * 0.75;
        });
      }
      titanPurify(run);
    }
  },
  hands: {
    name: 'The Hands', duration: 7.5,
    start(run) {
      run.data.hands = [-1, 1].map(side => titanPurifiable({
        kind: 'titanHand', side, x: side < 0 ? arena.x - 30 : arena.x + arena.w + 30, y: arena.y + arena.h / 2, r: 12, hw: 14, hh: 22,
        noCull: true, clip: false, harmless: false, color: '#ffffff',
        onPurified: hand => {
          hand.dead = true;
        }
      }));
      // the hands' "eyes" are the purifiable part; the hands themselves don't move into the SOUL
      run.data.hands.forEach(h => { h.pure = false; });
    },
    update(run, dt) {
      for (const hand of run.data.hands) {
        if (hand.dead) continue;
        // close in a little, fire bullets; eyes (white orbs) appear and must be purified
        hand.x += -hand.side * 10 * dt;
        hand.y = arena.y + arena.h / 2 + Math.sin(run.t * 1.2 + hand.side) * 50;
      }
      every(run, 'fire', 0.7, () => {
        for (const hand of run.data.hands) {
          if (hand.dead) continue;
          const v = aimAt(hand.x, hand.y, 150);
          spawn({ kind: 'normal', x: hand.x, y: hand.y, vx: v.vx, vy: v.vy, r: 5, color: '#4b2a7a', maxLife: 3 });
          titanPurifiable({ kind: 'normal', x: hand.x, y: hand.y - 20, vx: v.vx * 0.6, vy: v.vy * 0.6, r: 5, maxLife: 3 });
        }
      }, 0.4);
      titanPurify(run);
    }
  },
  bigShots: {
    name: 'Big Shots', duration: 6.5,
    update(run) {
      const lvl = run.battle ? run.battle.flags.phase : 2;
      every(run, 'shot', lvl >= 4 ? 0.9 : 1.2, () => {
        const pairs = lvl >= 4 ? 2 : 1;
        for (let i = 0; i < pairs; i++) {
          const x = arena.x + rand(0, arena.w);
          const y = arena.y - 30;
          const v = aimAt(x, y, 240, i ? 0.3 : -0.1);
          spawn({ kind: 'darkShot', x, y, vx: v.vx, vy: v.vy, r: 12, warn: 0.5, noCull: true, maxLife: 3, color: '#2a0f4f',
            update(b, dt) { if (b.life > b.warn) { b.x += b.vx * dt; b.y += b.vy * dt; } } });
        }
      }, 0.3);
    }
  },
  desperation: {
    name: 'Desperation shots', duration: 7,
    update(run) {
      every(run, 'burst', 0.35, () => {
        const x = arena.x + rand(0, arena.w);
        const v = aimAt(x, arena.y - 20, 300);
        spawn({ kind: 'darkShot', x, y: arena.y - 20, vx: v.vx, vy: v.vy, r: 8, noCull: true, maxLife: 3, color: '#2a0f4f' });
      }, 0.2);
      once(run, 'laser', 5.5, () => spawnBeam(arena.x - 60, state.player.y, 0, 30, 0.7, 0.4, { beamColor: '#6a3fbf', drawEmitter: false }));
    }
  },
  wings: {
    name: 'Covered in wings', duration: 2.5, quiet: true,
    update(run) {
      titanPurify(run);
    }
  }
};

// The board is dark - only the SOUL's light shows the way.
Titan.drawArenaOverlay = function (box) {
  const battle = state.battle;
  const p = state.player;
  const radius = TITAN_LIGHT * (battle && battle.flags.bright ? 1.6 : 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const g = ctx.createRadialGradient(p.x, p.y, radius * 0.6, p.x, p.y, radius * 3.2);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeStyle = 'rgba(255, 247, 168, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

BULLET_DRAWERS.spawnBug = (b, fill) => {
  ctx.fillStyle = fill;
  fillCircle(b.x, b.y, b.r);
  ctx.fillStyle = b.pure ? '#000' : '#ff3b6b';
  fillCircle(b.x - 2, b.y - 1, 1.5);
  fillCircle(b.x + 2, b.y - 1, 1.5);
};

BULLET_DRAWERS.segment = (b, fill) => {
  ctx.fillStyle = fill;
  fillCircle(b.x, b.y, b.r);
  ctx.strokeStyle = '#4b2a7a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.stroke();
};

BULLET_DRAWERS.titanHand = b => {
  ctx.translate(b.x, b.y);
  ctx.fillStyle = '#3a1f63';
  fillRoundRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2, 8);
  ctx.fillStyle = '#ffffff';
  fillCircle(0, -4, 5);
};

BULLET_DRAWERS.darkShot = b => {
  if (b.warn && b.life < b.warn) {
    ctx.strokeStyle = '#a07bff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * (1.6 - b.life / b.warn * 0.6), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#2a0f4f';
  fillCircle(b.x, b.y, b.r);
  ctx.strokeStyle = '#a07bff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.stroke();
};

Titan.attacks = ['swarm', 'centipedes', 'hands', 'bigShots', 'desperation'].map(id => TITAN_ATTACKS[id]);
