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


// ---------------------------------------------------------------- attacks
// Taken from the fight: a small square board under Mettaton, and narrow columns for the
// bomb puzzles. Legs come down from both sides, mini Mettatons float down on parasols and
// throw hearts, black boxes and plus bombs fall (shoot a bomb and it blasts its whole row
// and column - boxes too), a disco ball sweeps blue and white beams, lightning swirls into
// his core, REC / REW replays a wave backwards and the finale strikes one half of the board
// after the other.
const MTT_BOX = { w: 130, h: 100 };
const MTT_FUSE = 0.4;
const MTT_LEG_TINT = '#ecec6a';

function mttCore() {
  const at = bossPosition(MettatonEx);
  return { x: at.x - 4, y: at.y - 12 };
}

function mttBlast(x, y) {
  // the plus-shaped explosion runs over the whole screen
  const opts = { kind: 'mttBlast', activeFor: 0.3, fadeOut: 0.15, noCull: true, clip: false, damage: 5 };
  spawn({ ...opts, x: VIEW_W / 2, y, hw: VIEW_W / 2, hh: 7, horizontal: true });
  spawn({ ...opts, x, y: VIEW_H / 2, hw: 7, hh: VIEW_H / 2, horizontal: false });
  addBurst(x, y, '#ffffff', 10, 140);
  sfx.pop();
  for (const other of state.bullets) {
    if (other.kind === 'mttBlock' && (Math.abs(other.y - y) < 14 || Math.abs(other.x - x) < 14)) {
      other.dead = true;
      addBurst(other.x, other.y, '#ffffff', 6, 80);
    }
  }
}

// falling props vanish once they pass the bottom of the board
function mttFall(b, dt) {
  b.y += b.vy * dt;
  if (b.y > arena.y + arena.h + 12 || (b.vy < 0 && b.y < arena.y - 90)) b.dead = true;
}

function mttBomb(x, y, vy, extra = {}) {
  return spawn({
    kind: 'mttBomb', x, y, vy, r: 9, noCull: true, clip: false, maxLife: 9, shootHp: 1, update: mttFall, ...extra,
    onDestroyed: b => {
      // a shot bomb flashes for a moment before it blows - time to step out of its lines
      spawn({
        kind: 'mttBomb', lit: true, x: b.x, y: b.y, vy: b.vy, r: 9, harmless: true, noCull: true, clip: false, maxLife: 2,
        update(l, dt) {
          mttFall(l, dt);
          if (l.life >= MTT_FUSE) { l.dead = true; mttBlast(l.x, l.y); }
        }
      });
      if (state.battle) mttRatings(state.battle, 50);
    }
  });
}

// black boxes swallow shots; only a bomb blast clears them
function mttBlock(x, y, vy, extra = {}) {
  return spawn({ kind: 'mttBlock', x, y, vy, hw: 10, hh: 10, noCull: true, clip: false, maxLife: 9, shootHp: Infinity, update: mttFall, ...extra });
}

// a long leg with a heel, sliding in from one side as it comes down
function mttLeg(side, tipX, y, vy) {
  const len = 162;
  const dir = side === 'left' ? 1 : -1;
  const endX = tipX - dir * len / 2;
  return spawn({
    kind: 'mttLegBullet', side, x: endX - dir * 60, y, vy, hw: len / 2, hh: 5, noCull: true, maxLife: 6, clip: false,
    update(b, dt) {
      b.x += (endX - b.x) * Math.min(1, dt * 9);
      b.y += b.vy * dt;
    }
  });
}

