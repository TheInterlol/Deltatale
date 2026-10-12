// Mettaton EX - Undertale, CORE (Neutral/Pacifist).
// Reference: the fight is a live TV show with a RATINGS meter. The SOUL turns YELLOW (facing
// up) and shoots with Z. Ratings go up when you put on a show - Pose, Boast, a Heel Turn,
// moving with style during attacks, flashy items - and down when you get hit or bore the
// audience. Attacks: leg kicks, falling blocks and bombs (a shot bomb explodes in a plus shape
// and clears blocks - and you, if you're in it), mini Mettatons, disco-ball lasers in cyan and
// orange, his heart with spinning arms (shoot it and his arms come off), dancing legs (shoot
// them off), and a lightning finale. The show ends when the ratings hit 10000 or time runs out.
// (Numbers are tuned for this boss rush; the original fight runs on a similar ratings goal.)

const MTT_GOAL = 10000;
const MTT_SHOW_TURNS = 16;

const MettatonEx = registerBoss({
  id: 'mettaton_ex',
  name: 'Mettaton EX',
  game: 'undertale',
  color: '#ff6be2',
  emblem: 'bolt',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 120 },
  items: ['glamburger', 'glamburger', 'faceSteak', 'legendaryHero', 'instantNoodles'],
  maxHp: 1500,
  attack: 6,
  defense: 0,
  checkAttack: 47,
  checkDefense: 47,
  gold: 0,
  box: { w: 240, h: 170 },
  fixedSpeed: true,
  check: 'His weak point is his heart-shaped core.',
  intro: '* Mettaton EX makes his premiere!\n* RATINGS are live!',
  flavor: [
    '* The audience is waiting for something fabulous.',
    '* Mettaton EX is posing for the camera.',
    '* Mettaton EX gives you a wink.',
    '* The stage lights are blinding.'
  ],

  setup(battle) {
    battle.flags.ratings = 5000;
    battle.flags.boasted = false;
    battle.flags.heelTurn = false;
    battle.flags.armsOff = false;
    battle.flags.legsOff = false;
  },

  statusText(battle) {
    return `RATINGS ${battle.flags.ratings} / ${MTT_GOAL}`;
  },

  acts: [
    {
      name: 'Pose',
      description: 'Strike a pose for the audience.',
      use(battle) {
        const low = state.player.hp <= state.player.maxHp / 2;
        const gain = low ? 400 : 180;
        mttRatings(battle, gain);
        return low
          ? '* Despite being hurt, you strike a dramatic pose!\n* The audience loves it!'
          : '* You strike a pose.\n* The audience nods.';
      }
    },
    {
      name: 'Boast',
      description: 'Big ratings - if you don\'t get hit next.',
      use(battle) {
        battle.flags.boasted = true;
        mttRatings(battle, 300);
        return '* You boast that you won\'t get hit at all next turn!\n* The audience gets excited... (don\'t get hit!)';
      }
    },
    {
      name: 'Heel Turn',
      description: 'Turn evil for a moment.',
      use(battle) {
        if (battle.flags.heelTurn) {
          mttRatings(battle, -150);
          return '* You try to be evil again.\n* The audience has seen this already. Ratings dropped.';
        }
        battle.flags.heelTurn = true;
        mttRatings(battle, 700);
        return '* You twirl a fake mustache and laugh evilly.\n* The audience gasps! Ratings shot up!';
      }
    }
  ],

  onItem(battle, id, text) {
    if (['glamburger', 'faceSteak'].includes(id)) {
      mttRatings(battle, 350);
      return `${text}\n* The audience loves the brand placement!`;
    }
    mttRatings(battle, 60);
    return text;
  },

  onPlayerHurt(battle) {
    mttRatings(battle, battle.flags.boasted ? -400 : -80);
    battle.flags.boasted = false;
  },

  getFlavor(battle) {
    if (battle.flags.ratings >= MTT_GOAL * 0.8) return '* The phones are ringing off the hook!';
    return null;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick([
      'OHHH YES! LIGHTS! CAMERA! ACTION!',
      'Darling, you\'re making this too easy!',
      'Let\'s give the audience what they want!',
      'Smile, you\'re on live TV!',
      'Ooh, the ratings are climbing!'
    ]);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    const order = ['legs', 'bombs', 'disco', 'minis', 'heart', 'bombs2', 'disco2', 'legsShoot', 'minis', 'lightning'];
    let id = order[battle.turn % order.length];
    if (id === 'heart' && f.armsOff) id = 'bombs';
    if (id === 'legsShoot' && f.legsOff) id = 'disco';
    return MTT_ATTACKS[id];
  },

  onTurnEnd(battle) {
    const f = battle.flags;
    // the audience gets a little bored every turn - unless the goal was reached
    if (!f.boasted && f.ratings < MTT_GOAL) mttRatings(battle, -40);
    f.boasted = false;
    if (f.ratings >= MTT_GOAL) {
      winBattle(battle, 'survived', '* The ratings hit 10,000!\n* The audience is calling in... Mettaton EX takes a bow.\n* YOU WON! The show was a hit!');
    } else if (battle.turn >= MTT_SHOW_TURNS) {
      winBattle(battle, 'survived', `* The show ran out of time.\n* Final ratings: ${f.ratings}.\n* YOU WON! (Get 10,000 for the best ending!)`);
    }
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Mettaton EX\'s body broke down...\n* "...Darling... it was a great show..."\n* YOU WON! You earned 0 EXP.';
    return null;
  },

  attacks: []
});

