// K. Round - Deltarune Chapter 1 (Great Board).
// Reference: a big checker piece wearing a crown. It stomps where the SOUL is, kicks out stars
// that roughly track you, stomps the board leaving a trail of stars, and jumps over the board
// raining stars. It can't be beaten with FIGHT - when hurt it drinks a carton of almond milk
// and heals. The way out is to Bow (or Deep Bow) until its crown is loose enough to fall off.

const KRound = registerBoss({
  id: 'k_round',
  name: 'K. Round',
  game: 'deltarune',
  color: '#ff5050',
  emblem: 'crown',

  player: { name: 'SUSIE', maxHp: 110, power: 46 },
  maxHp: 1300,
  attack: 16,
  defense: 0,
  checkAttack: 9,
  checkDefense: 0,
  gold: 0,
  cannotBeFought: true,
  showMercy: true,
  box: { w: 140, h: 140 },
  check: 'A checker piece with a crown. Show it some respect.',
  intro: '* K. Round crashed down from above!',
  flavor: [
    '* K. Round is bouncing in place.',
    '* K. Round\'s crown is gleaming.',
    '* The board shakes with every bounce.',
    '* K. Round demands respect.'
  ],

  setup(battle) {
    battle.flags.heals = 0;
  },

  statusText(battle) {
    return `CROWN ${battle.mercy}% loose`;
  },

  acts: [
    { name: 'Bow', mercy: 15, text: '* Susie bowed... grudgingly.\n* K. Round\'s crown slipped a little!' },
    { name: 'Deep Bow', tp: 16, mercy: 20, text: '* Susie bowed deeply!\n* K. Round\'s crown slipped!' },
    {
      name: 'Warning',
      description: 'Not very useful.',
      use(battle) {
        battle.flags.warnings = (battle.flags.warnings || 0) + 1;
        return battle.flags.warnings >= 3
          ? '* Susie warned K. Round... again.\n* Susie got fired up! (Her ATTACK went up.)'
          : '* Susie warned K. Round about her attack.\n* It didn\'t care.';
      }
    }
  ],

  // once the crown is loose enough it falls off - SPARE isn't even needed
  onTurnEnd(battle) {
    if (battle.mercy >= 100 && !battle.outcome) {
      winBattle(battle, 'spared', '* K. Round\'s crown fell off!\n* It turned back into a simple C. Round and rolled away.\n* YOU WON!');
    }
  },

  onSpare(battle) {
    if (battle.mercy >= 100) {
      winBattle(battle, 'spared', '* K. Round\'s crown fell off!\n* It turned back into a simple C. Round and rolled away.\n* YOU WON!');
      return true;
    }
    return false;
  },

  onDamaged(battle) {
    battle.flags.needsHeal = battle.bossHp <= 1000;
  },

  getDialogue(battle, attack) {
    return attack.line || pick(['KNEEL!', 'Fall before the mighty K. Round!', 'Hmph!', 'Respect the crown!']);
  },

  chooseAttack(battle) {
    if (battle.flags.needsHeal) {
      battle.flags.needsHeal = false;
      return KROUND_ATTACKS.selfCare;
    }
    const order = ['stomp', 'starKick', 'starStomp', 'fallingStars'];
    return KROUND_ATTACKS[order[battle.turn % order.length]];
  },

  attacks: []
});

function kroundStomp(run, x, y, warn, trail = false) {
  // a shadow grows where it will land, then the stomp hits that circle
  spawn({
    kind: 'stomp', x, y, r: 34, warn, activeFor: 0.18, noCull: true,
    onLand: null
  });
  if (trail) {
    run.data.events.push([run.t + warn + 0.05, () => {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6;
        spawn({ kind: 'star', x, y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, r: 5, maxLife: 3, color: '#ffe14d' });
      }
    }]);
  }
}

const KROUND_ATTACKS = {
  stomp: {
    name: 'Stomp', duration: 6,
    update(run) {
      every(run, 'stomp', 1.3, () => kroundStomp(run, state.player.x, state.player.y, 0.75), 0.3);
    }
  },
  starKick: {
    name: 'Star kick', duration: 6,
    update(run) {
      every(run, 'kick', 0.5, () => {
        const x = arena.x + arena.w + 20;
        const y = rand(arena.y + 15, arena.y + arena.h - 15);
        const v = aimAt(x, y, 170, rand(-0.25, 0.25));
        spawn({ kind: 'star', x, y, vx: v.vx, vy: v.vy, r: 6, maxLife: 4, minLife: 1, color: '#ffe14d' });
      }, 0.2);
    }
  },
  starStomp: {
    name: 'Star stomp', duration: 6.5,
    start(run) {
      run.data.events = [];
    },
    update(run) {
      every(run, 'stomp', 1.6, () => kroundStomp(run, state.player.x, state.player.y, 0.8, true), 0.3);
      timeline(run, run.data.events.sort((a, b) => a[0] - b[0]), 'starTrail');
    }
  },
  fallingStars: {
    name: 'Falling stars', duration: 6,
    start(run) {
      run.data.x = arena.x - 30;
    },
    update(run, dt) {
      // it jumps across above the board, dropping stars from its legs
      run.data.x += 75 * dt;
      if (run.data.x > arena.x + arena.w + 30) run.data.x = arena.x - 30;
      every(run, 'star', 0.18, () => {
        spawn({ kind: 'star', x: run.data.x + rand(-20, 20), y: arena.y - 6, vy: 170, r: 5, maxLife: 3, color: '#ffe14d' });
      }, 0.1);
    }
  },
  selfCare: {
    name: 'Self-care', duration: 2.5, quiet: true,
    line: '...Time for a break.',
    start(run) {
      const battle = run.battle;
      if (battle) {
        battle.flags.heals += 1;
        const heal = battle.flags.heals === 1 ? 300 : 700;
        battle.bossHp = Math.min(battle.boss.maxHp, battle.bossHp + heal);
        addPopup(`+${heal}`, bossPosition(battle.boss).x, bossPosition(battle.boss).y - 20, '#7dff7d');
        sfx.heal();
      }
    },
    update() {}
  }
};

BULLET_DRAWERS.stomp = b => {
  if (b.life < b.warn) {
    const k = b.life / b.warn;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.4 + 0.4 * k})`;
    ctx.strokeStyle = '#ff3030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r * (0.4 + 0.6 * k), b.r * (0.25 + 0.4 * k), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#ff5050';
  fillCircle(b.x, b.y, b.r);
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(b.x - 14, b.y - b.r - 2, 28, 8);
};

KRound.attacks = ['stomp', 'starKick', 'starStomp', 'fallingStars'].map(id => KROUND_ATTACKS[id]);
