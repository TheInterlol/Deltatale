// Spamton - Deltarune Chapter 2 (Cyber City alley).
// Reference: Money Vacuum (he inhales dollar signs and drags the SOUL to the right), Minitons
// (little copies of him run along the top and bottom of the board and jump at the SOUL - the
// middle row is safe-ish), and Word Bullets (sales words that grow as they wave across the
// board). To spare him you have to play along with his DEAL without giving him any money:
// TELL ME MORE, DON'T GIVE, TAKE DEAL, DON'T BUY, REFUSE, and finally YES DEAL.

const SPAMTON_DEAL = ['TELL ME MORE', 'DON\'T GIVE', 'TAKE DEAL', 'DON\'T BUY', 'REFUSE', 'YES DEAL'];
const SPAMTON_WRONG = ['NO THANKS', 'GIVE MONEY', 'NO DEAL', 'BUY IT', 'ACCEPT', 'NO DEAL'];

const Spamton = registerBoss({
  id: 'spamton',
  name: 'Spamton',
  game: 'deltarune',
  color: '#ffe84d',
  emblem: 'dollar',

  player: { name: 'SUSIE', maxHp: 160, power: 52 },
  maxHp: 560,
  attack: 16,
  defense: 0,
  checkAttack: 8,
  checkDefense: 0,
  gold: 0,
  box: { w: 240, h: 160 },
  fixedSpeed: true,
  check: 'A salesman who wants to make you a [[Big Deal]].',
  intro: '* Spamton wants to make a DEAL!',
  flavor: [
    '* Spamton is laughing at nothing.',
    '* Spamton\'s phone is ringing. He doesn\'t pick up.',
    '* Smells like a [[Limited Time Offer]].',
    '* Spamton is counting invisible money.'
  ],

  setup(battle) {
    battle.flags.deal = 0;
    battle.flags.money = 100;
  },

  // the ACT list shows the next step of the deal and a wrong answer
  get acts() {
    const battle = state.battle;
    if (!battle || battle.boss !== Spamton) return [{ name: 'Deal', text: '* ...' }];
    const step = battle.flags.deal;
    if (step >= SPAMTON_DEAL.length) return [];
    const right = SPAMTON_DEAL[step];
    const wrong = SPAMTON_WRONG[step];
    const options = [
      { name: right, description: 'Hear him out.', use: b => spamtonDeal(b, true) },
      { name: wrong, description: 'Hmm...', use: b => spamtonDeal(b, false) }
    ];
    // the right answer isn't always first
    return step % 2 ? options.reverse() : options;
  },
  set acts(value) {},

  onSpare(battle) {
    if (battle.flags.deal >= SPAMTON_DEAL.length) {
      winBattle(battle, 'spared', '* Spamton is satisfied with your [[Hyperlink Blocked]].\n* "COME VISIT ME AT MY [[Shop]]!"\n* YOU WON!');
      return true;
    }
    return false;
  },

  victoryText(battle, outcome) {
    if (outcome === 'defeated') return '* Spamton crumpled up like a cheap flyer.\n* "YOU WILL REGRET THIS [[Purchase]]!"\n* YOU WON!';
    return null;
  },

  getDialogue(battle, attack) {
    return attack.line || pick([
      'HEY EVERY BUDDY! IT\'S ME, [[Number 1 Rated Salesman]]!',
      'DON\'T YOU WANT TO BE A [[Big Shot]]?',
      'ACT NOW! [[Supplies are limited]]!',
      'WHAT\'S WRONG, KID? [[Cat got your wallet]]?'
    ]);
  },

  chooseAttack(battle) {
    return this.attacks[battle.turn % this.attacks.length];
  },

  attacks: [
    {
      name: 'Money vacuum',
      duration: 6.5,
      update(run, dt) {
        // he inhales: the SOUL is dragged right, dollar signs fly at him
        const p = state.player;
        p.x = Math.min(arena.x + arena.w - p.r, p.x + 55 * dt);
        every(run, 'cash', 0.16, () => {
          spawn({ kind: 'dollar', x: arena.x - 10, y: rand(arena.y + 10, arena.y + arena.h - 10), vx: rand(170, 240), r: 7, minLife: 1, maxLife: 3 });
        }, 0.1);
      }
    },
    {
      name: 'Minitons',
      duration: 6.5,
      update(run) {
        every(run, 'mini', 0.6, () => {
          // little runners along the top or bottom that leap at the SOUL
          const top = chance(0.5);
          const fromLeft = chance(0.5);
          const y = top ? arena.y + 10 : arena.y + arena.h - 10;
          spawn({
            kind: 'neoHead', x: fromLeft ? arena.x - 10 : arena.x + arena.w + 10, y, vx: (fromLeft ? 1 : -1) * 120, r: 7, hw: 7, hh: 7, minLife: 1, maxLife: 4,
            update(b, dt) {
              b.x += b.vx * dt;
              if (!b.jumped && Math.abs(b.x - state.player.x) < 30) {
                b.jumped = true;
                b.vy = top ? 220 : -220;
              }
              if (b.vy) b.y += b.vy * dt;
            }
          });
        }, 0.2);
      }
    },
    {
      name: 'Word bullets',
      duration: 7,
      update(run) {
        every(run, 'word', 0.9, () => {
          const word = pick(['$VALUES$', 'BARGAIN$', 'DEAL$', 'KROMER', 'HYPERLINK', '[[CLICK]]']);
          const y0 = rand(arena.y + 25, arena.y + arena.h - 25);
          const fromLeft = chance(0.5);
          const mode = pick(['wave', 'up', 'down']);
          spawn({
            kind: 'word', word, x: fromLeft ? arena.x - 30 : arena.x + arena.w + 30, y: y0, vx: (fromLeft ? 1 : -1) * 110,
            hw: 6, hh: 7, noCull: true, maxLife: 4.5,
            update(b, dt) {
              b.x += b.vx * dt;
              if (mode === 'wave') b.y = y0 + Math.sin(b.life * 3) * 28;
              if (mode === 'up') b.y -= 18 * dt;
              if (mode === 'down') b.y += 18 * dt;
              // the word grows as it crosses the board
              b.hw = Math.min(word.length * 6, 6 + b.life * 26);
            }
          });
        }, 0.2);
      }
    }
  ]
});

