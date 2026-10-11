// TORIEL (Undertale, Ruins)
// Fire magic: fireballs raining from the top of the board, hands sweeping streams of fire across
// it, and rings of fire closing in on the SOUL. She never wants to kill you: when your HP is very
// low her fire swerves away from the SOUL. Sparing her repeatedly (12 times) makes her give up.
// Her DEF collapses at low HP, so a FIGHT run ends abruptly.
const TORIEL_SPARE_LINES = [
  '...',
  '...',
  '...?',
  'What are you doing?',
  'Attack or run away!',
  'What are you proving this way?',
  'Fight me or leave!',
  'Stop it.',
  'Stop looking at me that way.',
  'Go away!',
  '...',
  '...'
];

const TORIEL_GIVE_UP = [
  'I know you want to go home, but...',
  'But please... go upstairs now.',
  'I promise I will take good care of you here.',
  '...',
  'Ha ha...',
  'Pathetic, is it not? I cannot save even a single child.',
  'No, I understand.',
  'You would just be unhappy trapped down here.',
  'My expectations... My loneliness... My fear...',
  'For you, my child... I will put them aside.'
];

// Fireball that drifts with a gentle wobble; it swerves around the SOUL when Toriel is holding back.
function torielFire(run, x, y, vx, vy, props = {}) {
  return spawn(Object.assign({
    kind: 'fire', shape: 'circle', r: 5, x, y, vx, vy,
    wobble: Math.random() * Math.PI * 2,
    update(b, dt) {
      if (b.wobbleAmp) b.x += Math.sin(b.life * 5 + b.wobble) * b.wobbleAmp * dt;
      if (!run.data.mercy) return;
      // holding back: steer away from the SOUL
      const dx = b.x - soul.x;
      const dy = b.y - soul.y;
      const d = Math.hypot(dx, dy);
      if (d < 46) {
        b.x += (dx >= 0 ? 1 : -1) * 260 * dt;
        b.y += (dy / (d || 1)) * 60 * dt;
      }
      if (run.data.harmless) b.harmless = true;
    }
  }, props));
}

function torielHand(side, run) {
  return spawn({
    kind: 'hand', shape: 'none', noClip: true, margin: 9999, side,
    x: side === 'left' ? board.target.x - 26 : board.target.x + board.target.w + 26,
    y: board.target.y + 20,
    maxLife: 99,
    draw(b) {
      ctx.translate(b.x, b.y);
      if (b.side === 'right') ctx.scale(-1, 1);
      ctx.fillStyle = '#ffffff';
      fillRoundRect(-20, -12, 30, 24, 10);
      for (let i = 0; i < 3; i++) fillRoundRect(6, -11 + i * 8, 14, 6, 3);
      ctx.fillStyle = '#7d4cbb';
      ctx.fillRect(-34, -10, 16, 20);
    }
  });
}

