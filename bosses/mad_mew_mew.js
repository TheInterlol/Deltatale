// Mad Mew Mew - Undertale (Switch version), optional.
// Reference: the SOUL splits in two halves, each stuck on three positions (here: A/D moves the
// red half, ←/→ the blue half). Attacks scroll down from the top; half-coloured circles only let
// the matching half through. She fires cat-faced bullets from her wand at the middle; later
// the board becomes a plus sign with five spots and attacks come from the sides and the top.
// Getting hit doesn't hurt her (it just knocks her head off). After a while she gives up on
// fighting: Talk to her, show her there's another way - then spare her, or attack.

const MadMewMew = registerBoss({
  id: 'mad_mew_mew',
  name: 'Mad Mew Mew',
  game: 'undertale',
  utBackground: 'grid',
  color: '#ff7ab8',
  emblem: 'heart',

  player: { name: 'FRISK', lv: 1, maxHp: 20, power: 46 },
  items: ['faceSteak', 'snowmanPiece', 'glamburger', 'cinnaBun'],
  maxHp: 700,
  attack: 8,
  defense: 0,
  checkAttack: 45,
  checkDefense: 0,
  gold: 0,
  box: { w: 240, h: 170 },
  fixedSpeed: true,
  noHpDefeat: true,
  cannotBeFought: true,
  check: 'A ghost who\'s angry at the doll she\'s possessing.',
  intro: '* Mad Mew Mew bursts out of the doll!',
  flavor: ['* Mad Mew Mew is struggling with her body.', '* Mad Mew Mew is hissing.', '* The doll\'s stitches are coming loose.'],

  setup(battle) {
    battle.flags.calm = false;
    battle.flags.talked = false;
    battle.flags.untouched = true;
  },

  acts: [
    {
      name: 'Talk',
      description: 'Talk to her.',
      use(battle) {
        const f = battle.flags;
        if (!f.calm) return '* You try to talk, but Mad Mew Mew is too angry to listen.';
        f.talked = true;
        battle.mercy = 100;
        return '* You tell her anger might not be the answer.\n* "...Then show me what LOVE is."';
      }
    }
  ],

  onFight(battle) {
    if (!battle.flags.talked) {
      addBurst(bossPosition(this).x, bossPosition(this).y - 20, '#ff7ab8', 10, 100);
      battle.flags.headOff = true;
      return 'miss';
    }
    battle.bossHp = 1;
    return undefined;
  },

  onDamaged(battle) {
    // after the talk, attacking destroys the doll's body
    if (battle.flags.talked && battle.bossHp <= 0) winBattle(battle, 'defeated');
  },

  getFlavor(battle) {
    const f = battle.flags;
    if (f.headOff) {
      f.headOff = false;
      return '* Your attack knocked her head off!\n* ...She put it back on. That didn\'t hurt her at all.';
    }
    if (f.calm && !f.talked) return '* Mad Mew Mew stopped attacking.\n* Maybe you can TALK now.';
    return null;
  },

  onPlayerHurt(battle) {
    battle.flags.untouched = false;
  },

  getDialogue(battle, attack) {
    if (attack.line) return attack.line;
    return pick(['This body isn\'t even cute!', 'Mew mew! MEW MEW!', 'I\'ll fuse with this doll if it\'s the last thing I do!', 'Hold STILL!']);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (battle.turn >= 6) f.calm = true;
    if (f.calm) return MMM_ATTACKS.rest;
    // never getting hit makes her go all out
    if (battle.turn >= 3 && f.untouched) return MMM_ATTACKS.freak;
    return [MMM_ATTACKS.scroll, MMM_ATTACKS.wand, MMM_ATTACKS.halves, MMM_ATTACKS.wand, MMM_ATTACKS.plus, MMM_ATTACKS.plus][battle.turn];
  },

  victoryText(battle, outcome) {
    if (outcome === 'spared') return '* Mad Mew Mew calmed down.\n* "Thanks... I think I made a friend."\n* YOU WON!';
    return '* The doll\'s body fell apart.\n* "I\'ll get you for this!" Mad Mew Mew flew away.\n* YOU WON!';
  },

  attacks: []
});