function mttRatings(battle, amount) {
  if (!battle || !battle.flags || battle.flags.ratings === undefined) return;
  battle.flags.ratings = Math.max(0, Math.min(MTT_GOAL, Math.round(battle.flags.ratings + amount)));
  if (Math.abs(amount) >= 100) {
    const at = bossPosition(battle.boss);
    addPopup(`${amount > 0 ? '+' : ''}${amount}`, at.x + 60, at.y - 40, amount > 0 ? '#ffe14d' : '#ff6b6b');
  }
}

// Ratings tick up while you move around during attacks (the audience likes action).
function mttStyle(run, dt) {
  if (run.battle && state.player.moving) {
    run.data.style = (run.data.style || 0) + dt * 30;
    if (run.data.style >= 10) {
      run.data.style -= 10;
      mttRatings(run.battle, 10);
    }
  }
}

function mttBomb(x, y, vy) {
  return spawn({
    kind: 'mttBomb', x, y, vy, r: 9, noCull: true, maxLife: 6, shootHp: 1, harmless: false,
    onDestroyed: b => {
      // explodes in a plus shape: clears blocks in that row and column
      warnZone(arena.x, b.y - 8, arena.w, 16, 0.12, 0.25, { color: '#ffe14d', damage: 6 });
      warnZone(b.x - 8, arena.y, 16, arena.h, 0.12, 0.25, { color: '#ffe14d', damage: 6 });
      for (const other of state.bullets) {
        if (other.kind === 'mttBlock' && (Math.abs(other.y - b.y) < 16 || Math.abs(other.x - b.x) < 16)) {
          other.dead = true;
          addBurst(other.x, other.y, '#ffffff', 6, 80);
        }
      }
      if (state.battle) mttRatings(state.battle, 60);
    }
  });
}

function mttBlock(x, y, vy) {
  return spawn({ kind: 'mttBlock', x, y, vy, hw: 13, hh: 13, noCull: true, maxLife: 6, shootHp: 6 });
}

