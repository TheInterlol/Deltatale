// Rouxls Kaard - Deltarune Chapter 2 (Acid Tunnel).
// Reference: a house-claiming board game against Rouxls. ACT "Take House" claims houses
// (Take House 2/3 claim more for TP), "Distract" makes him claim one fewer next turn (not two
// turns in a row). He claims houses after every attack. When the board is full, whoever owns
// more wins. He always has a box attack (falling boxes squash the board), plus attacks from
// the Thrash Machine parts: snaking lasers, falling rockets, a boomerang sword, flame sprays,
// stars on every step, or a slow duck.

const ROUXLS_HOUSES = 25;

const RouxlsKaard = registerBoss({
  id: 'rouxls_kaard',
  name: 'Rouxls Kaard',
  game: 'deltarune',
  color: '#5e8cff',
  emblem: 'house',

  player: { name: 'SUSIE', maxHp: 190, power: 55 },
  maxHp: 900,
  attack: 20,
  defense: 0,
  checkAttack: 12,
  checkDefense: 0,
  gold: 0,
  box: { w: 140, h: 140 },
  fixedSpeed: true,
  check: 'The Duke of Puzzles. Thinketh he is very clever.',
  intro: '* Rouxls Kaard challenges thee to a game of HOUSES!',
  gameOverText: 'Rouxls won the house game...',
  flavor: [
    '* Rouxls is twirling his mustache.',
    '* Rouxls is admiring his own houses.',
    '* Smells like worms.',
    '* The Thrash Machine creaks.'
  ],

  setup(battle) {
    battle.flags.mine = 0;
    battle.flags.his = 0;
    battle.flags.distracted = false;
    battle.flags.lastDistract = -5;
    battle.flags.parts = [pick(['laser', 'sword', 'flame']), pick(['rockets', 'stars', 'duck'])];
  },

  statusText(battle) {
    const f = battle.flags;
    return `HOUSES  you ${f.mine} · ${f.his} Rouxls · ${ROUXLS_HOUSES - f.mine - f.his} free`;
  },

  acts: [
    { name: 'Take House', description: 'Claim one house.', use: b => rouxlsTake(b, 1) },
    { name: 'TakeHouse2', tp: 14, description: 'Claim two houses.', use: b => rouxlsTake(b, 2) },
    { name: 'TakeHouse3', tp: 24, description: 'Claim three houses.', use: b => rouxlsTake(b, 3) },
    {
      name: 'Distract',
      description: 'He places one fewer house next turn.',
      use(battle) {
        if (battle.turn - battle.flags.lastDistract <= 1) return '* Susie tried to distract Rouxls again...\n* "Thou thinkest I am a fool twice!?"';
        battle.flags.lastDistract = battle.turn;
        battle.flags.distracted = true;
        return '* Susie pointed behind Rouxls and yelled "WORMS!"\n* Rouxls is distracted!';
      }
    }
  ],

  getDialogue(battle, attack) {
    return attack.line || pick([
      'Behold, mine Thrash Machine!',
      'Thou shalt never outbuild me!',
      'Prepareth to be housed!',
      'Mine strategy is flawlesse!'
    ]);
  },

  chooseAttack(battle) {
    const parts = battle.flags.parts;
    const list = ['boxes', parts[0], parts[1]];
    return ROUXLS_ATTACKS[list[battle.turn % list.length]];
  },

  onTurnEnd(battle) {
    const f = battle.flags;
    const free = ROUXLS_HOUSES - f.mine - f.his;
    const take = Math.min(free, f.distracted ? 1 : 2);
    f.his += take;
    f.distracted = false;
    rouxlsCheckEnd(battle);
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Rouxls Kaard fell over!\n* "Mine... houses..."\n* YOU WON!';
    return null;
  },

  attacks: []
});

function rouxlsTake(battle, count) {
  const f = battle.flags;
  const free = ROUXLS_HOUSES - f.mine - f.his;
  const got = Math.min(free, count);
  f.mine += got;
  battle.mercy = Math.round((f.mine / ROUXLS_HOUSES) * 100);
  rouxlsCheckEnd(battle);
  return `* Susie claimed ${got === 1 ? 'a house' : `${got} houses`}!\n* (You: ${f.mine} · Rouxls: ${f.his})`;
}

