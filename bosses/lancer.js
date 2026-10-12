// Lancer - Deltarune Chapter 1, first fight (Castle Town).
// Reference: Lancer rides his bike along the side of the board, honks, pops a wheelie and
// charges across; or charges along the bottom, comes back from above and throws spades at the
// SOUL. He can't be spared - after the fourth turn his bike "runs out of fuel" and he leaves.
// Warning makes him dodge Susie's next attack; Compliment lowers his attack, then raises it,
// then confuses him.

const Lancer = registerBoss({
  id: 'lancer',
  name: 'Lancer',
  game: 'deltarune',
  color: '#7fa6ff',
  emblem: 'spade',

  player: { name: 'SUSIE', maxHp: 110, power: 46 },
  maxHp: 540,
  attack: 14,
  defense: 0,
  checkAttack: 7,
  checkDefense: 0,
  gold: 30,
  box: { w: 240, h: 170 },
  fixedSpeed: true,
  check: 'He\'s the Bad Guy. ...Or is he?',
  intro: '* Lancer rode in on his bike! Ho ho ho!',
  flavor: [
    '* Lancer is revving his bike.',
    '* Lancer is doing a little dance.',
    '* Smells like freshly squeezed bad guy.',
    '* Lancer\'s bike sputters.'
  ],

  setup(battle) {
    battle.flags.compliments = 0;
    battle.flags.warned = false;
  },

  acts: [
    {
      name: 'Warning',
      description: 'Warn him about Susie\'s attack.',
      use(battle) {
        battle.flags.warned = true;
        return '* Susie told Lancer she was about to hit him really hard.\n* "Thanks for the warning!" Lancer will dodge.';
      }
    },
    {
      name: 'Compliment',
      description: 'Say something nice about him.',
      use(battle) {
        battle.flags.compliments += 1;
        const c = battle.flags.compliments;
        if (c === 1) {
          battle.flags.attackMod = 0.7;
          return '* Susie said Lancer\'s bike was cool.\n* Lancer blushed! His ATTACK dropped!';
        }
        if (c === 2) {
          battle.flags.attackMod = 1.2;
          return '* Susie said Lancer was cool too.\n* Lancer got pumped up! His ATTACK went up!';
        }
        battle.flags.attackMod = 1;
        return '* Susie complimented Lancer again.\n* Lancer is too confused to count his damage.';
      }
    }
  ],

  onFight(battle) {
    if (battle.flags.warned) {
      battle.flags.warned = false;
      return 'miss';
    }
    return undefined;
  },

  getDialogue(battle, attack) {
    return attack.line || pick(['Ho ho ho! I\'m the Bad Guy!', 'Prepare for my wheelie of doom!', 'Hey! Watch this!', 'Honk honk!']);
  },

  chooseAttack(battle) {
    battle.attackMult = battle.flags.attackMod || 1;
    return this.attacks[battle.turn % this.attacks.length];
  },

  onTurnEnd(battle) {
    if (battle.turn >= 4 && !battle.outcome) {
      winBattle(battle, 'survived', '* "Uh oh... my bike is running out of fuel!"\n* "Farewell, Lightners! Ho ho ho!"\n* Lancer drove away. YOU WON! Got 30 D$.');
    }
  },

  attacks: [
    {
      name: 'Wheelie charge',
      duration: 6,
      start(run) {
        run.data.events = [];
        for (let i = 0; i < 3; i++) {
          run.data.events.push([0.2 + i * 1.8, () => lancerCharge()]);
        }
      },
      update(run) {
        timeline(run, run.data.events);
      }
    },
    {
      name: 'Bike and spades',
      duration: 6.5,
      start(run) {
        run.data.events = [
          [0.2, () => lancerRide(arena.y + arena.h - 14, -1, 280)],
          [1.6, () => lancerRide(arena.y + 14, 1, 220, true)],
          [3.6, () => lancerRide(arena.y + arena.h - 14, -1, 300)],
          [4.8, () => lancerRide(arena.y + 14, 1, 240, true)]
        ];
      },
      update(run) {
        timeline(run, run.data.events);
      }
    }
  ]
});

// The bike rolls in on the right at the SOUL's height, honks, wheelies and charges left.
function lancerCharge() {
  const y = Math.max(arena.y + 16, Math.min(arena.y + arena.h - 16, state.player.y));
  sfx.warn();
  spawn({
    kind: 'bike', x: arena.x + arena.w + 40, y, hw: 18, hh: 12, noCull: true, maxLife: 3, clip: false, warn: 0.2,
    update(b, dt) {
      const t = b.life;
      if (t < 0.5) b.x += (arena.x + arena.w - 24 - b.x) * Math.min(1, dt * 8);
      else if (t < 0.9) b.wheelie = Math.min(0.5, (t - 0.5) * 2);
      else {
        b.wheelie = 0;
        b.x -= 420 * dt;
      }
    }
  });
}

// The bike crosses the board along the top or bottom; from above it also throws spades.
function lancerRide(y, dir, speed, throwsSpades = false) {
  spawn({
    kind: 'bike', x: dir < 0 ? arena.x + arena.w + 30 : arena.x - 30, y, vx: dir * speed, hw: 18, hh: 12,
    noCull: true, maxLife: 3, clip: false, flip: dir > 0,
    update(b, dt) {
      b.x += b.vx * dt;
      if (throwsSpades) {
        b.timer = (b.timer || 0) + dt;
        if (b.timer > 0.28) {
          b.timer = 0;
          const v = aimAt(b.x, b.y, 170);
          spawn({ kind: 'suit', suit: 'spade', x: b.x, y: b.y + 10, vx: v.vx, vy: v.vy, r: 6, color: '#b9a6ff', maxLife: 3, faceVelocity: true });
        }
      }
    }
  });
}

BULLET_DRAWERS.bike = b => {
  // a generic little motorbike
  ctx.translate(b.x, b.y);
  if (b.flip) ctx.scale(-1, 1);
  ctx.rotate(b.wheelie || 0);
  ctx.globalAlpha *= b.life < (b.warn || 0) ? 0.5 : 1;
  ctx.fillStyle = '#3d4b8f';
  fillRoundRect(-16, -8, 32, 10, 4);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(-18, -12, 6, 6);
  ctx.fillStyle = '#222';
  fillCircle(-11, 6, 6);
  fillCircle(11, 6, 6);
  ctx.fillStyle = '#ccc';
  fillCircle(-11, 6, 2);
  fillCircle(11, 6, 2);
};
