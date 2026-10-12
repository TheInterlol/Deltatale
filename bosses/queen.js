// Queen - Deltarune Chapter 2 finale.
// Reference: Queen fights from her chair while Berdly, plugged in by a cable, attacks for her.
// Attacks: Stomp (a boot drops on the left, middle or right with a "!" warning), Exploding
// Heads (heads appear around the board and burst into smaller spinning heads), Queen Laser
// (screens aim at the SOUL and fire beams after a faint red line), Berdly Tornado (tornadoes
// crossing from both sides), New Social Media (scrolling icons spitting words), Plug (sparks
// running along the border while the board slides), Wine (liquid rains into a glass-shaped
// board and pushes the SOUL to the top) and the Ultimate Attack (pop-ups everywhere).
// Every 25 % of HP she drinks and puts up an acid shield (FIGHT can't get through; Toast it
// away). Loosen Berdly's cable to free him and end the fight - or empty her chair's HP.

const Queen = registerBoss({
  id: 'queen',
  name: 'Queen',
  game: 'deltarune',
  color: '#7fd4ff',
  emblem: 'wine',

  player: { name: 'SUSIE', maxHp: 190, power: 55 },
  items: ['darkCandy', 'clubsSandwich', 'clubsSandwich', 'topCake', 'reviveMint'],
  maxHp: 1200,
  attack: 22,
  defense: 0,
  checkAttack: 14,
  checkDefense: 15,
  gold: 0,
  box: { w: 230, h: 170 },
  check: 'Ruler of the Cyber World. Her chair has HP.',
  intro: '* Queen and Berdly attack!\n* (Berdly is plugged into a cable...)',
  flavor: [
    '* Queen is sipping something acidic.',
    '* Berdly\'s cable sparks.',
    '* Queen laughs in Comic Sans.',
    '* The chair\'s engine hums.'
  ],

  setup(battle) {
    battle.flags.shield = 0;           // acid shield HP left
    battle.flags.shields = 0;          // shields used so far
    battle.flags.wineAt = [0.75, 0.5, 0.25];
    battle.flags.ultimate = false;
    battle.flags.step = 0;
  },

  statusText(battle) {
    const f = battle.flags;
    return f.shield > 0 ? `ACID SHIELD ${Math.ceil(f.shield)}` : `BERDLY'S CABLE ${battle.mercy}% loose`;
  },

  get acts() {
    const battle = state.battle;
    const shield = battle && battle.boss === Queen && battle.flags.shield > 0;
    if (shield) {
      return [
        { name: 'Toast', description: 'Toast the shield away.', use: b => queenToast(b, 70) },
        { name: 'BigToast', tp: 40, description: 'A huge toast. Breaks most of the shield.', use: b => queenToast(b, 180) }
      ];
    }
    return [
      { name: 'Loosen', description: 'Loosen Berdly\'s cable. (+MERCY)', use: b => queenLoosen(b, 10, '* Susie tugged at Berdly\'s cable!') },
      { name: 'Throw', tp: 30, description: 'Throw something at the cable\'s weak spot.', use: b => queenLoosen(b, 22, '* Susie threw a rock at the cable\'s weak point!') }
    ];
  },
  set acts(value) {},

  // the wine glass fills up during the Wine attack
  drawArenaBackground(box) {
    if (!state.wineLevel) return;
    ctx.fillStyle = 'rgba(120, 255, 150, 0.35)';
    ctx.fillRect(box.x, state.wineLevel, box.w, box.y + box.h - state.wineLevel);
  },

  onFight(battle) {
    if (battle.flags.shield > 0) {
      addPopup('BLOCKED', bossPosition(this).x, bossPosition(this).y - 20, '#7fd4ff');
      return 'miss';
    }
    return undefined;
  },

  onSpare(battle) {
    if (isSpareable(battle)) {
      winBattle(battle, 'spared', '* Berdly broke free of the cable!\n* "Queen... I\'m sorry. I won\'t be your pawn."\n* Queen fled across the rooftop. YOU WON!');
      return true;
    }
    return false;
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Queen\'s chair broke down!\n* Berdly pulled out his own plug to protect her... \n* Queen fled. YOU WON!';
    return null;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick([
      'Hoi Hoi! Let Us Fight In A Way That Is Very Cool',
      'Berdly Attack Them With Your Big Brain',
      'Ha Ha Ha! I Am Unstoppable',
      'Your Dad Jokes Have No Power Here',
      'Lol'
    ]);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    // wine (and a new acid shield) every 25 % of HP or of MERCY
    const hpRatio = battle.bossHp / this.maxHp;
    const mercyRatio = 1 - battle.mercy / 100;
    if (f.wineAt.length && (hpRatio <= f.wineAt[0] || mercyRatio <= f.wineAt[0])) {
      f.wineAt.shift();
      f.shields += 1;
      f.shield = f.shields === 1 ? 200 : 260;
      return QUEEN_ATTACKS.wine;
    }
    if (f.shields >= 3 && !f.ultimate && f.shield <= 0) {
      f.ultimate = true;
      return QUEEN_ATTACKS.ultimate;
    }
    const phase1 = ['tornado', 'stomp', 'heads', 'laser', 'social', 'plug', 'stompLaser'];
    const phase2 = ['social', 'tornado', 'heads', 'plug', 'stompLaser'];
    const list = f.shields === 0 ? phase1 : phase2;
    return QUEEN_ATTACKS[list[f.step++ % list.length]];
  },

  attacks: []
});