function spamtonDeal(battle, right) {
  const step = battle.flags.deal;
  if (right) {
    battle.flags.deal += 1;
    addMercy(battle, step === SPAMTON_DEAL.length - 1 ? 100 : 16);
    const lines = [
      '* "THAT\'S THE SPIRIT! LET ME TELL YOU ABOUT [[Hyperlink Blocked]]!"',
      '* You didn\'t give him any money.\n* "SMART CUSTOMER! I LIKE YOU!"',
      '* "A DEAL!? YOU WON\'T REGRET IT!"',
      '* You didn\'t buy anything.\n* "HOLD ON, KID! THERE\'S MORE!"',
      '* You refused the [[Special Offer]].\n* "...HEH. YOU\'RE A TOUGH ONE."',
      '* "DEAL! IT\'S A DEAL!"\n* Spamton is ready to be SPARED.'
    ];
    return lines[step];
  }
  if ([1, 3, 4].includes(step) && battle.flags.money > 0) {
    battle.flags.money = Math.max(0, battle.flags.money - 25);
    return `* You fell for it and lost 25 D$!\n* "THANK YOU FOR YOUR [[Business]]!"`;
  }
  return '* "NO NO NO! THAT\'S NOT HOW A [[Deal]] WORKS!"';
}

BULLET_DRAWERS.dollar = b => {
  ctx.fillStyle = '#ffe84d';
  ctx.font = `bold 15px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('$', b.x, b.y + 5);
};

BULLET_DRAWERS.word = b => {
  const shown = Math.max(1, Math.round(b.word.length * Math.min(1, b.hw / (b.word.length * 6))));
  ctx.fillStyle = '#ffe84d';
  ctx.font = `bold 12px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText(b.word.slice(0, shown), b.x, b.y + 4);
};
