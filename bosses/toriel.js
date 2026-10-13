// Toriel - Undertale, Ruins.
// Reference: her attacks are fire waves (a crossing double helix), a paw sweep that leaves
// fireballs which then bounce towards the SOUL, a dense fire helix with fixed gaps, and
// "faltering" fire that swerves around the SOUL. She never lets you die: below 3 HP her fire
// avoids you and an attack ends early when it brings you to 2 HP. Sparing her over and over
// eventually makes her stop attacking and give up. Missing a FIGHT counts as sparing.
// (Spares 13+ are a shorter talk-only stretch than the original.)

const TORIEL_STOP_ATTACKING = 12;   // from this spare on she no longer attacks
const TORIEL_GIVES_UP = 18;         // spare count at which the fight ends

// Her lines as the spare count grows (index = spare count). Original wording, same arc.
const TORIEL_SPARE_LINES = [
  null,
  '...',
  '...',
  '...',
  'Fight me or leave!',
  'Do not look at me like that.',
  'Go away!',
  '...',
  '...',
  'I am only trying to keep you safe.',
  '...',
  'Please. Go upstairs.',
  '...',
  'Why are you making this so difficult?',
  'Every child who left... I never saw them again.',
  'They leave. They die. They never come back.',
  'If you truly wish to leave... I will not stop you.',
  'But when you go, please do not come back.',
  'Be good, alright, my child?'
];

const Toriel = registerBoss({
  id: 'toriel',
  name: 'Toriel',
  game: 'undertale',
  color: '#c9a2ff',
  emblem: 'flame',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['butterscotchPie', 'monsterCandy', 'monsterCandy', 'monsterCandy'],
  maxHp: 440,
  attack: 3,
  defense: 0,
  checkAttack: 80,
  checkDefense: 80,
  gold: 0,
  canFlee: true,
  cannotLose: true,
  box: { w: 184, h: 136 },
  fixedSpeed: true,
  check: 'Knows best for you.',
  intro: '* Toriel blocks the way!',
  flavor: [
    '* Toriel prepares a magical attack.',
    '* Toriel is acting aloof.',
    '* Toriel looks through you.',
    '* Toriel takes a deep breath.',
    '* Toriel is waiting for you to make a move.'
  ],

  setup(battle) {
    battle.flags.spares = 0;
    battle.flags.talks = 0;
  },

  acts: [
    {
      name: 'Talk',
      description: 'Try to talk to her.',
      use(battle) {
        battle.flags.talks += 1;
        if (battle.flags.talks === 1) return '* You couldn\'t think of any conversation topics.';
        if (battle.flags.talks === 2) return '* You tried to think of something to say again, but...';
        return '* Ironically, talking does not seem to be the solution to this situation.';
      }
    }
  ],

  getFlavor(battle) {
    const spares = battle.flags.spares;
    if (spares >= TORIEL_STOP_ATTACKING) return '* Toriel is just looking at you.';
    if (state.player.hp < 3) return '* Toriel looks away.';
    return null;
  },

  // Each spare (or missed attack) moves her story along.
  countSpare(battle) {
    battle.flags.spares += 1;
    const spares = battle.flags.spares;
    if (spares >= TORIEL_GIVES_UP) {
      winBattle(battle, 'spared', '* Toriel gave you a hug and let you go.\n* YOU WON! You earned 0 EXP and 0 gold.');
      return true;
    }
    return false;
  },

  onSpare(battle) {
    if (this.countSpare(battle)) return true;
    showResult(battle, '* You spared Toriel.');
    return true;
  },

  onMiss(battle) {
    this.countSpare(battle);
  },

  onFight(battle) {
    // once she has stopped fighting, she drops her guard completely
    if (battle.flags.spares >= TORIEL_STOP_ATTACKING) {
      battle.bossHp = 1;
      battle.flags.betrayed = true;
    }
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated' && battle.flags.betrayed) {
      return '* Toriel didn\'t defend herself at all.\n* ...\n* YOU WON! You earned 150 EXP and 0 gold.';
    }
    return null;
  },

  onFlee(battle) {
    showResult(battle, '* You ran back towards the stairs...\n* ...but Toriel was already there.');
    return true;
  },

  getDialogue(battle) {
    const spares = battle.flags.spares;
    if (spares === 0) return null;
    return TORIEL_SPARE_LINES[Math.min(spares, TORIEL_SPARE_LINES.length - 1)];
  },

  // If a hit brings the SOUL down to 2 HP, she ends the attack immediately.
  onPlayerHurt(battle) {
    if (state.player.hp <= 2 && battle.attack) battle.attack.done = true;
  },

  onLethal() {
    // her attacks cannot kill: a hit at very low HP leaves you at 1
    state.player.hp = 1;
    return true;
  },

  chooseAttack(battle) {
    const spares = battle.flags.spares;
    if (spares >= TORIEL_STOP_ATTACKING) return this.attacks[4];
    if (spares >= 11 || state.player.hp <= 2) return this.attacks[3];
    const order = [0, 1, 0, 2, 1, 2];
    const attack = this.attacks[order[battle.turn % order.length]];
    // later rounds of the paw sweep use two paws
    battle.flags.twoPaws = battle.turn >= 4;
    return attack;
  },

  attacks: [
    {
      name: 'Fire waves',
      duration: 6,
      start(run) {
        run.data.phase = Math.random() * Math.PI * 2;
      },
      update(run) {
        // two emitters sweep across the top in opposite phase: their streams cross,
        // leaving diamond-shaped gaps in the middle and quiet spots in the top corners
        every(run, 'emit', 0.085, () => {
          const swing = (arena.w / 2 - 34) * Math.sin(run.t * 2.1 + run.data.phase);
          const cx = arena.x + arena.w / 2;
          torielFire(cx + swing, arena.y - 10, 0, 118);
          torielFire(cx - swing, arena.y - 10, 0, 118);
        }, 0);
      }
    },
    {
      name: 'Paw sweep',
      duration: 6.5,
      start(run) {
        run.data.fires = [];
        run.data.paws = [spawnTorielPaw(run, false)];
        if (run.battle && run.battle.flags.twoPaws) run.data.paws.push(spawnTorielPaw(run, true));
      },
      update(run) {
        const SWEEP = 1.5;
        if (run.t < SWEEP) {
          every(run, 'drop', 0.1, () => {
            for (const paw of run.data.paws) {
              const f = torielFire(paw.x, paw.y + 14, 0, 0);
              f.noCull = true;
              run.data.fires.push(f);
            }
          }, 0);
        } else if (!run.data.launched) {
          run.data.launched = true;
          for (const paw of run.data.paws) paw.dead = true;
          // the fireballs fly at the SOUL and bounce off the walls
          for (const f of run.data.fires) {
            const v = aimAt(f.x, f.y, rand(105, 150), rand(-0.25, 0.25));
            f.vx = v.vx;
            f.vy = v.vy;
            f.update = bounceInArena;
            f.maxLife = f.life + 4;
          }
        }
      }
    },
    {
      name: 'Fire helix',
      duration: 6,
      start(run) {
        // two thick columns that drift a little but never cross
        run.data.columns = [arena.x + arena.w * 0.3, arena.x + arena.w * 0.7];
      },
      update(run) {
        every(run, 'emit', 0.07, () => {
          run.data.columns.forEach((x, i) => {
            const drift = Math.sin(run.t * 1.4 + i * 2) * 18;
            torielFire(x + drift + rand(-9, 9), arena.y - 10, 0, 150);
          });
        }, 0);
      }
    },
    {
      name: 'Faltering',
      duration: 5,
      update(run) {
        every(run, 'emit', 0.22, () => {
          const f = torielFire(rand(arena.x + 15, arena.x + arena.w - 15), arena.y - 10, 0, rand(90, 130));
          f.avoidSoul = true;
          f.harmless = true;
        }, 0);
      }
    },
    {
      name: 'No attack',
      quiet: true,
      duration: 0.6,
      update() {}
    }
  ]
});