// One falling row: a block for each half's three slots, with one free slot per half.
function mmmRow(speed, colored = false) {
  for (let half = 0; half < 2; half++) {
    const free = randInt(0, 2);
    for (let slot = 0; slot < 3; slot++) {
      if (slot === free) continue;
      const pos = halfPosition(half, slot);
      spawn({ kind: 'normal', x: pos.x, y: arena.y - 10, vy: speed, hw: 10, hh: 8, maxLife: 4, minLife: 1, color: '#ff7ab8' });
    }
  }
  if (colored) {
    // a half-coloured circle: only the matching half of the SOUL may pass
    const color = chance(0.5) ? 'red' : 'blue';
    const half = randInt(0, 1);
    const pos = halfPosition(half, randInt(0, 2));
    spawn({ kind: 'halfCircle', x: pos.x, y: arena.y - 30, vy: speed, r: 11, passColor: color, maxLife: 4, minLife: 1 });
  }
}

const MMM_ATTACKS = {
  scroll: {
    name: 'Falling blocks', duration: 6, soul: 'split',
    update(run) {
      every(run, 'row', 0.9, () => mmmRow(120), 0.2);
    }
  },
  halves: {
    name: 'Half circles', duration: 6.5, soul: 'split',
    update(run) {
      every(run, 'row', 0.8, () => mmmRow(140, true), 0.2);
    }
  },
  wand: {
    name: 'Cat bullets', duration: 6, soul: 'split',
    update(run) {
      every(run, 'shot', 0.9, () => {
        // three cat-faced bullets aimed at the middle of the board
        const c = arenaCenter();
        for (const off of [-0.25, 0, 0.25]) {
          const x = c.x;
          const y = arena.y - 20;
          const a = Math.atan2(arena.y + arena.h - 16 - y, 0) + off;
          spawn({ kind: 'catBullet', x, y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 7, maxLife: 3, minLife: 0.5 });
        }
      }, 0.3);
    }
  },
  plus: {
    name: 'Plus board', duration: 6.5, soul: 'plus',
    box: { w: 210, h: 170 },
    update(run) {
      every(run, 'shot', 0.75, () => {
        // attacks come along the rows and columns of the plus
        const c = arenaCenter();
        const along = pick([-1, 0, 1]);
        if (chance(0.5)) {
          const y = c.y + along * arena.h * 0.33;
          const left = chance(0.5);
          spawn({ kind: 'catBullet', x: left ? arena.x - 10 : arena.x + arena.w + 10, y, vx: left ? 200 : -200, r: 8, maxLife: 3, minLife: 1 });
        } else {
          const x = c.x + along * arena.w * 0.33;
          spawn({ kind: 'catBullet', x, y: arena.y - 10, vy: 200, r: 8, maxLife: 3, minLife: 1 });
        }
      }, 0.3);
    }
  },
  freak: {
    name: 'Faster, harder', duration: 6, soul: 'split',
    line: 'You FREAK! Why won\'t anything hit you!?',
    update(run) {
      every(run, 'row', 0.5, () => mmmRow(190, true), 0.2);
    }
  },
  rest: {
    name: 'Exhausted', duration: 1, quiet: true,
    line: '...This isn\'t working, is it.',
    update() {}
  }
};

BULLET_DRAWERS.halfCircle = b => {
  ctx.fillStyle = '#777';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, Math.PI / 2, Math.PI * 1.5);
  ctx.fill();
  ctx.fillStyle = b.passColor === 'red' ? SOUL_COLORS.red : SOUL_COLORS.blue;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
};

BULLET_DRAWERS.catBullet = b => {
  ctx.fillStyle = '#ff7ab8';
  fillCircle(b.x, b.y, b.r);
  ctx.beginPath();
  ctx.moveTo(b.x - b.r, b.y - 2);
  ctx.lineTo(b.x - b.r + 3, b.y - b.r - 4);
  ctx.lineTo(b.x - 2, b.y - b.r + 2);
  ctx.moveTo(b.x + b.r, b.y - 2);
  ctx.lineTo(b.x + b.r - 3, b.y - b.r - 4);
  ctx.lineTo(b.x + 2, b.y - b.r + 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  fillCircle(b.x - 3, b.y - 1, 1.2);
  fillCircle(b.x + 3, b.y - 1, 1.2);
};

MadMewMew.attacks = ['scroll', 'halves', 'wand', 'plus', 'freak'].map(id => MMM_ATTACKS[id]);
