// Undyne the Undying - Undertale, Genocide.
// Reference: a much harder Undyne. The green SOUL phase has faster spears and more of the
// yellow ones that swap sides; the red phase adds rings of spears that rotate while closing
// in and spears that fly straight at the SOUL and fade. She can't be spared or fled from.
// When her HP hits 0 she refuses to die: the SOUL goes green again for a few last turns with
// spears that get slower each time, and then she melts away.

const UndyneUndying = registerBoss({
  id: 'undyne_undying',
  name: 'Undyne the Undying',
  shortName: 'Undyne the Undying',
  game: 'undertale',
  color: '#3dffb0',
  emblem: 'spear',

  player: { name: 'CHARA', lv: 10, maxHp: 52, power: 170 },
  items: ['instantNoodles', 'faceSteak', 'legendaryHero', 'legendaryHero', 'snowmanPiece', 'snowmanPiece', 'glamburger'],
  maxHp: 2300,
  attack: 9,
  defense: 0,
  checkAttack: 99,
  checkDefense: 99,
  gold: 0,
  fixedSpeed: true,
  noHpDefeat: true,
  check: 'Heroine reformed by her desire to protect everything.',
  intro: '* Undyne the Undying attacks!',
  flavor: [
    '* Undyne\'s eye is burning.',
    '* Undyne is smiling as if nothing is wrong.',
    '* Undyne\'s body is starting to melt... but she won\'t stop.',
    '* The air crackles with determination.'
  ],

  setup(battle) {
    battle.flags.pace = 1.25;
    battle.flags.dying = 0;
  },

  acts: [],

  getFlavor(battle) {
    if (battle.flags.dying) return '* Undyne is melting.\n* ...But she refuses to give up.';
    return null;
  },

  getDialogue(battle, attack) {
    if (battle.flags.dying) return ['No... I won\'t die!', 'Everyone is counting on me!', 'Not... yet...'][battle.flags.dying - 1] || '...';
    if (attack.line) return attack.line;
    return pick([
      'You\'re gonna have to try harder than THAT!',
      'For Alphys! For Asgore! For everyone!',
      'I\'m not going to lose!',
      'NGAAAHHH!!!',
      'I won\'t let you hurt anyone else!'
    ]);
  },

  chooseAttack(battle) {
    const f = battle.flags;
    if (battle.bossHp <= 0 && !f.dying) f.dying = 1;
    if (f.dying) {
      // the last turns: green, each one slower
      f.pace = Math.max(0.55, 1.1 - f.dying * 0.2);
      return UNDYING_ATTACKS.lastStand;
    }
    f.pace = Math.min(1.9, 1.25 + battle.turn * 0.04);
    const order = ['green', 'green', 'rings', 'green', 'straight', 'green', 'pit', 'rings', 'green', 'straight'];
    return UNDYING_ATTACKS[order[battle.turn % order.length]];
  },

  onTurnEnd(battle) {
    const f = battle.flags;
    if (f.dying) {
      f.dying += 1;
      if (f.dying > 3 && !battle.outcome) {
        winBattle(battle, 'defeated', '* Undyne\'s body melted away...\n* "Alphys... Asgore... Papyrus..."\n* YOU WON.');
      }
    }
  },

  onFight(battle) {
    if (battle.flags.dying) return 'miss';
    return undefined;
  },

  attacks: []
});

