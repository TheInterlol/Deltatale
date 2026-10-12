// Boss registry. Every boss lives in its own file in bosses/ and calls registerBoss({...}).
//
// Boss definition (only id, name, game, maxHp and attacks are required):
//
//   id, name, shortName?   id matches js/roster.js; shortName fits on the placeholder card
//   game                   'undertale' | 'deltarune' - picks the battle UI and rules
//   color, emblem          placeholder card colour and icon (see js/bossart.js)
//   pos                    where the boss stands, default depends on the game
//   music                  Audio to play (else the music listed in assets/bosses/manifest.js)
//
//   player                 { name, lv, maxHp, power } stats of the player for this fight
//   items                  inventory, list of item ids from js/items.js
//   maxHp, attack, defense attack = damage per hit unless a bullet sets its own `damage`
//   iframes                invincibility after a hit (seconds)
//   karma                  true = hits add KR (Sans)
//
//   intro, check           opening text, ACT > Check description
//   flavor[]               menu texts, or getFlavor(battle)
//   dialogue[]             speech bubble before each attack, or getDialogue(battle, attack); null = no bubble
//   acts[]                 { name, description?, tp?, mercy?, repeatMercy?, text, repeatText?, effect?(battle), use?(battle) -> text }
//
//   attacks[]              { name, duration, box?: {w, h}, soul?: 'red'|'blue'|..., soulOptions?, dialogue?,
//                            start?(run), update(run, dt), end?(run) }
//                          run = { t, dt, timers, data, speed, level, battle } - see every()/timeline() in patterns.js
//                          an attack ends after `duration` seconds or when it sets run.done = true
//   chooseAttack(battle)   pick the next attack (phases); default: attacks in order, looping and speeding up
//
//   Hooks (all optional):
//   setup(battle)                      new fight started (reset boss-specific state in battle.flags)
//   onFight(battle) -> 'miss' | void   before FIGHT damage (Sans dodges)
//   onDamaged(battle, damage)          after FIGHT damage
//   onSpare(battle) -> true            take over SPARE completely
//   onFlee(battle) -> true             take over FLEE (Undertale MERCY menu)
//   onTurnEnd(battle)                  after each enemy attack
//   onLethal(battle) -> true           a hit would kill the player; return true to prevent it
//   onPlayerHurt(battle, damage)
//   victoryText(battle, outcome)       custom text after winning
//
//   Survival mode: init()/update(dt) for a hand-made endless pattern; without them the boss'
//   attacks are simply played back to back.

const BOSSES = {};

function registerBoss(boss) {
  boss.game = boss.game || 'deltarune';
  boss.acts = boss.acts || [];
  boss.flavor = boss.flavor || ['* ...'];
  boss.dialogue = boss.dialogue || [];
  boss.defense = boss.defense || 0;
  BOSSES[boss.id] = boss;
  return boss;
}

function getBoss(id) {
  return BOSSES[id] || null;
}

function bossPosition(boss) {
  if (boss.pos) return boss.pos;
  return boss.game === 'undertale' ? BOSS_POS_UT : BOSS_POS_DR;
}

function defaultPlayer(boss) {
  if (boss.game === 'undertale') return { name: 'FRISK', lv: 1, maxHp: 20, power: 46 };
  return { name: 'SUSIE', lv: 0, maxHp: 120, power: 46 };
}

function playerStats(boss) {
  return { ...defaultPlayer(boss), ...(boss.player || {}) };
}

// -------------- Drawing helpers for placeholders and bullets --------
function fillRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function fillCircle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