function queenToast(battle, amount) {
  battle.flags.shield = Math.max(0, battle.flags.shield - amount);
  sfx.select();
  return battle.flags.shield > 0
    ? `* Susie raised her glass... and drank to the shield's demise.\n* The acid shield weakened!`
    : '* The acid shield dissolved!\n* Queen can be hurt again.';
}

function queenLoosen(battle, amount, text) {
  addMercy(battle, amount);
  return `${text}\n* The cable came ${amount}% looser.`;
}

function queenStomp(run, col) {
  const w = arena.w / 3;
  warnZone(arena.x + col * w + 2, arena.y, w - 4, arena.h, 0.55, 0.22, { kind: 'boot', color: '#7fd4ff' });
}

const QUEEN_ATTACKS = {
  stomp: {
    name: 'Stomp', duration: 7,
    update(run) {
      every(run, 'stomp', 0.6, () => queenStomp(run, randInt(0, 2)), 0.2);
    }
  },
  heads: {
    name: 'Exploding heads', duration: 6.5,
    update(run) {
      every(run, 'head', 1.0 / run.speed, () => {
        const p = pickPointAwayFromPlayer(80, 20);
        spawn({
          kind: 'neoHead', x: p.x, y: p.y, r: 13, hw: 13, hh: 12, noCull: true, warn: 0.8, activeFor: 0, maxLife: 0.9,
          update(b) {
            if (b.life >= 0.85 && !b.burst) {
              b.burst = true;
              sfx.pop();
              for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 * i) / 6;
                spawn({ kind: 'neoHead', x: b.x, y: b.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, r: 5, hw: 5, hh: 5, maxLife: 3 });
              }
            }
          }
        });
      }, 0.2);
    }
  },
  laser: {
    name: 'Queen laser', duration: 6.5,
    update(run) {
      every(run, 'laser', 0.8, () => {
        const fromLeft = chance(0.5);
        const x = fromLeft ? arena.x - 50 : arena.x + arena.w + 50;
        const y = rand(arena.y - 40, arena.y + arena.h + 40);
        const p = state.player;
        spawnBeam(x, y, Math.atan2(p.y - y, p.x - x), 12, 0.55, 0.15, { beamColor: '#7dff7d', drawEmitter: false });
      }, 0.2);
    }
  },
  tornado: {
    name: 'Berdly tornado', duration: 6.5,
    update(run) {
      every(run, 'wave', 1.3, () => {
        for (let i = 0; i < 3; i++) {
          spawn({ kind: 'tornado', x: arena.x - 20, y: arena.y + 25 + i * 60, vx: 120, r: 11, minLife: 1 });
          spawn({ kind: 'tornado', x: arena.x + arena.w + 20, y: arena.y + 55 + i * 60, vx: -120, r: 11, minLife: 1 });
        }
      }, 0.2);
    }
  },
  social: {
    name: 'New social media', duration: 7,
    update(run) {
      every(run, 'icon', 0.8, () => {
        const y = rand(arena.y + 15, arena.y + arena.h - 15);
        spawn({
          kind: 'icon', x: arena.x + arena.w + 20, y, vx: -60, hw: 10, hh: 10, harmless: true, noCull: true, maxLife: 7,
          update(b, dt) {
            b.x += b.vx * dt;
            b.timer = (b.timer || 0) + dt;
            if (b.timer > 0.9 && b.x < arena.x + arena.w) {
              b.timer = 0;
              const word = pick(['LOL', 'DRAMA', 'OMG', '#BERDLY', 'LIKE']);
              const v = aimAt(b.x, b.y, 150);
              spawn({ kind: 'word', word, x: b.x, y: b.y, vx: v.vx, vy: v.vy, hw: word.length * 6, hh: 6, maxLife: 3 });
            }
          }
        });
      }, 0.1);
    }
  },
  plug: {
    name: 'Plug', duration: 7,
    start(run) {
      run.data.baseX = arena.x;
    },
    update(run) {
      // the board slides side to side while sparks run along its border
      const shift = Math.sin(run.t * 1.4) * 40;
      arena.x = run.data.baseX + shift;
      state.box.x = arena.x;
      const p = state.player;
      p.x = Math.max(arena.x + p.r, Math.min(arena.x + arena.w - p.r, p.x));
      every(run, 'spark', 0.35, () => {
        const along = Math.random();
        const edge = randInt(0, 3);
        const x = edge < 2 ? arena.x + arena.w * along : (edge === 2 ? arena.x : arena.x + arena.w);
        const y = edge >= 2 ? arena.y + arena.h * along : (edge === 0 ? arena.y : arena.y + arena.h);
        const v = aimAt(x, y, 130);
        spawn({ kind: 'star', x, y, vx: v.vx, vy: v.vy, r: 4, maxLife: 3, color: '#ffe84d' });
      }, 0.2);
    },
    end(run) {
      arena.x = run.data.baseX;
    }
  },
  stompLaser: {
    name: 'Stomp and laser', duration: 7.5,
    update(run) {
      QUEEN_ATTACKS.stomp.update(run);
      every(run, 'laser', 1.4, () => {
        const x = arena.x - 50;
        const y = rand(arena.y, arena.y + arena.h);
        spawnBeam(x, y, Math.atan2(state.player.y - y, state.player.x - x), 12, 0.55, 0.15, { beamColor: '#7dff7d', drawEmitter: false });
      }, 0.8);
    }
  },
  wine: {
    name: 'Wine', duration: 7,
    box: { w: 150, h: 190 },
    line: 'Hold On. I Must Take A Sip',
    start(run) {
      run.data.level = arena.y + arena.h;
    },
    update(run, dt) {
      // the glass fills up from below and pushes the SOUL to the top
      run.data.level = Math.max(arena.y + 30, run.data.level - 22 * dt);
      const p = state.player;
      if (p.y > run.data.level - p.r) p.y = run.data.level - p.r;
      every(run, 'drop', 0.12, () => {
        spawn({ kind: 'tear', x: rand(arena.x + 6, arena.x + arena.w - 6), y: arena.y - 8, vy: 170, r: 4, color: '#a8ffb0', maxLife: 3 });
      }, 0.1);
      state.wineLevel = run.data.level;
    },
    end() {
      state.wineLevel = null;
    }
  },
  ultimate: {
    name: 'Ultimate attack', duration: 8,
    line: 'Behold My Ultimate Attack. Downloading...',
    update(run) {
      every(run, 'popup', 0.45, () => {
        // pop-up windows cover parts of the board, heads keep coming
        const w = rand(50, 90);
        const h = rand(30, 50);
        spawn({ kind: 'popup', x: rand(arena.x + w / 2, arena.x + arena.w - w / 2), y: rand(arena.y + h / 2, arena.y + arena.h - h / 2), hw: w / 2, hh: h / 2, harmless: true, maxLife: 2.5, noCull: true });
      }, 0.3);
      QUEEN_ATTACKS.heads.update(run);
    }
  }
};

BULLET_DRAWERS.boot = (b, fill) => {
  const x = b.x - b.hw;
  const y = b.y - b.hh;
  if (b.life < b.warn) {
    ctx.fillStyle = Math.floor(b.life * 12) % 2 === 0 ? '#ff3030' : '#801010';
    ctx.font = `22px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', b.x, b.y + 8);
    return;
  }
  // a big boot coming down
  ctx.fillStyle = '#7fd4ff';
  ctx.fillRect(x + 8, y, b.hw * 2 - 16, b.hh * 2 - 22);
  fillRoundRect(x, y + b.hh * 2 - 26, b.hw * 2, 26, 8);
};

BULLET_DRAWERS.icon = b => {
  ctx.fillStyle = '#3d7cff';
  fillRoundRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2, 4);
  ctx.fillStyle = '#fff';
  fillCircle(b.x, b.y, 4);
};

BULLET_DRAWERS.popup = b => {
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
  ctx.fillStyle = '#3d7cff';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, 8);
  ctx.fillStyle = '#000';
  ctx.font = `9px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('ERROR', b.x, b.y + 6);
};

Queen.attacks = Object.values(QUEEN_ATTACKS);