// Board full: more houses wins.
function rouxlsCheckEnd(battle) {
  const f = battle.flags;
  if (f.mine + f.his < ROUXLS_HOUSES || battle.outcome) return false;
  if (f.mine > f.his) {
    winBattle(battle, 'spared', `* The board is full! You ${f.mine} - ${f.his} Rouxls.\n* "Impossible! Mine strategy!"\n* YOU WON the house game!`);
  } else {
    state.player.hp = 0;
    endGame();
  }
  return true;
}

const ROUXLS_ATTACKS = {
  boxes: {
    name: 'Boxes', duration: 6.5,
    update(run, dt) {
      every(run, 'box', 0.5, () => {
        spawn({ kind: 'mttBlock', x: rand(arena.x + 14, arena.x + arena.w - 14), y: arena.y - 14, vy: 150, hw: 12, hh: 12, maxLife: 3 });
      }, 0.2);
      // the falling boxes squash the board down
      if (arena.h > 110) setArena(arena.w, arena.h - 8 * dt);
    }
  },
  laser: {
    name: 'Snaking lasers', duration: 6.5,
    update(run) {
      every(run, 'laser', 1.4, () => {
        const y0 = rand(arena.y + 20, arena.y + arena.h - 20);
        for (let i = 0; i < 14; i++) {
          spawn({
            kind: 'normal', x: arena.x + arena.w + 10 + i * 12, y: y0, vx: -170, r: 5, color: '#ff5050', noCull: true, maxLife: 4,
            update(b, dt) {
              b.x += b.vx * dt;
              b.y = y0 + Math.sin(b.x * 0.05) * 30;
            }
          });
        }
      }, 0.2);
    }
  },
  rockets: {
    name: 'Rockets', duration: 6,
    update(run) {
      every(run, 'rocket', 0.45, () => {
        const x = rand(arena.x + 10, arena.x + arena.w - 10);
        spawn({ kind: 'rocket', x, y: arena.y - 10, vx: 0, vy: 160, r: 6, lock: 0, maxLife: 3 });
      }, 0.2);
    }
  },
  sword: {
    name: 'Boomerang sword', duration: 6.5,
    update(run) {
      every(run, 'sword', 1.3, () => {
        const y = state.player.y;
        const speed = 320;
        const reach = arena.w * 0.85;
        spawn({ kind: 'scythe', x: arena.x + arena.w + 20, y, vx: -speed, ax: (speed * speed) / (2 * reach), r: 11, noCull: true, maxLife: 4, spin: 10 });
      }, 0.2);
    }
  },
  flame: {
    name: 'Flame spray', duration: 6,
    update(run) {
      every(run, 'flame', 0.1, () => {
        const a = Math.PI + Math.sin(run.t * 1.5) * 0.6;
        const x = arena.x + arena.w + 10;
        const y = arena.y + arena.h / 2;
        spawn({ kind: 'fire', x, y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 6, maxLife: 3, minLife: 0.5 });
      }, 0.3);
    }
  },
  stars: {
    name: 'Stars on every step', duration: 6,
    update(run) {
      every(run, 'step', 0.8, () => {
        const x = arena.x + arena.w + 10;
        const y = rand(arena.y + 20, arena.y + arena.h - 20);
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i - 2) * 0.3;
          spawn({ kind: 'star', x, y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 5, maxLife: 3, minLife: 0.5, color: '#ffe14d' });
        }
      }, 0.2);
    }
  },
  duck: {
    name: 'A duck', duration: 6,
    start() {
      spawn({ kind: 'duck', x: arena.x + arena.w + 20, y: arena.y + arena.h / 2, vx: -45, hw: 15, hh: 9, damage: 1, noCull: true, maxLife: 9, baseY: arena.y + arena.h / 2,
        update(b, dt) { b.x += b.vx * dt; b.y = b.baseY + Math.sin(b.life * 2) * 30; } });
    },
    update(run) {
      every(run, 'quack', 1.2, () => {
        spawn({ kind: 'normal', x: arena.x + arena.w + 10, y: rand(arena.y + 10, arena.y + arena.h - 10), vx: -150, r: 5, maxLife: 3, minLife: 0.5 });
      }, 0.6);
    }
  }
};

RouxlsKaard.attacks = Object.values(ROUXLS_ATTACKS);