const MTT_ATTACKS = {
  legs: {
    name: 'Legs', duration: 7.5, box: MTT_BOX,
    line: 'Lights! Camera! Action!',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'leg', 0.68, () => {
        run.data.n = (run.data.n || 0) + 1;
        const side = run.data.n % 2 ? 'left' : 'right';
        const reach = rand(0.28, 0.6) * arena.w;
        const tipX = side === 'left' ? arena.x + reach : arena.x + arena.w - reach;
        mttLeg(side, tipX, arena.y - 70, 78);
      }, 0.1);
    }
  },
  minis: {
    name: 'Parasol Mettatons', duration: 8, box: MTT_BOX,
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'mini', 0.9, () => {
        // they float down beside the board and toss hearts in
        const left = (run.data.k = (run.data.k || 0) + 1) % 2 === 0;
        const x = left ? arena.x - 24 : arena.x + arena.w + 24;
        spawn({
          kind: 'mttParasol', x, y: arena.y - 60, vy: 38, r: 10, harmless: true, noCull: true, clip: false, maxLife: 7,
          update(b, dt2) {
            b.y += b.vy * dt2;
            b.x += Math.sin(b.life * 2) * 10 * dt2;
            b.toss = (b.toss || 0.4) - dt2;
            if (b.toss <= 0 && b.y > arena.y - 30 && b.y < arena.y + arena.h - 10) {
              b.toss = 1.1;
              const dir = left ? 1 : -1;
              spawn({ kind: 'mttHeart', x: b.x + dir * 12, y: b.y, vx: dir * rand(55, 95), vy: -rand(40, 90), ay: 110, r: 7, clip: false,
                maxLife: 4, minLife: 1, shootHp: 1, onDestroyed: () => state.battle && mttRatings(state.battle, 30) });
            }
          }
        });
      }, 0.2);
    }
  },
  bombs: {
    name: 'Bombs and boxes', duration: 8.5, box: MTT_BOX,
    line: 'Let\'s see if you can shoot your way out of THIS!',
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'row', 1.3, () => {
        // a row of boxes with a bomb somewhere in it
        const cols = 6;
        const w = arena.w / cols;
        const bombCol = randInt(0, cols - 1);
        const gap = chance(0.4) ? randInt(0, cols - 1) : -1;
        for (let i = 0; i < cols; i++) {
          if (i === gap && i !== bombCol) continue;
          const x = arena.x + w * (i + 0.5);
          if (i === bombCol) mttBomb(x, arena.y - 14, 50);
          else mttBlock(x, arena.y - 14, 50);
        }
      }, 0.1);
    }
  },
  disco: {
    name: 'Disco ball', duration: 7.5, box: MTT_BOX,
    line: 'Let\'s DANCE!',
    start(run) {
      const ball = { x: arena.x + arena.w / 2, y: arena.y + 6 };
      run.data.ball = ball;
      spawn({ kind: 'mttDisco', x: ball.x, y: ball.y, r: 12, harmless: true, noCull: true, clip: false });
      // two blue beams (move = hurt) and one orange beam (stand still = hurt), sweeping
      const beams = [{ color: 'cyan', off: -1 }, { color: 'cyan', off: 1 }, { color: 'orange', off: 0 }];
      for (const beam of beams) {
        spawn({
          kind: 'mttRay', x: ball.x, y: ball.y, hw: 120, hh: 2, angle: Math.PI / 2, color: beam.color,
          warn: 0.5, noCull: true, noFx: true, ownWarn: true,
          update(b) {
            const t = run.t;
            const swing = Math.sin(t * 1.1) * 0.55;
            const spread = 0.45 + Math.sin(t * 0.7) * 0.2;
            const a = Math.PI / 2 + swing + beam.off * spread + (beam.off === 0 ? Math.sin(t * 2.3) * 0.9 : 0);
            b.angle = a;
            b.x = ball.x + Math.cos(a) * b.hw;
            b.y = ball.y + Math.sin(a) * b.hw;
          }
        });
      }
    },
    update(run, dt) { mttStyle(run, dt); }
  },
  heart: {
    name: 'Heart lightning', duration: 9, box: MTT_BOX,
    line: 'Ooh, aiming for my heart? How ROMANTIC!',
    start(run) {
      const c = mttCore();
      // his core is open - shoot it enough and his arms come off
      run.data.heart = spawn({
        kind: 'mttCore', x: c.x, y: c.y, r: 12, harmless: true, noCull: true, clip: false, shootHp: 22,
        onDestroyed: () => {
          if (run.battle) {
            run.battle.flags.armsOff = true;
            mttRatings(run.battle, 1000);
          }
          run.done = true;
        }
      });
    },
    update(run, dt) {
      mttStyle(run, dt);
      const c = mttCore();
      // lightning swirls in from all around and pours into the board
      every(run, 'swirl', 2.4, () => {
        for (let i = 0; i < 16; i++) {
          const a0 = (i / 16) * Math.PI * 2;
          spawn({ kind: 'mttBolt', x: c.x, y: c.y, r: 6, harmless: true, noCull: true, clip: false, maxLife: 1.3,
            update(b) {
              const k = b.life / 1.3;
              const rad = 300 * (1 - k);
              const a = a0 + k * 5;
              b.x = c.x + Math.cos(a) * rad;
              b.y = c.y + Math.sin(a) * rad * 0.7;
              b.angle = a;
            } });
        }
        run.data.pour = 1.3;
      }, 0.3);
      if (run.data.pour !== undefined) {
        run.data.pour -= dt;
        if (run.data.pour <= 0) {
          run.data.pour = undefined;
          // three bolts in five lanes: there is always a free lane
          const lanes = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, 3);
          for (const i of lanes) {
            const x = arena.x + (i + 0.5) * arena.w / 5;
            spawn({ kind: 'mttBolt', x: c.x, y: c.y + 10, r: 6, noCull: true, clip: false, maxLife: 4, minLife: 1,
              vx: (x - c.x) / 0.6, vy: (arena.y - c.y) / 0.6, ay: 0,
              update(b, dt2) {
                if (b.life < 0.6) { b.x += b.vx * dt2; b.y += b.vy * dt2; return; }
                                b.y += 150 * dt2;
              } });
          }
        }
      }
    }
  },
  column: {
    name: 'Bomb column', duration: 9, box: { w: 44, h: 110 },
    line: 'Here\'s a little puzzle for you, darling!',
    update(run, dt) {
      mttStyle(run, dt);
      // a box with a bomb beside it: blow up the bomb so its blast clears the box,
      // then step out of the bomb's column before it goes off
      every(run, 'pair', 1.8, () => {
        const side = pick([-1, 1]);
        mttBlock(arena.x + arena.w / 2 + side * 10, arena.y - 12, 50);
        mttBomb(arena.x + arena.w / 2 - side * 10, arena.y - 12, 50);
      }, 0.1);
    }
  },
  legsShoot: {
    name: 'Dancing legs', duration: 9, box: MTT_BOX,
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
          b.y = arena.y + 30 + Math.max(0, Math.sin(run.t * 2.4 + i * Math.PI)) * (arena.h - 70);
        }
      }));
    },
    update(run, dt) {
      mttStyle(run, dt);
    }
  },
  rewind: {
    name: 'REC / REW', duration: 9, box: { w: 84, h: 100 },
    update(run, dt) {
      mttStyle(run, dt);
      // REC: rows fall; REW: everything plays backwards for a moment
      const cycle = run.t % 3.2;
      const rewinding = cycle > 2.2;
      run.data.mode = rewinding ? 'rew' : 'rec';
      if (rewinding !== run.data.wasRew) {
        run.data.wasRew = rewinding;
        for (const b of state.bullets) if (b.kind === 'mttBlock' || b.kind === 'mttBomb') b.vy = rewinding ? -60 : 60;
      }
      if (!rewinding) {
        every(run, 'row', 0.95, () => {
          const cols = 3;
          const w = arena.w / cols;
          const skip = randInt(0, cols - 1);
          for (let i = 0; i < cols; i++) {
            if (i === skip) continue;
            const x = arena.x + w * (i + 0.5);
            if (chance(0.3)) mttBomb(x, arena.y - 14, 60);
            else mttBlock(x, arena.y - 14, 60);
          }
        }, 0.1);
      }
    }
  },
  cascade: {
    name: 'Box avalanche', duration: 8.5, box: MTT_BOX,
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'drop', 0.4, () => {
        // never right next to the last one, so the gaps don't close up
        let x;
        do x = rand(arena.x + 10, arena.x + arena.w - 10); while (run.data.lastX !== undefined && Math.abs(x - run.data.lastX) < 26);
        run.data.lastX = x;
        if (chance(0.4)) mttBomb(x, arena.y - 16, 75);
        else mttBlock(x, arena.y - 16, 75);
      }, 0.1);
    }
  },
  finale: {
    name: 'Grand finale', duration: 8, box: MTT_BOX,
    line: 'Time for the GRAND FINALE!',
    update(run, dt) {
      mttStyle(run, dt);
      // one half of the board lights up with a "!" - then legs stab through it
      every(run, 'half', 1.2, () => {
        run.data.h = (run.data.h || 0) + 1;
        const left = run.data.h % 2 === 1 ? chance(0.5) : !run.data.lastLeft;
        run.data.lastLeft = left;
        const w = arena.w / 2;
        const x = left ? arena.x : arena.x + w;
        warnZone(x, arena.y, w, arena.h, 0.65, 0.35, { kind: 'mttHalf', left, ownWarn: true });
      }, 0.2);
      every(run, 'bolt', 0.7, () => {
        spawn({ kind: 'mttBolt', x: rand(arena.x + 8, arena.x + arena.w - 8), y: arena.y - 30, vy: 150, r: 6, maxLife: 3, clip: false });
      }, 0.5);
    }
  },
  disco2: {
    name: 'Disco ball II', duration: 8, box: MTT_BOX,
    start(run) { MTT_ATTACKS.disco.start(run); },
    update(run, dt) {
      mttStyle(run, dt);
      every(run, 'box', 1.5, () => mttBlock(rand(arena.x + 12, arena.x + arena.w - 12), arena.y - 12, 65), 0.6);
    }
  }
};