const MTT_ATTACKS = {
  legs: {
    name: 'Leg kicks',
    duration: 6,
    soul: 'yellow',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'kick', 0.7, () => {
        const cols = 6;
        const col = randInt(0, cols - 1);
        const w = arena.w / cols;
        warnZone(arena.x + col * w + 2, arena.y, w - 4, arena.h * 0.75, 0.45, 0.3, { kind: 'mttLeg' });
      }, 0.2);
    }
  },
  bombs: {
    name: 'Bombs and blocks',
    duration: 8,
    soul: 'yellow',
    line: 'Let\'s see if you can shoot your way out of THIS!',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'row', 1.25, () => {
        // a row of blocks falls down with a bomb hidden in it
        const cols = 8;
        const w = arena.w / cols;
        const bombCol = randInt(0, cols - 1);
        for (let i = 0; i < cols; i++) {
          const x = arena.x + w * (i + 0.5);
          if (i === bombCol) mttBomb(x, arena.y - 14, 55);
          else mttBlock(x, arena.y - 14, 55);
        }
      }, 0.1);
    }
  },
  bombs2: {
    name: 'Bombs and blocks II',
    duration: 8,
    soul: 'yellow',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'row', 1.0, () => {
        const cols = 8;
        const w = arena.w / cols;
        for (let i = 0; i < cols; i++) {
          const x = arena.x + w * (i + 0.5);
          if (chance(0.25)) mttBomb(x, arena.y - 14, 70);
          else if (chance(0.7)) mttBlock(x, arena.y - 14, 70);
        }
      }, 0.1);
    }
  },
  disco: {
    name: 'Disco ball',
    duration: 6.5,
    soul: 'yellow',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'laser', 0.75, () => {
        // a laser line sweeps across: cyan = stand still, orange = keep moving
        const color = chance(0.5) ? 'cyan' : 'orange';
        const fromTop = chance(0.5);
        spawn({
          kind: 'laser', x: arena.x + arena.w / 2, y: fromTop ? arena.y - 4 : arena.y + arena.h + 4,
          vy: fromTop ? 120 : -120, hw: arena.w / 2, hh: 3, color, noCull: true, maxLife: 2.4
        });
      }, 0.2);
    }
  },
  disco2: {
    name: 'Disco ball II',
    duration: 7,
    soul: 'yellow',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'laser', 0.5, () => {
        const color = chance(0.5) ? 'cyan' : 'orange';
        const vertical = chance(0.4);
        if (vertical) {
          const fromLeft = chance(0.5);
          spawn({ kind: 'laser', x: fromLeft ? arena.x - 4 : arena.x + arena.w + 4, y: arena.y + arena.h / 2, vx: fromLeft ? 140 : -140, hw: 3, hh: arena.h / 2, color, noCull: true, maxLife: 2.2 });
        } else {
          const fromTop = chance(0.5);
          spawn({ kind: 'laser', x: arena.x + arena.w / 2, y: fromTop ? arena.y - 4 : arena.y + arena.h + 4, vy: fromTop ? 140 : -140, hw: arena.w / 2, hh: 3, color, noCull: true, maxLife: 2.2 });
        }
      }, 0.2);
    }
  },
  minis: {
    name: 'Mini Mettatons',
    duration: 7,
    soul: 'yellow',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'mini', 0.6, () => {
        // little boxes drift down and drop bombs; shoot them for ratings
        const x = rand(arena.x + 15, arena.x + arena.w - 15);
        spawn({
          kind: 'miniBox', x, y: arena.y - 10, vy: 45, hw: 9, hh: 9, noCull: true, maxLife: 6, shootHp: 2,
          onDestroyed: () => state.battle && mttRatings(state.battle, 80),
          update(b, dt2) {
            b.y += b.vy * dt2;
            b.drop = (b.drop || 0) + dt2;
            if (b.drop > 1.1) {
              b.drop = 0;
              spawn({ kind: 'normal', x: b.x, y: b.y + 10, vy: 170, r: 4, maxLife: 3 });
            }
          }
        });
      }, 0.2);
    }
  },
  heart: {
    name: 'Heart and arms',
    duration: 9,
    soul: 'yellow',
    line: 'Ooh, aiming for my heart? How ROMANTIC!',
    start(run) {
      const c = { x: arena.x + arena.w / 2, y: arena.y + 40 };
      run.data.heart = spawn({
        kind: 'suit', suit: 'heart', x: c.x, y: c.y, r: 14, harmless: true, noCull: true, faceVelocity: false, color: '#ff4d6b',
        shootHp: 24, onDestroyed: () => {
          if (run.battle) {
            run.battle.flags.armsOff = true;
            mttRatings(run.battle, 1000);
          }
          run.done = true;
        }
      });
      // two arms spin around the heart
      for (let i = 0; i < 2; i++) {
        spawn({
          kind: 'normal', x: c.x, y: c.y, hw: 50, hh: 4, noCull: true, color: '#c8c8c8',
          update(b, dt) {
            b.angle = run.t * 1.8 + i * Math.PI / 2;
            b.x = c.x + Math.cos(b.angle) * 56;
            b.y = c.y + Math.sin(b.angle) * 56;
          }
        });
      }
    },
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'shot', 0.9, () => {
        const h = run.data.heart;
        if (h.dead) return;
        const v = aimAt(h.x, h.y, 150);
        spawn({ kind: 'normal', x: h.x, y: h.y, vx: v.vx, vy: v.vy, r: 4, maxLife: 4 });
      }, 0.5);
    }
  },
  legsShoot: {
    name: 'Dancing legs',
    duration: 9,
    soul: 'yellow',
    line: 'Behold! The legs everyone has been talking about!',
    start(run) {
      run.data.legs = [0, 1].map(i => spawn({
        kind: 'mttLegBody', x: arena.x + arena.w * (0.3 + i * 0.4), y: arena.y + 30, hw: 10, hh: 34, noCull: true, shootHp: 18,
        onDestroyed: () => {
          if (run.data.legs.every(l => l.dead) && run.battle) {
            run.battle.flags.legsOff = true;
            mttRatings(run.battle, 1000);
            run.done = true;
          }
        },
        update(b) {
          // the legs kick down and back up
          b.y = arena.y + 30 + Math.max(0, Math.sin(run.t * 2.4 + i * Math.PI)) * (arena.h - 80);
        }
      }));
    },
    update(run, dt) {
      mttStyle(run, dt);
    }
  },
  lightning: {
    name: 'Lightning finale',
    duration: 7,
    soul: 'yellow',
    line: 'Time for the GRAND FINALE!',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'bolt', 0.42, () => {
        const w = 22;
        const x = rand(arena.x, arena.x + arena.w - w);
        warnZone(x, arena.y, w, arena.h, 0.5, 0.18, { kind: 'bolt', color: '#fff7a8' });
      }, 0.1);
    }
  }
};

