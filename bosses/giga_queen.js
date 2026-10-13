// GIGA Queen - Deltarune Chapter 2, final boss (a giant robot punching match).
// Reference: you pilot the Thrash Machine. Queen's "pings" flash before every move - dodge left
// or right, or duck - then punch back with Z/X while she's open. Moves: acid punch, kicks,
// a pirouette (ducking won't save you), baseballs you can punch back, an acid light cone
// (duck!), walls with a gap. Three rounds; in the last one she stays at 1 HP until you punch
// back her final, huge, slow baseball.
// Here: the plus-shaped board stands in for the machine - ←/→ dodge, ↓ ducks, ↑ goes back.

const GIGA_ROUNDS = [500, 500, 600];

const GigaQueen = registerBoss({
  id: 'giga_queen',
  name: 'GIGA Queen',
  game: 'deltarune',
  color: '#7fd4ff',
  emblem: 'crown',

  player: { name: 'SUSIE', maxHp: 300, power: 28 },
  maxHp: GIGA_ROUNDS[0] + GIGA_ROUNDS[1] + GIGA_ROUNDS[2],
  attack: 30,
  defense: 0,
  checkAttack: 15,
  checkDefense: 0,
  gold: 0,
  noRudeBuster: true,
  box: { w: 210, h: 170 },
  fixedSpeed: true,
  check: 'Queen in her giant robot. Time for a punching match!',
  intro: '* GIGA Queen towers over the Thrash Machine!',
  flavor: ['* The Thrash Machine creaks.', '* GIGA Queen is doing a little dance.', '* The rooftop shakes.'],

  setup(battle) {
    battle.flags.round = 0;
    battle.flags.fixes = 0;
    battle.flags.turbo = false;
    battle.flags.finalBall = false;
  },

  statusText(battle) {
    return `ROUND ${battle.flags.round + 1} / 3`;
  },

  acts: [
    {
      name: 'TurboDodge', tp: 25, description: 'Dodge faster for one turn.',
      use(battle) {
        battle.flags.turbo = true;
        return '* The Thrash Machine revved up! Dodges are faster this turn.';
      }
    },
    {
      name: 'SELF-FIX', tp: 20, description: 'Restore 100 HP.',
      use(battle) {
        battle.flags.fixes += 1;
        const healed = Math.min(100, state.player.maxHp - state.player.hp);
        state.player.hp += healed;
        return `* The Thrash Machine fixed itself!\n* Recovered ${healed} HP.`;
      }
    }
  ],

  onDamaged(battle) {
    gigaClampHp(battle);
  },

  getDialogue(battle, attack) {
    return attack.line || pick(['Pow Pow', 'Get Ready To Get Punched', 'Lol You Cannot Dodge This', 'Queen Fist Activated']);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    // the final baseball comes back every turn until it's hit
    if (f.round === 2 && battle.bossHp <= 1 && !f.finalBallHit) {
      f.finalBall = true;
      return GIGA_ATTACKS.finalBall;
    }
    const list = ['moves', 'baseballs', 'cone', 'walls'];
    return GIGA_ATTACKS[list[battle.turn % list.length]];
  },

  onTurnEnd(battle) {
    battle.flags.turbo = false;
  },

  victoryText() {
    return '* GIGA Queen\'s battery ran out!\n* "...Lol. Good Game."\n* YOU WON!';
  },

  attacks: []
});

// HP of the current round; the last round can't drop below 1 before the final baseball.
function gigaClampHp(battle) {
  const f = battle.flags;
  const remainingAfterRound = GIGA_ROUNDS.slice(f.round + 1).reduce((a, b) => a + b, 0);
  if (battle.bossHp <= remainingAfterRound && f.round < 2) {
    f.round += 1;
    sfx.phase();
    addPopup(`ROUND ${f.round + 1}`, bossPosition(battle.boss).x, bossPosition(battle.boss).y + 30, '#ffe14d');
  }
  if (f.round === 2 && !f.finalBallHit) battle.bossHp = Math.max(1, battle.bossHp);
}

// Punch while Queen is open: every Z / X press is a hit.
function gigaPunch(run) {
  const battle = run.battle;
  if (!battle || !run.data.open || run.data.open < run.t) return;
  if (consumePress(CONFIRM_KEYS) || consumePress(CANCEL_KEYS)) {
    const at = bossPosition(battle.boss);
    const damage = 28 + (battle.flags.round === 0 ? 7 : 0);
    battle.bossHp = Math.max(0, battle.bossHp - damage);
    battle.bossHurt = 0.3;
    battle.flags.punchAt = state.clock;
    battle.tp = Math.min(100, battle.tp + 1);
    addPopup(damage, at.x + rand(-20, 20), at.y - 10, '#ff4fd8');
    sfx.damage();
    gigaClampHp(battle);
  }
}