Object.assign(MettatonEx, {
  box: MTT_BOX,

  chooseAttack(battle) {
    const f = battle.flags;
    const order = ['legs', 'minis', 'bombs', 'disco', 'heart', 'column', 'legsShoot', 'rewind', 'cascade', 'disco2', 'finale'];
    let id = order[battle.turn % order.length];
    if (id === 'heart' && f.armsOff) id = 'minis';
    if (id === 'legsShoot' && f.legsOff) id = 'legs';
    return MTT_ATTACKS[id];
  },

  // the ratings graph in the corner, like the show's
  drawHud(battle) {
    const f = battle.flags;
    f.history = f.history || [];
    if (!f.historyAt || state.clock - f.historyAt > 0.4) {
      f.historyAt = state.clock;
      f.history.push(f.ratings);
      if (f.history.length > 40) f.history.shift();
    }
    const g = { x: 14, y: 26, w: 92, h: 46 };
    ctx.save();
    ctx.font = TINY_FONT;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`RATINGS ${f.ratings}`, g.x, g.y - 6);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x, g.y + g.h);
    ctx.lineTo(g.x + g.w, g.y + g.h);
    ctx.stroke();
    ctx.strokeStyle = '#3bd16f';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y + 4);
    ctx.lineTo(g.x + g.w, g.y + 4);
    ctx.stroke();
    ctx.strokeStyle = '#c04cff';
    ctx.beginPath();
    f.history.forEach((r, i) => {
      const px = g.x + (i / 39) * g.w;
      const py = g.y + g.h - (r / MTT_GOAL) * (g.h - 4) + Math.sin(i * 2.7) * 2;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.stroke();
    ctx.restore();
  },

  drawArenaOverlay() {
    const run = state.battle && state.battle.attack;
    if (!run || !run.data || !run.data.mode) return;
    const name = run.data.mode === 'rew' ? 'mett_rew' : 'mett_rec';
    if (run.data.mode === 'rec' && Math.floor(state.clock * 2) % 2) return;
    drawArt(name, arena.x + arena.w - 20, arena.y + arena.h - 10, 36, null, { frame: state.clock * 4 });
  }
});

