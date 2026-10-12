// Tenna - Deltarune Chapter 3 (a TV host who turns the fight into a game show).
// Reference: the peaceful way to win is the SCORE: reach 1000 points with ACTs (ILoveTV,
// S-Action, betting), grazing and minigames. Attacks: All-Star Cast (laughing stars sweep
// through the board in a circle while two circles of the screen go dark), Smash Cut (the
// screen is cut in half and slides apart while lightning falls in waves), Rimshot (two
// smiling stars bounce around and fire from all five points on every rimshot) and Minigames
// (mistakes cost HP at the end). At 1000 points - or 20 % HP - comes the FINAL EPISODE:
// quick minigames, then DEFEAT TENNA, where you shoot his head while he fires stars.
// (Scores and HP are scaled for a one-person party.)

const TENNA_GOAL = 1000;

const Tenna = registerBoss({
  id: 'tenna',
  name: 'Tenna',
  game: 'deltarune',
  color: '#ff7ab8',
  emblem: 'tv',

  player: { name: 'SUSIE', maxHp: 210, power: 55 },
  items: ['clubsSandwich', 'clubsSandwich', 'topCake', 'reviveMint'],
  maxHp: 1500,
  attack: 32,
  defense: 0,
  checkAttack: 13,
  checkDefense: 0,
  gold: 0,
  box: { w: 230, h: 170 },
  check: 'The star of the show! Reach 1000 POINTS for a peaceful finale!',
  intro: '* Tenna\'s show is ON THE AIR!',
  flavor: [
    '* The studio audience is clapping on cue.',
    '* Tenna is adjusting his antenna.',
    '* Smells like hot circuits and popcorn.',
    '* The APPLAUSE sign is flashing.'
  ],

  setup(battle) {
    battle.flags.points = 0;
    battle.flags.loveStreak = 0;
    battle.flags.bet = 0;
    battle.flags.minigameNext = false;
    battle.flags.final = 0;          // 0 = normal, 1.. = final episode steps
    battle.flags.hitThisTurn = false;
  },

  statusText(battle) {
    return `SCORE ${battle.flags.points} / ${TENNA_GOAL}`;
  },

  acts: [
    {
      name: 'ILoveTV',
      description: '+points. More if used turn after turn.',
      use(battle) {
        const f = battle.flags;
        const gain = 50 + 25 * f.loveStreak;
        f.loveStreak += 1;
        f.lovedThisTurn = true;
        tennaPoints(battle, gain);
        return `* Susie yelled "I LOVE TV!"\n* The audience went wild! +${gain} POINTS!`;
      }
    },
    {
      name: 'S-Action',
      description: '+25 points.',
      use(battle) {
        tennaPoints(battle, 25);
        return '* Susie flexed for the cameras.\n* +25 POINTS!';
      }
    },
    {
      name: 'Bet50',
      description: 'Bet 50 points. Take no damage next turn to win 100.',
      hidden: battle => battle.flags.points < 50,
      use(battle) {
        battle.flags.bet = 50;
        tennaPoints(battle, -50);
        return '* Susie bet 50 POINTS that she won\'t get hit!\n* (Don\'t get hit this turn!)';
      }
    },
    {
      name: 'Minigame',
      tp: 26,
      description: 'Ask for a minigame next turn (bonus points).',
      use(battle) {
        battle.flags.minigameNext = true;
        return '* Susie demanded a MINIGAME!\n* "OH YEAH, BABY! LET\'S PLAY!"';
      }
    }
  ],

  onGraze(battle) {
    battle.flags.grazePoints = (battle.flags.grazePoints || 0) + 3;
  },

  onPlayerHurt(battle) {
    battle.flags.hitThisTurn = true;
    if (battle.attack && battle.attack.attack.minigame) battle.attack.data.mistakes = (battle.attack.data.mistakes || 0) + 1;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick([
      'MIKE! ROLL THE CAMERAS!',
      'Who\'s ready for some MAYHEM!?',
      'Ratings are UP, baby!',
      'Don\'t touch that dial!',
      'And now, a word from our sponsors!'
    ]);
  },

  getFlavor(battle) {
    if (battle.flags.final) return '* It\'s the FINAL EPISODE!';
    return null;
  },

  chooseAttack(battle) {
    const f = battle.flags;
    f.hitThisTurn = false;
    if (!f.lovedThisTurn) f.loveStreak = 0;
    f.lovedThisTurn = false;
    if (!f.final && (f.points >= TENNA_GOAL || battle.bossHp <= this.maxHp * 0.2)) {
      f.final = 1;
      f.peaceful = f.points >= TENNA_GOAL;
    }
    if (f.final) {
      const steps = [TENNA_ATTACKS.dodgeFire, TENNA_ATTACKS.targets, TENNA_ATTACKS.defeat];
      return steps[Math.min(f.final++ - 1, steps.length - 1)];
    }
    if (f.minigameNext || battle.bossHp <= this.maxHp / 2 && chance(0.35)) {
      f.minigameNext = false;
      return pick([TENNA_ATTACKS.dodgeFire, TENNA_ATTACKS.targets]);
    }
    const order = ['allStar', 'smashCut', 'rimshot'];
    return TENNA_ATTACKS[order[battle.turn % order.length]];
  },

  onTurnEnd(battle) {
    const f = battle.flags;
    if (f.grazePoints) {
      tennaPoints(battle, f.grazePoints);
      f.grazePoints = 0;
    }
    if (f.bet) {
      if (!f.hitThisTurn) tennaPoints(battle, f.bet * 2);
      f.bet = 0;
    }
  },

  victoryText(battle, outcome) {
    if (battle.flags.peaceful) return `* DEFEAT TENNA: CLEAR! Final score: ${battle.flags.points}!\n* "...I just wanted somebody to watch me."\n* YOU WON! The show is over.`;
    return '* Tenna\'s screen flickered off.\n* "...Stay tuned..."\n* YOU WON!';
  },

  // All-Star Cast darkens two circles of the board
  drawArenaOverlay(box) {
    if (!state.tennaDark) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    for (const zone of state.tennaDark) {
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  attacks: []
});

function tennaPoints(battle, amount) {
  battle.flags.points = Math.max(0, Math.min(9999, battle.flags.points + amount));
  if (Math.abs(amount) >= 10) {
    const at = bossPosition(battle.boss);
    addPopup(`${amount > 0 ? '+' : ''}${amount}`, at.x - 60, at.y - 40, amount > 0 ? '#ffe14d' : '#ff6b6b');
  }
}

function laughingStar(x, y, vx, vy, r = 8) {
  return spawn({ kind: 'star', x, y, vx, vy, r, color: '#ffe14d', maxLife: 5, minLife: 1 });
}

const TENNA_ATTACKS = {
  allStar: {
    name: 'All-Star Cast', duration: 7,
    start(run) {
      state.tennaDark = [];
    },
    update(run, dt) {
      // stars sweep through the board along a big circle
      every(run, 'star', 0.22, () => {
        const c = arenaCenter();
        const a0 = run.t * 1.5;
        laughingStar(c.x + Math.cos(a0) * 150, c.y + Math.sin(a0) * 110, -Math.cos(a0) * 140 + rand(-30, 30), -Math.sin(a0) * 140 + rand(-30, 30), 7);
      }, 0.1);
      const c = arenaCenter();
      state.tennaDark = [
        { x: c.x + Math.sin(run.t * 0.8) * 60, y: arena.y + 10, r: 42 },
        { x: c.x - Math.sin(run.t * 0.8) * 60, y: arena.y + arena.h - 10, r: 42 }
      ];
    },
    end() {
      state.tennaDark = null;
    }
  },
  smashCut: {
    name: 'Smash Cut', duration: 7,
    start(run) {
      run.data.events = [];
      for (let w = 0; w < 5; w++) {
        run.data.events.push([0.3 + w * 1.25, () => {
          const fives = w % 2 === 0;
          const count = fives ? 5 : 3;
          const width = arena.w / (fives ? 9 : 6);
          for (let i = 0; i < count; i++) {
            const x = fives ? arena.x + width * (i * 2 + 0.5) : arena.x + width * (i * 2 + 0.5 + randInt(0, 1));
            warnZone(x, arena.y, width, arena.h, 0.55, 0.2, { kind: 'bolt', color: '#fff7a8' });
          }
        }]);
      }
    },
    update(run) {
      timeline(run, run.data.events);
      // the cut: the two halves of the board slide apart and back
      state.box.x = arena.x + Math.sin(run.t * 2) * 8;
    }
  },
  rimshot: {
    name: 'Rimshot', duration: 7,
    start(run) {
      run.data.stars = [0, 1].map(i => spawn({
        kind: 'star', x: arena.x + 40 + i * 120, y: arena.y + 40 + i * 60, vx: (i ? -1 : 1) * 110, vy: 90, r: 12, color: '#ffe14d', noCull: true,
        update: bounceInArena
      }));
    },
    update(run) {
      // ba-dum-tss: every rimshot both stars fire from their five points
      every(run, 'rimshot', 1.1, () => {
        sfx.pop();
        for (const s of run.data.stars) {
          for (let i = 0; i < 5; i++) {
            const a = run.t + (Math.PI * 2 * i) / 5;
            spawn({ kind: 'normal', x: s.x, y: s.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 4, color: '#ffe14d', maxLife: 3 });
          }
        }
      }, 0.8);
    }
  },
  dodgeFire: {
    name: 'Minigame: Dodge Fire', duration: 6, minigame: true,
    line: 'MINIGAME TIME! Don\'t get burned!',
    update(run) {
      every(run, 'fire', 0.18, () => spawn({ kind: 'fire', x: rand(arena.x + 8, arena.x + arena.w - 8), y: arena.y - 8, vy: rand(140, 200), r: 6, maxLife: 3, damage: 0 }), 0.2);
    },
    end(run) {
      tennaMinigameResult(run);
    }
  },
  targets: {
    name: 'Minigame: Shoot the Targets', duration: 7, minigame: true,
    soul: 'yellow', soulOptions: { facing: 'up', bigShot: false },
    line: 'SHOOT THE TARGETS! Every miss is a MISTAKE!',
    update(run) {
      every(run, 'target', 0.9, () => {
        run.data.spawned = (run.data.spawned || 0) + 1;
        spawn({
          kind: 'target', x: rand(arena.x + 15, arena.x + arena.w - 15), y: arena.y + 20, vx: rand(-60, 60), r: 10,
          harmless: true, shootHp: 1, noCull: true, maxLife: 2.4,
          onDestroyed: () => { run.data.hit = (run.data.hit || 0) + 1; },
          update(b, dt) {
            b.x += b.vx * dt;
            if (b.x < arena.x + 10 || b.x > arena.x + arena.w - 10) b.vx *= -1;
          }
        });
      }, 0.2);
    },
    end(run) {
      run.data.mistakes = (run.data.mistakes || 0) + Math.max(0, (run.data.spawned || 0) - (run.data.hit || 0) - 1);
      tennaMinigameResult(run);
    }
  },
  defeat: {
    name: 'DEFEAT TENNA', duration: 14,
    soul: 'yellow', soulOptions: { facing: 'up', bigShot: false },
    line: 'FINAL ROUND! DEFEAT... TENNA!!',
    start(run) {
      run.data.head = spawn({
        kind: 'tvHead', x: arena.x + arena.w / 2, y: arena.y + 26, hw: 22, hh: 16, harmless: true, noCull: true, shootHp: 30,
        onDestroyed: () => {
          if (run.battle && !run.battle.outcome) winBattle(run.battle, run.battle.flags.peaceful ? 'spared' : 'defeated');
          run.done = true;
        },
        update(b) {
          b.x = arena.x + arena.w / 2 + Math.sin(run.t * 1.3) * (arena.w / 2 - 30);
        }
      });
    },
    update(run) {
      every(run, 'star', 0.5, () => {
        const h = run.data.head;
        if (h.dead) return;
        const v = aimAt(h.x, h.y, 150);
        spawn({ kind: 'star', x: h.x, y: h.y + 14, vx: v.vx, vy: v.vy, r: 6, color: '#ffe14d', maxLife: 3, shootHp: 1 });
      }, 0.5);
    }
  }
};

function tennaMinigameResult(run) {
  const battle = run.battle;
  if (!battle) return;
  const mistakes = Math.min(3, run.data.mistakes || 0);
  if (mistakes > 0) {
    // mistakes hurt when the minigame ends
    const damage = mistakes * 25;
    state.player.hp = Math.max(1, state.player.hp - damage);
    addPopup(`-${damage}`, partyPopupPos().x, partyPopupPos().y, '#ff4d4d');
  }
  tennaPoints(battle, mistakes === 0 ? 120 : mistakes === 1 ? 60 : 10);
}

BULLET_DRAWERS.target = b => {
  for (const [r, c] of [[b.r, '#ff3030'], [b.r * 0.66, '#ffffff'], [b.r * 0.33, '#ff3030']]) {
    ctx.fillStyle = c;
    fillCircle(b.x, b.y, r);
  }
};

BULLET_DRAWERS.tvHead = b => {
  ctx.translate(b.x, b.y);
  ctx.fillStyle = b.flash ? '#ffffff' : '#5c5c5c';
  fillRoundRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2, 4);
  ctx.fillStyle = '#7fd4ff';
  ctx.fillRect(-b.hw + 4, -b.hh + 4, b.hw * 2 - 8, b.hh * 2 - 8);
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -b.hh);
  ctx.lineTo(-12, -b.hh - 10);
  ctx.moveTo(6, -b.hh);
  ctx.lineTo(12, -b.hh - 10);
  ctx.stroke();
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(-b.hw, b.hh + 4, (b.hw * 2 * b.shootHp) / 30, 3);
};

Tenna.attacks = Object.values(TENNA_ATTACKS);