// A telegraphed strike: `count` pings, then each hits some of the spots.
const GIGA_SPOTS = {
  punch: ['center', 'up', 'down'],        // dodge left or right
  kickLeft: ['left', 'center'],           // go right (or duck)
  kickRight: ['right', 'center'],         // go left (or duck)
  pirouette: ['center', 'down', 'up'],    // ducking won't help
  cone: ['left', 'center', 'right', 'up'] // duck!
};

function gigaSpotRect(spot) {
  const c = arenaCenter();
  const [dx, dy] = PLUS_SPOTS[spot];
  const x = c.x + dx * arena.w * 0.33;
  const y = c.y + dy * arena.h * 0.33;
  return { x: x - 24, y: y - 24, w: 48, h: 48 };
}

function gigaMove(run, start, move, warn = 0.6) {
  run.data.events.push([start, () => {
    sfx.warn();
    for (const spot of GIGA_SPOTS[move]) {
      const r = gigaSpotRect(spot);
      warnZone(r.x, r.y, r.w, r.h, warn, 0.2, { kind: 'zone', color: move === 'cone' ? '#a8ffb0' : '#ffffff' });
    }
  }]);
  // after each move she is open for a moment: punch!
  run.data.events.push([start + warn + 0.2, () => {
    run.data.open = run.t + 0.7;
    addPopup('PUNCH!', arenaCenter().x, arena.y - 10, '#ffe14d');
  }]);
}

const GIGA_ATTACKS = {
  moves: {
    name: 'Punches and kicks', duration: 8, soul: 'plus',
    start(run) {
      run.data.events = [];
      const moves = ['punch', pick(['kickLeft', 'kickRight']), 'pirouette', 'punch'];
      moves.forEach((m, i) => gigaMove(run, 0.4 + i * 1.8, m));
    },
    update(run) {
      timeline(run, run.data.events);
      gigaPunch(run);
    }
  },
  cone: {
    name: 'Acid light cone', duration: 7, soul: 'plus',
    line: 'Behold My Acid Light',
    start(run) {
      run.data.events = [];
      gigaMove(run, 0.4, 'cone', 0.8);
      gigaMove(run, 2.6, pick(['kickLeft', 'kickRight']));
      gigaMove(run, 4.6, 'cone', 0.7);
    },
    update(run) {
      timeline(run, run.data.events);
      gigaPunch(run);
    }
  },
  baseballs: {
    name: 'Baseballs', duration: 7, soul: 'plus',
    update(run) {
      every(run, 'ball', 1.1, () => {
        // a ball flies at one of the spots - punch it back (Z) when it's close, or dodge
        const spot = pick(['left', 'center', 'right']);
        const r = gigaSpotRect(spot);
        spawn({
          kind: 'baseball', x: r.x + 24, y: arena.y - 10, vy: 130, r: 9, noCull: true, maxLife: 3,
          update(b, dt) {
            b.y += b.vy * dt;
            const p = state.player;
            if (!b.returned && Math.hypot(b.x - p.x, b.y - p.y) < 34 && consumePress(CONFIRM_KEYS)) {
              b.returned = true;
              b.vy = -400;
              b.harmless = true;
              if (run.battle) {
                run.battle.bossHp = Math.max(0, run.battle.bossHp - 40);
                addPopup('40', bossPosition(run.battle.boss).x, bossPosition(run.battle.boss).y - 10, '#ff4fd8');
                gigaClampHp(run.battle);
              }
              sfx.slash();
            }
          }
        });
      }, 0.3);
      // rolling wheels along the bottom
      every(run, 'wheel', 2.2, () => spawn({ kind: 'normal', x: arena.x - 10, y: arena.y + arena.h - 14, vx: 160, r: 9, color: '#ffe14d', maxLife: 3 }), 1);
    }
  },
  walls: {
    name: 'Copy walls', duration: 7, soul: 'plus',
    start(run) {
      run.data.events = [];
      for (let i = 0; i < 3; i++) {
        run.data.events.push([0.4 + i * 1.9, () => {
          // a wall with one gap comes down the board
          const gap = pick(['left', 'center', 'right']);
          for (const spot of ['left', 'center', 'right']) {
            if (spot === gap) continue;
            const r = gigaSpotRect(spot);
            spawn({ kind: 'normal', x: r.x + 24, y: arena.y - 20, vy: 120, hw: 26, hh: 8, color: '#7fd4ff', noCull: true, maxLife: 3 });
          }
        }]);
        run.data.events.push([1.4 + i * 1.9, () => { run.data.open = run.t + 0.6; }]);
      }
    },
    update(run) {
      timeline(run, run.data.events);
      gigaPunch(run);
    }
  },
  finalBall: {
    name: 'Final baseball', duration: 12, soul: 'plus',
    line: 'Ok This Is My Final Attack. Catch',
    start(run) {
      const c = arenaCenter();
      run.data.ball = spawn({
        kind: 'baseball', big: true, x: c.x, y: arena.y - 40, vy: 28, r: 24, noCull: true, clip: false,
        update(b, dt) {
          b.y += b.vy * dt;
          if (!b.returned && Math.hypot(b.x - state.player.x, b.y - state.player.y) < 50 && consumePress(CONFIRM_KEYS)) {
            b.returned = true;
            b.harmless = true;
            b.vy = -500;
            const battle = run.battle;
            if (battle) {
              battle.flags.finalBallHit = true;
              battle.bossHp = 0;
              winBattle(battle, 'defeated');
            }
            run.done = true;
          }
        }
      });
    },
    update() {}
  }
};

