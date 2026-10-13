// Mad Dummy - Undertale, Waterfall (miniboss).
// Reference: a ghost in a dummy - physical attacks (FIGHT) just make it fall apart and
// reassemble. It floats above the board, drifting more and more erratically, and has
// smaller dummies attack: lines of dummies that sweep across with a gap, and dummies that
// shoot fuzzy scribbles. Scribbles you dodge fly on and hit Mad Dummy - that's how it takes
// damage. Then it brings in robot dummies with homing rockets (four turns, the rockets can
// also hit it), throws a knife, and finally Napstablook's tears start falling and Mad Dummy
// leaves in a huff.

const MAD_DUMMY_HITS = 8;

const MadDummy = registerBoss({
  id: 'mad_dummy',
  name: 'Mad Dummy',
  game: 'undertale',
  utBackground: 'grid',
  color: '#ff6b6b',
  emblem: 'dummy',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['snowmanPiece', 'cinnaBun', 'cinnaBun', 'monsterCandy'],
  maxHp: MAD_DUMMY_HITS,
  noHpDefeat: true,
  cannotBeFought: true,
  attack: 5,
  defense: 0,
  checkAttack: 30,
  checkDefense: 255,
  gold: 0,
  box: { w: 184, h: 184 },
  fixedSpeed: true,
  check: 'Because they\'re a ghost, physical attacks will fail.',
  intro: '* Mad Dummy blocks the way!',
  flavor: [
    '* Mad Dummy is bossing around its bullets.',
    '* Mad Dummy is glaring at you.',
    '* Mad Dummy looks like it\'s about to lose it.',
    '* Smells like a ventriloquist\'s nightmare.'
  ],

  // the dummy drifts left and right over the board
  get pos() {
    const t = state.clock;
    const wobble = state.battle && state.battle.flags.erratic ? Math.sin(t * 5.3) * 30 : 0;
    return { x: 360 + Math.sin(t * 0.9) * 110 + wobble, y: 86 };
  },

  setup(battle) {
    battle.flags.stage = 'dummies';
    battle.flags.robotTurns = 0;
    battle.flags.erratic = false;
  },

  acts: [
    {
      name: 'Talk',
      description: 'Say something.',
      use() {
        return '* You try to talk to Mad Dummy.\n* "DON\'T YOU DARE TALK TO ME, YOU... YOU...!"';
      }
    }
  ],

  onFight(battle) {
    addBurst(this.pos.x, this.pos.y, '#d9b77e', 12, 120);
    battle.flags.foughtText = true;
    return 'miss';
  },

  getFlavor(battle) {
    if (battle.flags.foughtText) {
      battle.flags.foughtText = false;
      return '* Mad Dummy fell apart... and pulled itself back together.\n* Physical attacks won\'t work!';
    }
    return null;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick([
      'Don\'t you DARE look at me like that!',
      'My cousin was a good dummy!',
      'Hit me if you can! Oh wait, YOU CAN\'T!',
      'DUMMIES! ATTACK!',
      'I\'ll take your SOUL and become corporeal!'
    ]);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (f.stage === 'dummies') {
      if (battle.bossHp <= 0) {
        f.stage = 'robots';
      } else {
        f.erratic = battle.bossHp < MAD_DUMMY_HITS / 2;
        return battle.turn % 2 === 0 ? MAD_DUMMY_ATTACKS.scribbles : MAD_DUMMY_ATTACKS.dummyLine;
      }
    }
    if (f.stage === 'robots') {
      f.robotTurns += 1;
      if (f.robotTurns >= 4) f.stage = 'knife';
      return MAD_DUMMY_ATTACKS.robots;
    }
    if (f.stage === 'knife') {
      f.stage = 'rain';
      return MAD_DUMMY_ATTACKS.knife;
    }
    f.stage = 'done';
    return MAD_DUMMY_ATTACKS.rain;
  },

  onTurnEnd(battle) {
    if (battle.flags.stage === 'done' && !battle.outcome) {
      winBattle(battle, 'survived', '* Mad Dummy stormed off, soaked.\n* Napstablook drifted by: "oh... i didn\'t see you there..."\n* YOU WON!');
    }
  },

  draw(x, y, t) {
    // a generic training dummy, shaking with rage
    ctx.save();
    ctx.translate(Math.sin(t * 40) * 1.5, 0);
    TrainingDummy.draw(x, y, t);
    ctx.restore();
  },

  attacks: []
});