const UNDYING_ATTACKS = {
  green: {
    name: 'Spears (green SOUL)',
    soul: 'green',
    box: { w: 84, h: 84 },
    start(run) {
      const pace = run.battle ? run.battle.flags.pace : 1.3 + run.level * 0.1;
      run.data.pace = pace;
      const count = 11 + Math.min(run.battle ? Math.floor(run.battle.turn / 2) : run.level * 2, 7);
      const list = [];
      let side = pick(SIDES);
      for (let i = 0; i < count; i++) {
        if (chance(0.75)) side = pick(SIDES.filter(s => s !== side));
        list.push([i === 0 ? 0.3 : rand(0.3, 0.48) / pace, side, chance(0.35) ? 1.7 : 1.15, chance(0.3)]);
      }
      run.data.script = list;
      run.data.next = 0;
      run.data.clock = 0;
    },
    update: UNDYNE_ATTACKS.green.update
  },
  lastStand: {
    name: 'Last stand',
    soul: 'green',
    box: { w: 84, h: 84 },
    start(run) {
      const pace = run.battle ? run.battle.flags.pace : 0.8;
      run.data.pace = pace;
      run.data.script = makeSpearScript(1, pace);
      run.data.next = 0;
      run.data.clock = 0;
    },
    update: UNDYNE_ATTACKS.green.update
  },
  rings: {
    name: 'Spear rings',
    duration: 7,
    // the huge board from the fight, reaching up over her legs
    box: { w: 560, h: 250 },
    update(run) {
      const pace = run.battle ? run.battle.flags.pace : 1.3;
      every(run, 'ring', 1.7 / pace, () => {
        // a ring of spears around the SOUL rotates while it closes in; one gap
        const c = { x: state.player.x, y: state.player.y };
        const count = 12;
        const gap = randInt(0, count - 1);
        const dir = chance(0.5) ? 1 : -1;
        for (let i = 0; i < count; i++) {
          if (i === gap || i === (gap + 1) % count) continue;
          const a0 = (Math.PI * 2 * i) / count;
          spawn({
            kind: 'spear', x: c.x, y: c.y, hw: 14, hh: 3, warn: 0.35, noCull: true, maxLife: 2.6, clip: false,
            update(b) {
              const r = 130 - Math.max(0, b.life - b.warn) * 85 * pace;
              const a = a0 + b.life * 0.8 * dir;
              b.x = c.x + Math.cos(a) * r;
              b.y = c.y + Math.sin(a) * r;
              b.angle = a + Math.PI;
              if (r < 0) b.dead = true;
            }
          });
        }
      }, 0.2);
    }
  },
  straight: {
    name: 'Spear barrage',
    duration: 7,
    box: { w: 184, h: 184 },
    update(run) {
      const pace = run.battle ? run.battle.flags.pace : 1.3;
      every(run, 'spear', 0.22 / pace, () => {
        const c = arenaCenter();
        const a = Math.random() * Math.PI * 2;
        const x = c.x + Math.cos(a) * 170;
        const y = c.y + Math.sin(a) * 140;
        const v = aimAt(x, y, 280 * pace);
        spawn({
          kind: 'spear', x, y, hw: 18, hh: 3, angle: v.angle, warn: 0.3, noCull: true, maxLife: 1.8, clip: false,
          update(b, dt) {
            if (b.life > b.warn) {
              b.x += v.vx * dt;
              b.y += v.vy * dt;
            }
            b.alpha = b.life > 1.3 ? Math.max(0, 1 - (b.life - 1.3) / 0.5) : 1;
          }
        });
      }, 0.2);
    }
  },
  pit: {
    name: 'Spears from below',
    duration: 6,
    box: { w: 80, h: 110 },
    update(run) {
      const pace = run.battle ? run.battle.flags.pace : 1.3;
      every(run, 'rise', 0.75 / pace, () => {
        const cols = 2;
        const w = arena.w / cols;
        const safe = randInt(0, cols - 1);
        for (let i = 0; i < cols; i++) {
          if (i === safe) continue;
          spawn({ kind: 'risingSpear', x: arena.x + i * w + w / 2, y: arena.y + arena.h / 2, hw: w / 2 - 3, hh: arena.h / 2, warn: 0.42 / pace, activeFor: 0.3, noCull: true });
        }
        sfx.warn();
      }, 0.3);
    }
  }
};

UndyneUndying.attacks = Object.values(UNDYING_ATTACKS);