BULLET_DRAWERS.baseball = b => {
  if (drawArt('gq_baseball', b.x, b.y, b.r * 2.4, b.r * 2.4, { angle: b.life * 8 })) return;
  ctx.fillStyle = '#ffffff';
  fillCircle(b.x, b.y, b.r);
  ctx.strokeStyle = '#ff3030';
  ctx.lineWidth = Math.max(1.5, b.r / 8);
  ctx.beginPath();
  ctx.arc(b.x - b.r * 0.9, b.y, b.r * 0.7, -0.9, 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(b.x + b.r * 0.9, b.y, b.r * 0.7, Math.PI - 0.9, Math.PI + 0.9);
  ctx.stroke();
};

GigaQueen.attacks = ['moves', 'cone', 'baseballs', 'walls'].map(id => GIGA_ATTACKS[id]);

// ---------------------------------------------------------------- the look of the fight
// A punching match on a night-time city street: buildings lean in from both sides, GIGA Queen
// towers in the middle and you are the Thrash Machine (seen from behind) instead of a SOUL.
Object.assign(GigaQueen, {
  hideBoard: true,
  hideParty: true,

  drawBackdrop() {
    const horizon = 150;
    // the road
    const road = ctx.createLinearGradient(0, horizon, 0, VIEW_H);
    road.addColorStop(0, '#0a0a5a');
    road.addColorStop(1, '#1a1ab0');
    ctx.fillStyle = road;
    ctx.beginPath();
    ctx.moveTo(-20, VIEW_H + 20);
    ctx.quadraticCurveTo(360, horizon - 40, VIEW_W + 20, VIEW_H + 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 140, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, VIEW_H + 20);
    ctx.quadraticCurveTo(360, horizon - 40, VIEW_W + 20, VIEW_H + 20);
    ctx.stroke();
    // buildings on both sides, getting taller towards the edges of the screen
    const img = attackImage('gq_city');
    if (img) {
      const scroll = (state.clock * 20) % 1000;
      for (let i = 0; i < 64; i++) {
        const t = i / 63;                 // 0 at the screen edge, 1 at the middle
        const colW = 4.2;
        const h = 300 - t * 220;
        const sx = Math.floor((i * 9 + scroll) % 990);
        for (const side of [-1, 1]) {
          const x = side < 0 ? i * colW : VIEW_W - (i + 1) * colW;
          ctx.globalAlpha = 0.55 + t * 0.45;
          ctx.drawImage(img, sx, 0, 8, 142, x, horizon + 30 - h * 0.9, colW + 0.5, h);
        }
      }
      ctx.globalAlpha = 1;
    }
    return true;
  },

  drawScene(battle) {
    let x = 360;
    if (battle && battle.bossHurt > 0) x += Math.sin(battle.bossHurt * 60) * 10 * battle.bossHurt;
    drawBossFigure(GigaQueen, x, 112, state.clock, { maxH: 230, scale: 3, hurt: battle ? Math.min(1, battle.bossHurt * 2) : 0 });
  },

  drawSoul(p) {
    if (p.mode !== 'plus' || !attackImage('gq_hero')) return false;
    const battle = state.battle;
    const punching = battle && battle.flags.punchAt && state.clock - battle.flags.punchAt < 0.18;
    let frame = Math.floor(state.clock * 3) % 2 ? 3 : 0;
    let flip = false;
    if (p.spot === 'left' || p.spot === 'right') { frame = 4; flip = p.spot === 'left'; }
    if (p.spot === 'down') frame = 6;
    if (p.spot === 'up') frame = 2;
    if (punching) frame = 2;
    drawArt('gq_hero', p.x, p.y - 14, 130, 118, { frame, flipX: flip });
    // the SOUL glows in its chest, so you still see where you can be hit
    drawSoulShape(p.x, p.y + 2, 5, '#ff1a1a');
    return true;
  }
});