BULLET_DRAWERS.mttBomb = b => {
  ctx.fillStyle = '#333';
  fillCircle(b.x, b.y, b.r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ff4040';
  ctx.font = TINY_FONT;
  ctx.textAlign = 'center';
  ctx.fillText('+', b.x, b.y + 4);
};

BULLET_DRAWERS.mttBlock = b => {
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
  ctx.strokeStyle = '#888';
  ctx.strokeRect(b.x - b.hw + 2, b.y - b.hh + 2, b.hw * 2 - 4, b.hh * 2 - 4);
};

BULLET_DRAWERS.laser = (b, fill) => {
  ctx.fillStyle = fill;
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.miniBox = b => {
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(b.x - 4, b.y - 2, 8, 4);
};

BULLET_DRAWERS.mttLeg = (b, fill) => {
  const x = b.x - b.hw;
  const y = b.y - b.hh;
  if (b.life < b.warn) {
    ctx.strokeStyle = Math.floor(b.life * 14) % 2 === 0 ? '#ff3030' : '#801010';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, b.hw * 2 - 2, b.hh * 2 - 2);
    return;
  }
  // a long leg kicking down with a heeled boot
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(b.x - 6, y, 12, b.hh * 2 - 10);
  ctx.fillStyle = '#ff6be2';
  fillRoundRect(b.x - 10, y + b.hh * 2 - 14, 20, 14, 4);
};

BULLET_DRAWERS.mttLegBody = b => {
  ctx.fillStyle = b.flash ? '#fff' : '#d0d0d0';
  ctx.fillRect(b.x - 6, b.y - b.hh, 12, b.hh * 2 - 10);
  ctx.fillStyle = '#ff6be2';
  fillRoundRect(b.x - 10, b.y + b.hh - 14, 20, 14, 4);
};

BULLET_DRAWERS.bolt = (b, fill) => {
  const x = b.x - b.hw;
  const y = b.y - b.hh;
  if (b.life < b.warn) {
    ctx.fillStyle = 'rgba(255, 247, 168, 0.18)';
    ctx.fillRect(x, y, b.hw * 2, b.hh * 2);
    return;
  }
  ctx.strokeStyle = fill;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(b.x, y);
  for (let yy = y; yy <= y + b.hh * 2; yy += 18) ctx.lineTo(b.x + (Math.random() - 0.5) * b.hw * 1.6, yy);
  ctx.stroke();
};

MettatonEx.attacks = Object.values(MTT_ATTACKS);
MettatonEx.attacks.forEach(a => { a.soulOptions = { facing: 'up', bigShot: false }; });
