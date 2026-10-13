// Napstablook - Undertale, Ruins (miniboss).
// Reference: a shy ghost that cries. Its attacks are tears falling from above; when you cheer
// it up, it tries to show you something cool - its tears form a top hat ("dapper blook") -
// and then it leaves. FIGHT works too, but it isn't really in the mood to fight.

const Napstablook = registerBoss({
  id: 'napstablook',
  name: 'Napstablook',
  game: 'undertale',
  color: '#cfd8ff',
  emblem: 'tear',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 30 },
  items: ['monsterCandy', 'monsterCandy', 'cinnaBun'],
  maxHp: 88,
  attack: 2,
  defense: 0,
  checkAttack: 10,
  checkDefense: 10,
  gold: 0,
  box: { w: 164, h: 136 },
  fixedSpeed: true,
  check: 'This monster doesn\'t seem to have a sense of humor...',
  intro: '* Here comes Napstablook.',
  flavor: [
    '* Napstablook looks like it\'s about to fall asleep.',
    '* Napstablook is pretending to sleep.',
    '* Napstablook is wishing it wasn\'t here.',
    '* Napstablook is staring into the distance.'
  ],

  setup(battle) {
    battle.flags.cheer = 0;
  },

  acts: [
    {
      name: 'Cheer',
      description: 'Try to make it feel better.',
      use(battle) {
        battle.flags.cheer += 1;
        const c = battle.flags.cheer;
        if (c === 1) return '* You gave Napstablook a patient smile.\n* "heh..."';
        if (c === 2) return '* You told Napstablook a little joke.\n* "heh heh..."';
        return '* You cheered for Napstablook.\n* "let me try..."';
      }
    },
    {
      name: 'Flirt',
      description: 'Say something nice.',
      use() {
        return '* You tried to flirt with Napstablook.\n* "heh... i\'d just weigh you down..."';
      }
    },
    {
      name: 'Threat',
      description: 'Be mean.',
      use(battle) {
        battle.flags.cheer = Math.max(0, battle.flags.cheer - 1);
        return '* You threatened Napstablook.\n* "go ahead and do it..."';
      }
    }
  ],

  getDialogue(battle) {
    const c = battle.flags.cheer;
    if (c >= 3) return 'let me try...';
    if (c === 2) return 'heh heh...';
    if (c === 1) return 'heh...';
    return pick(['i\'m fine, thanks...', 'just pluggin\' along...', 'oh... sorry...', 'i\'m not really feeling up to it right now...']);
  },

  chooseAttack(battle) {
    return battle.flags.cheer >= 3 ? NAPSTA_ATTACKS.dapper : pick([NAPSTA_ATTACKS.tears, NAPSTA_ATTACKS.tears2]);
  },

  onTurnEnd(battle) {
    if (battle.flags.cheer >= 3 && !battle.outcome) {
      winBattle(battle, 'spared', '* Napstablook showed you its "dapper blook"...\n* "oh... i should probably go..."\n* YOU WON! You earned 0 EXP and 0 gold.');
    }
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Napstablook faded away...\n* "i\'m a ghost... i was just lowering my HP so you\'d feel better..."';
    return null;
  },

  attacks: []
});

function napstaTear(x, y, vx, vy, options = {}) {
  return spawn({ kind: 'tear', x, y, vx, vy, r: 5, maxLife: 6, ...options });
}

const NAPSTA_ATTACKS = {
  tears: {
    name: 'Tears',
    duration: 5.5,
    update(run) {
      // two eyes' worth of tears falling from above in loose streams
      every(run, 'tear', 0.16, () => {
        const side = run.data.left = !run.data.left;
        const base = arena.x + arena.w * (side ? 0.35 : 0.65) + Math.sin(run.t * 2.3 + (side ? 0 : 2)) * arena.w * 0.3;
        napstaTear(base, arena.y - 8, rand(-15, 15), rand(85, 115));
      }, 0.2);
    }
  },
  tears2: {
    name: 'Sad tears',
    duration: 6,
    update(run) {
      // tears that slow down halfway and then drip faster
      every(run, 'tear', 0.22, () => {
        napstaTear(rand(arena.x + 10, arena.x + arena.w - 10), arena.y - 8, 0, 140, {
          update(b, dt) {
            const slow = b.y > arena.y + arena.h * 0.35 && b.life < 1.4;
            b.y += (slow ? 35 : 150) * dt;
          }
        });
      }, 0.2);
    }
  },
  dapper: {
    name: 'Dapper blook',
    quiet: true,
    duration: 3.5,
    start() {
      // harmless tears gather into a top hat above the board
      const c = arenaCenter();
      const shape = [];
      for (let x = -40; x <= 40; x += 8) shape.push([x, 10]);
      for (let y = -36; y <= 2; y += 8) {
        shape.push([-24, y]);
        shape.push([24, y]);
      }
      for (let x = -24; x <= 24; x += 8) shape.push([x, -40]);
      shape.forEach(([dx, dy], i) => {
        napstaTear(c.x + dx, arena.y - 30, 0, 0, {
          harmless: true, noCull: true,
          update(b) {
            const k = Math.min(1, b.life / 1.2);
            b.x = c.x + dx;
            b.y = arena.y - 30 + (c.y + dy - (arena.y - 30)) * k;
          }
        });
      });
    },
    update() {}
  }
};

BULLET_DRAWERS.tear = (b, fill) => {
  ctx.fillStyle = b.harmless ? '#9aa8ff' : '#e6ecff';
  ctx.beginPath();
  ctx.moveTo(b.x, b.y - b.r * 1.6);
  ctx.quadraticCurveTo(b.x + b.r, b.y, b.x, b.y + b.r);
  ctx.quadraticCurveTo(b.x - b.r, b.y, b.x, b.y - b.r * 1.6);
  ctx.fill();
};

Napstablook.attacks = [NAPSTA_ATTACKS.tears, NAPSTA_ATTACKS.tears2, NAPSTA_ATTACKS.dapper];