// A projectile that keeps flying after leaving the board and hurts Mad Dummy if it reaches it.
function madShot(b) {
  b.noCull = true;
  b.maxLife = b.maxLife || 4;
  const move = b.update;
  b.update = (bullet, dt) => {
    if (move) move(bullet, dt);
    else {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
    const battle = state.battle;
    if (!battle || bullet.hitDummy) return;
    const at = MadDummy.pos;
    if (Math.abs(bullet.x - at.x) < 40 && Math.abs(bullet.y - at.y) < 60) {
      bullet.hitDummy = true;
      bullet.dead = true;
      if (battle.bossHp > 0) {
        battle.bossHp -= 1;
        battle.bossHurt = 0.5;
        addPopup('1', at.x, at.y - 20, '#ff3030');
        sfx.damage();
      }
    }
  };
  b.clip = false;
  return b;
}

function scribbleFrom(x, y) {
  // aimed at the SOUL; if it misses it flies on - towards Mad Dummy if you lined it up
  const v = aimAt(x, y, 160);
  return madShot(spawn({ kind: 'scribble', x, y, vx: v.vx, vy: v.vy, r: 6, minLife: 2 }));
}

const MAD_DUMMY_ATTACKS = {
  scribbles: {
    name: 'Scribbles',
    duration: 6.5,
    update(run) {
      // dummies below the board shoot upwards at the SOUL
      every(run, 'shot', 0.65, () => {
        const x = rand(arena.x + 10, arena.x + arena.w - 10);
        spawn({ kind: 'miniDummy', x, y: arena.y + arena.h + 22, r: 10, harmless: true, clip: false, maxLife: 0.6 });
        scribbleFrom(x, arena.y + arena.h + 10);
      }, 0.3);
    }
  },
  dummyLine: {
    name: 'Dummy line',
    duration: 6.5,
    update(run) {
      // a column of dummies sweeps across the board, with one gap
      every(run, 'line', 1.6, () => {
        const fromLeft = run.data.left = !run.data.left;
        const rows = 5;
        const gap = randInt(0, rows - 1);
        for (let i = 0; i < rows; i++) {
          if (i === gap) continue;
          const y = arena.y + (arena.h * (i + 0.5)) / rows;
          spawn({ kind: 'miniDummy', x: fromLeft ? arena.x - 14 : arena.x + arena.w + 14, y, vx: fromLeft ? 150 : -150, hw: 9, hh: 12, warn: 0.3, minLife: 1 });
        }
      }, 0.2);
      every(run, 'shot', 1.2, () => scribbleFrom(rand(arena.x, arena.x + arena.w), arena.y + arena.h + 10), 0.8);
    }
  },
  robots: {
    name: 'Robot dummies',
    duration: 7,
    line: 'Fine! These dummies were useless anyway! ROBOTS!',
    update(run) {
      every(run, 'rocket', 1.0, () => {
        const fromLeft = chance(0.5);
        const x = fromLeft ? arena.x - 18 : arena.x + arena.w + 18;
        const y = rand(arena.y + 20, arena.y + arena.h - 20);
        madShot(spawn({
          kind: 'rocket', x, y, vx: 0, vy: 0, r: 6, lock: 1.1, maxLife: 5, minLife: 3,
          update(b, dt) {
            // homes in while the lock-on circle is visible, then flies straight
            if (b.life < b.lock) {
              const v = aimAt(b.x, b.y, 120);
              b.vx += (v.vx - b.vx) * Math.min(1, dt * 3);
              b.vy += (v.vy - b.vy) * Math.min(1, dt * 3);
            } else if (!b.boosted) {
              b.boosted = true;
              const len = Math.hypot(b.vx, b.vy) || 1;
              b.vx = (b.vx / len) * 230;
              b.vy = (b.vy / len) * 230;
            }
            b.x += b.vx * dt;
            b.y += b.vy * dt;
          }
        }));
      }, 0.3);
    }
  },
  knife: {
    name: 'Knife',
    duration: 3,
    line: 'Here\'s something sharp for you!',
    start() {
      const at = MadDummy.pos;
      const v = aimAt(at.x, arena.y - 10, 300);
      spawn({ kind: 'spear', x: at.x, y: arena.y - 10, vx: v.vx, vy: v.vy, hw: 14, hh: 3, angle: v.angle, damage: 7, warn: 0.5, color: '#dddddd', noCull: true, maxLife: 3,
        update(b, dt) { if (b.life > b.warn) { b.x += b.vx * dt; b.y += b.vy * dt; } } });
    },
    update() {}
  },
  rain: {
    name: 'Acid rain',
    duration: 4,
    line: 'What!? Who invited YOU!? ...Ugh, forget it!',
    update(run) {
      every(run, 'tear', 0.12, () => {
        spawn({ kind: 'tear', x: rand(arena.x, arena.x + arena.w), y: arena.y - 8, vy: 150, r: 4, damage: 1, maxLife: 3 });
      }, 0);
    }
  }
};

BULLET_DRAWERS.scribble = b => {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = b.life * 12 + i * 2.1;
    ctx.lineTo(b.x + Math.cos(a) * b.r, b.y + Math.sin(a * 1.3) * b.r);
  }
  ctx.stroke();
};

BULLET_DRAWERS.miniDummy = b => {
  ctx.fillStyle = b.life < (b.warn || 0) && Math.floor(b.life * 14) % 2 === 0 ? '#ff4040' : '#d9b77e';
  fillRoundRect(b.x - 8, b.y - 8, 16, 14, 4);
  fillCircle(b.x, b.y - 11, 5);
  ctx.fillRect(b.x - 1, b.y + 6, 2, 6);
};

BULLET_DRAWERS.rocket = b => {
  if (b.life < b.lock) {
    ctx.strokeStyle = '#ff3030';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, 14 * (1 - b.life / b.lock) + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.fillStyle = '#dddddd';
  fillRoundRect(-9, -4, 18, 8, 3);
  ctx.fillStyle = '#ff7a3d';
  ctx.fillRect(-13, -2, 4, 4);
};

MadDummy.attacks = Object.values(MAD_DUMMY_ATTACKS);