registerBoss({
  id: 'toriel',
  name: 'Toriel',
  game: 'undertale',
  party: 'ut-lv1',
  items: [['monsterCandy', 3], ['spiderDonut', 1]],
  hp: 440,
  def: 0,
  damage: 4,
  gold: 0,
  exp: 150,
  voice: 0.85,
  souls: ['red'],
  description: 'The caretaker of the Ruins. Her fire never truly aims to kill: spare her again and again until she lets you go - or fight, if you must.',
  intro: '* Toriel blocks the way!',
  check: '* TORIEL - ATK 80 DEF 80\n* Knows best for you.',
  flavor: [
    '* Toriel prepares a magical attack.',
    '* Toriel takes a deep breath.',
    '* Toriel is acting aloof.',
    '* Toriel looks through you.'
  ],
  acts: [
    { name: 'Talk', run: () => '* You couldn\'t think of any conversation topics.' }
  ],

  setup(battle) {
    battle.data.spares = 0;
  },

  nextAttack(battle) {
    const hp = battle.party[0].hp;
    if (battle.data.spares >= 11 || hp <= 3) return 'fireRain';
    const order = ['fireRain', 'handSweep', 'fireRing', 'fireRain', 'fireRing', 'handSweep'];
    return order[battle.turn % order.length];
  },

  dialogue(battle) {
    const spares = battle.data.spares;
    if (!battle.data.sparedThisTurn) return null;
    return TORIEL_SPARE_LINES[Math.min(spares, TORIEL_SPARE_LINES.length) - 1];
  },

  onSpare(battle) {
    battle.data.spares += 1;
    battle.data.sparedThisTurn = true;
    if (battle.data.spares >= 12) {
      insertSteps(battle, [
        { type: 'bubble', lines: TORIEL_GIVE_UP },
        { type: 'call', fn: () => winBattle(battle, 'spared', ['* Toriel lets you pass.']) }
      ]);
      return null;
    }
    return null;
  },

  onTurnEnd(battle) {
    battle.data.sparedThisTurn = false;
  },

  onFight(battle, damage) {
    // her DEF collapses once she is badly hurt
    if (battle.enemy.hp < 150) return damage * 4;
    return damage;
  },

  onEnemyDefeated() {
    return [
      '* Toriel: "Ugh... You are stronger than I thought..."',
      '* Toriel: "Listen to me, small one... Do not let ASGORE take your soul."',
      '* Toriel: "Be good, won\'t you? ...My child."'
    ];
  },

  attacks: {
    // Fireballs falling from the top of the board in loose columns.
    fireRain: {
      box: { w: 200, h: 140 },
      duration: 5.5,
      start(run) {
        const battle = run.battle;
        run.data.mercy = battle.party[0].hp <= 3 || battle.data.spares >= 11;
        run.data.harmless = battle.data.spares >= 11;
      },
      update(run) {
        const t = board.target;
        run.every('drop', 0.11, () => {
          const x = t.x + 14 + Math.random() * (t.w - 28);
          const f = torielFire(run, x, t.y - 10, 0, 105 + Math.random() * 45);
          f.wobbleAmp = 26;
        }, 0.2);
      }
    },

    // A hand on each side sweeps up and down, throwing fire across the board.
    handSweep: {
      box: { w: 210, h: 140 },
      duration: 6,
      start(run) {
        run.data.mercy = run.battle.party[0].hp <= 3;
        run.data.left = torielHand('left', run);
        run.data.right = torielHand('right', run);
      },
      update(run) {
        const t = board.target;
        const top = t.y + 16;
        const bottom = t.y + t.h - 16;
        const phase = (run.t * 0.9) % 2;
        const k = phase < 1 ? phase : 2 - phase;
        run.data.left.y = top + (bottom - top) * k;
        run.data.right.y = bottom - (bottom - top) * k;
        run.every('left', 0.2, () => torielFire(run, run.data.left.x + 18, run.data.left.y, 140, 0), 0.3);
        run.every('right', 0.2, () => torielFire(run, run.data.right.x - 18, run.data.right.y, -140, 0), 0.4);
      }
    },

    // Rings of fireballs appear around the SOUL, hang for a moment and close in. One gap each time.
    fireRing: {
      box: { w: 160, h: 140 },
      duration: 5.2,
      start(run) {
        run.data.mercy = run.battle.party[0].hp <= 3;
      },
      update(run) {
        run.every('ring', 1.25, () => {
          const cx = soul.x;
          const cy = soul.y;
          const count = 10;
          const gap = Math.floor(Math.random() * count);
          for (let i = 0; i < count; i++) {
            if (i === gap) continue;
            const a = (Math.PI * 2 * i) / count + run.t;
            const f = torielFire(run, cx + Math.cos(a) * 88, cy + Math.sin(a) * 88, 0, 0, {
              harmless: true, alpha: 0.4, minLife: 99, maxLife: 2.4, cx, cy, a
            });
            const baseUpdate = f.update;
            f.update = (b, dt) => {
              if (b.life < 0.45) return;
              if (!b.launched) {
                b.launched = true;
                b.harmless = false;
                b.alpha = 1;
                b.vx = -Math.cos(b.a) * 95;
                b.vy = -Math.sin(b.a) * 95;
              }
              baseUpdate(b, dt);
            };
          }
        }, 0.2);
      }
    }
  },

  draw(x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.6) * 1.5);
    // robe
    ctx.fillStyle = '#7d4cbb';
    fillPoly([-36, -30, 36, -30, 58, 100, -58, 100]);
    // sleeves + paws
    fillPoly([-36, -28, -58, 34, -40, 40, -24, -4]);
    fillPoly([36, -28, 58, 34, 40, 40, 24, -4]);
    ctx.fillStyle = '#fff';
    fillRoundRect(-60, 32, 20, 16, 7);
    fillRoundRect(40, 32, 20, 16, 7);
    // white collar
    fillPoly([-24, -30, 24, -30, 0, -8]);
    // Delta Rune emblem
    ctx.save();
    ctx.translate(0, 26);
    fillCircle(0, -6, 7);
    fillPoly([-6, -8, -24, -14, -10, 0]);
    fillPoly([6, -8, 24, -14, 10, 0]);
    fillPoly([-14, 6, -8, 6, -11, 14]);
    fillPoly([-3, 6, 3, 6, 0, 14]);
    fillPoly([8, 6, 14, 6, 11, 14]);
    ctx.restore();
    // ears
    ctx.fillStyle = '#f2f2f2';
    fillEllipse(-36, -64, 9, 24, 1.2);
    fillEllipse(36, -64, 9, 24, -1.2);
    // horns
    ctx.fillStyle = '#e8dcc0';
    fillPoly([-14, -96, -20, -110, -8, -98]);
    fillPoly([14, -96, 20, -110, 8, -98]);
    // head + snout
    ctx.fillStyle = '#ffffff';
    fillRoundRect(-26, -98, 52, 50, 18);
    fillRoundRect(-16, -62, 32, 26, 12);
    // eyes, nose, mouth
    ctx.fillStyle = '#8a1b1b';
    fillEllipse(-12, -74, 3, 4);
    fillEllipse(12, -74, 3, 4);
    ctx.fillStyle = '#c8a0a0';
    fillEllipse(0, -56, 5, 3);
    ctx.strokeStyle = '#9a7a7a';
    ctx.lineWidth = 1.5;
    line(-6, -45, 6, -45);
    ctx.restore();
  }
});