// ---------------------------------------------------------------- drawing
BULLET_DRAWERS.mttBomb = b => {
  if (b.lit && Math.floor(b.life * 16) % 2) {
    ctx.fillStyle = '#ffffff';
    fillCircle(b.x, b.y, b.r + 1);
    return;
  }
  if (drawArt('mett_bomb', b.x, b.y, 20, null, { frame: state.clock * 6 })) return;
  ctx.fillStyle = '#333';
  fillCircle(b.x, b.y, b.r);
  ctx.fillStyle = '#ff4040';
  ctx.font = TINY_FONT;
  ctx.textAlign = 'center';
  ctx.fillText('+', b.x, b.y + 4);
};

BULLET_DRAWERS.mttBlock = b => {
  if (drawArt('mett_box', b.x, b.y, b.hw * 2.2, b.hh * 2.2)) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(b.x - b.hw + 1, b.y - b.hh + 1, b.hw * 2 - 2, b.hh * 2 - 2);
};

BULLET_DRAWERS.mttBlast = b => {
  const k = Math.max(0, 1 - Math.max(0, b.life - b.activeFor) / 0.15);
  ctx.globalAlpha *= k;
  const name = b.horizontal ? 'mett_blast_h' : 'mett_blast_v';
  const info = ATTACK_ART[name];
  const frame = state.clock * 24;
  if (info && attackImage(name)) {
    // tile the blast sprite along its length
    const step = 18;
    if (b.horizontal) for (let x = b.x - b.hw; x < b.x + b.hw; x += step) drawArt(name, x + step / 2, b.y, step, b.hh * 2.4, { frame });
    else for (let y = b.y - b.hh; y < b.y + b.hh; y += step) drawArt(name, b.x, y + step / 2, b.hw * 2.4, step, { frame });
    return;
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.mttLegBullet = b => {
  const name = b.side === 'left' ? 'mett_leg_l' : 'mett_leg_r';
  if (drawArt(name, b.x, b.y, b.hw * 2, 15, { tint: MTT_LEG_TINT })) return;
  ctx.fillStyle = MTT_LEG_TINT;
  ctx.fillRect(b.x - b.hw, b.y - 3, b.hw * 2, 6);
};

BULLET_DRAWERS.mttParasol = b => {
  if (drawArt('mett_parasol', b.x, b.y, 44, null, { frame: state.clock * 8 })) return;
  ctx.fillStyle = '#ccc';
  ctx.fillRect(b.x - 8, b.y - 8, 16, 16);
};

BULLET_DRAWERS.mttHeart = b => {
  if (drawArt('mett_heart', b.x, b.y, 16, null, { frame: b.flash ? 1 : 0 })) return;
  ctx.fillStyle = '#fff';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.mttDisco = b => {
  if (drawArt('mett_discoball', b.x, b.y - 18, 28, null)) return;
  ctx.fillStyle = '#ddd';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.mttRay = (b, fill) => {
  const charging = b.life < b.warn;
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  ctx.globalAlpha *= charging ? 0.35 : 1;
  ctx.fillStyle = b.color === 'cyan' ? '#14a9ff' : b.color === 'orange' ? '#ffa040' : '#ffffff';
  ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
};

BULLET_DRAWERS.mttCore = b => {
  ctx.globalAlpha *= 0.6 + 0.4 * Math.sin(state.clock * 10);
  if (drawArt('mett_heart', b.x, b.y, 22, null, { frame: b.flash ? 1 : 0 })) return;
  ctx.fillStyle = '#ff4d6b';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.mttBolt = b => {
  if (drawArt('mett_lightning', b.x, b.y, 18, null, { angle: b.harmless ? b.angle || 0 : 0 })) return;
  ctx.fillStyle = '#fff';
  fillCircle(b.x, b.y, b.r);
};

BULLET_DRAWERS.mttHalf = b => {
  const x = b.x - b.hw;
  const y = b.y - b.hh;
  if (b.life < b.warn) {
    // a yellow frame with a big "!"
    const on = Math.floor(b.life * 10) % 2 === 0;
    ctx.strokeStyle = on ? '#ffe14d' : '#a08c20';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, b.hw * 2 - 4, b.hh * 2 - 4);
    ctx.fillStyle = on ? '#ffe14d' : '#a08c20';
    ctx.font = TEXT_FONT;
    ctx.textAlign = 'center';
    ctx.fillText('!', b.x, b.y + 8);
    return;
  }
  // legs stab in from the wall, filling that half
  const fromLeft = b.left;
  const name = fromLeft ? 'mett_leg_l' : 'mett_leg_r';
  for (let yy = y + 6; yy < y + b.hh * 2; yy += 12) {
    const tip = fromLeft ? x + b.hw * 2 : x;
    const len = 162;
    const cx = fromLeft ? tip - len / 2 : tip + len / 2;
    if (!drawArt(name, cx, yy, len, 18, { tint: '#ffffff' })) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, yy - 3, b.hw * 2, 6);
    }
  }
};

BULLET_DRAWERS.mttLegBody = b => {
  ctx.fillStyle = b.flash ? '#fff' : '#d0d0d0';
  ctx.fillRect(b.x - 6, b.y - b.hh, 12, b.hh * 2 - 10);
  ctx.fillStyle = '#ff6be2';
  fillRoundRect(b.x - 10, b.y + b.hh - 14, 20, 14, 4);
};

MettatonEx.attacks = Object.values(MTT_ATTACKS);
MettatonEx.attacks.forEach(a => { a.soul = 'yellow'; a.soulOptions = { facing: 'up', bigShot: false }; });