// A fireball. Below 3 HP every fireball swerves around the SOUL.
function torielFire(x, y, vx, vy) {
  const f = spawn({ kind: 'fire', x, y, vx, vy, r: 7 });
  if (state.player.hp < 3) {
    f.avoidSoul = true;
    f.harmless = true;
  }
  return f;
}

function bounceInArena(b, dt) {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.x < arena.x + b.r || b.x > arena.x + arena.w - b.r) {
    b.vx *= -1;
    b.x = Math.max(arena.x + b.r, Math.min(arena.x + arena.w - b.r, b.x));
  }
  if (b.y < arena.y + b.r || b.y > arena.y + arena.h - b.r) {
    b.vy *= -1;
    b.y = Math.max(arena.y + b.r, Math.min(arena.y + arena.h - b.r, b.y));
  }
}

// A paw that sweeps over the board in an arc. Touching it ends the attack at once.
function spawnTorielPaw(run, mirrored) {
  const paw = spawn({
    kind: 'paw', x: 0, y: 0, r: 13, hw: 14, hh: 12, noCull: true, damage: 4, mirrored,
    update(b) {
      const k = Math.min(1, run.t / 1.5);
      const angle = Math.PI * (1 - k);              // from left to right over the top
      const cx = arena.x + arena.w / 2;
      const cy = mirrored ? arena.y + 26 : arena.y + arena.h - 26;
      const rx = arena.w / 2 - 22;
      const ry = arena.h - 60;
      b.x = mirrored ? cx - Math.cos(angle) * rx : cx + Math.cos(angle) * rx;
      b.y = mirrored ? cy + Math.sin(angle) * ry : cy - Math.sin(angle) * ry;
    },
    onHit() {
      run.done = true;
    }
  });
  paw.update(paw, 0);
  return paw;
}

BULLET_DRAWERS.paw = b => {
  // a generic white paw/hand: palm and four fingers
  ctx.fillStyle = '#ffffff';
  ctx.translate(b.x, b.y);
  if (b.mirrored) ctx.scale(1, -1);
  fillRoundRect(-12, -6, 24, 18, 6);
  for (let i = 0; i < 4; i++) fillRoundRect(-12 + i * 6.5, -16, 5, 12, 2);
};
