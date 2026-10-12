// Turn-based fight, in the style of the boss' game:
//   Undertale: FIGHT / ACT / ITEM / MERCY, the player is the SOUL (FRISK).
//   Deltarune: FIGHT / ACT / ITEM / SPARE / DEFEND, Susie fights, TP from grazing.
// Each turn: command -> result text -> boss speech bubble -> attack (dodging in the board) -> menu.
// The fight ends when the boss is defeated, spared, survived (boss-specific), or at GAME OVER.

const COMMAND_SETS = {
  undertale: [
    { id: 'fight', label: 'FIGHT' },
    { id: 'act', label: 'ACT' },
    { id: 'item', label: 'ITEM' },
    { id: 'mercy', label: 'MERCY' }
  ],
  deltarune: [
    { id: 'fight', label: 'FIGHT' },
    { id: 'act', label: 'ACT' },
    { id: 'item', label: 'ITEM' },
    { id: 'spare', label: 'SPARE' },
    { id: 'defend', label: 'DEFEND' }
  ]
};

const FIGHT_BAR_TIME = 1.4;      // seconds for the cursor to cross the whole target
const PERFECT_ACCURACY = 0.93;   // accuracy from which a hit counts as perfect
const RUDE_BUSTER_COST = 50;     // TP cost of Susie's spell
const DEFEND_TP = 16;
const BOX_SETTLE_TIME = 0.3;     // the box needs this long to shrink before an attack
const TEXT_PADDING = 24;
const LIST_COLUMNS = 2;

// Hint under the canvas for each phase of the fight.
const PHASE_HINTS = {
  menu: 'Choose a command with ← →, confirm with Z / Enter.',
  actList: 'Choose with the arrows, Z / Enter confirms, X goes back.',
  itemList: 'Choose with the arrows, Z / Enter confirms, X goes back.',
  mercyList: 'Choose with the arrows, Z / Enter confirms, X goes back.',
  fight: 'Press Z when the cursor is in the middle of the target!',
  result: 'Z / Enter to continue.',
  enemyTalk: 'Z / Enter to continue.',
  attack: 'Dodge!',
  victory: 'You won! Z = boss select, X = fight again.',
  gameover: 'Z / Enter = try again, X = boss select.'
};

const SOUL_HINTS = {
  red: 'Dodge with the arrow keys!',
  blue: 'Your SOUL is BLUE: press ↑ to jump (hold for higher).',
  green: 'Your SOUL is GREEN: face the spears with the arrow keys to block them.',
  yellow: 'Your SOUL is YELLOW: move and shoot with Z.',
  purple: 'Your SOUL is PURPLE: ← → to move, ↑ ↓ to jump between strings.'
};

// Bosses can replace the menu (Asriel's STRUGGLE / SAVE) or break a button (Asgore's MERCY).
// A command may have `disabled: 'reason'` or its own `run(battle)`.
function getCommands(battle) {
  if (battle.boss.getCommands) return battle.boss.getCommands(battle);
  const base = COMMAND_SETS[battle.boss.game] || COMMAND_SETS.deltarune;
  if (battle.boss.noMercy) {
    return base.map(c => (c.id === 'mercy' || c.id === 'spare') ? { ...c, disabled: 'MERCY was destroyed.' } : c);
  }
  return base;
}

function createBattle(boss) {
  return {
    boss,
    phase: 'menu',
    phaseTime: 0,
    turn: 0,                 // number of enemy attacks so far
    bossHp: boss.maxHp,
    mercy: 0,
    tp: 0,
    defending: false,
    nextAttackSpeed: 1,      // ACTs can slow down the next attack
    attackMult: 1,           // ACTs can weaken the next attack
    command: 0,
    listIndex: 0,
    actUses: {},
    spareCount: 0,
    flags: {},               // boss-specific state
    inventory: createInventory(boss),
    typer: null,             // text in the box
    bubble: null,            // the boss' speech bubble
    fight: null,             // FIGHT bar state
    attack: null,            // running enemy attack
    nextAttack: null,        // attack chosen for this turn (picked before the speech bubble)
    outcome: null,           // 'defeated' | 'spared' | 'survived'
    bossHurt: 0,             // how long the boss keeps shaking after a hit
    bossAlpha: 1
  };
}

function startBattle() {
  const battle = createBattle(state.currentBoss);
  state.battle = battle;
  if (battle.boss.setup) battle.boss.setup(battle);
  enterMenu(battle, battle.boss.intro);
}

function setPhase(battle, phase) {
  battle.phase = phase;
  battle.phaseTime = 0;
  if (PHASE_HINTS[phase]) setHint(PHASE_HINTS[phase]);
}

function setBattleText(battle, text) {
  battle.typer = createTyper(text, TEXT_BOX.w - TEXT_PADDING * 2);
}

function isSpareable(battle) {
  return battle.mercy >= 100;
}

function getBattleBoxTarget(battle) {
  return battle.phase === 'enemyTalk' || battle.phase === 'attack' ? arena : TEXT_BOX;
}

const MENU_PHASES = ['menu', 'actList', 'itemList', 'mercyList'];

function updateBattle(dt) {
  const battle = state.battle;
  battle.phaseTime += dt;
  battle.bossHurt = Math.max(0, battle.bossHurt - dt);

  if (battle.typer) updateTyper(battle.typer, dt);
  if (battle.bubble) updateTyper(battle.bubble, dt);
  if (battle.boss.karma) updateKarma(dt);

  if (battle.outcome === 'defeated') battle.bossAlpha = Math.max(0, battle.bossAlpha - dt * 0.8);
  if (battle.outcome === 'spared') battle.bossAlpha = Math.max(0.35, battle.bossAlpha - dt * 1.5);
  if (battle.outcome === 'survived') battle.bossAlpha = Math.max(0, battle.bossAlpha - dt * 1.2);

  // some bosses keep attacking while you pick a command (Sans' second half)
  if (battle.boss.updateMenuHazards && MENU_PHASES.includes(battle.phase)) battle.boss.updateMenuHazards(battle, dt);

  switch (battle.phase) {
    case 'menu': updateMenu(battle); break;
    case 'actList': updateList(battle, getActOptions(battle), chooseAct); break;
    case 'itemList': updateList(battle, getItemOptions(battle), chooseItem); break;
    case 'mercyList': updateList(battle, getMercyOptions(battle), chooseMercy); break;
    case 'fight': updateFight(battle, dt); break;
    case 'fightResult': if (battle.phaseTime >= 1.1) afterPlayerAction(battle); break;
    case 'result': updateTextPhase(battle, battle.typer, () => afterPlayerAction(battle)); break;
    case 'enemyTalk': updateEnemyTalk(battle); break;
    case 'attack': updateAttack(battle, dt); break;
    case 'victory': updateVictory(battle); break;
    case 'gameover': updateGameOver(battle); break;
  }
}

// Z finishes the text that is still typing, the next Z continues.
function updateTextPhase(battle, typer, onDone) {
  if (!confirmPressed()) return;
  if (!typerDone(typer)) {
    finishTyper(typer);
    return;
  }
  onDone();
}

// -------------- Command menu --------
function enterMenu(battle, text = pickFlavor(battle)) {
  setPhase(battle, 'menu');
  setBattleText(battle, text);
}

function pickFlavor(battle) {
  const boss = battle.boss;
  if (boss.getFlavor) {
    const custom = boss.getFlavor(battle);
    if (custom) return custom;
  }
  if (isSpareable(battle)) return `* ${boss.name} doesn't want to fight anymore.`;
  if (boss.lowHpFlavor && battle.bossHp <= boss.maxHp * 0.3) return boss.lowHpFlavor;
  return boss.flavor[battle.turn % boss.flavor.length];
}

function updateMenu(battle) {
  const commands = getCommands(battle);
  const { dx } = directionPressed();
  if (dx) {
    battle.command = (battle.command + dx + commands.length) % commands.length;
    sfx.move();
  }
  if (!confirmPressed()) return;

  battle.command = Math.min(battle.command, commands.length - 1);
  const chosen = commands[battle.command];
  const command = chosen.id;
  if (chosen.disabled) {
    sfx.cancel();
    setHint(chosen.disabled);
    return;
  }
  if (chosen.run) {
    sfx.select();
    chosen.run(battle);
    return;
  }
  if (command === 'item' && !hasItems(battle.inventory)) {
    sfx.cancel();
    setHint('You have no items left.');
    return;
  }

  sfx.select();
  battle.listIndex = 0;

  if (command === 'fight') startFight(battle);
  if (command === 'act') setPhase(battle, 'actList');
  if (command === 'item') setPhase(battle, 'itemList');
  if (command === 'mercy') setPhase(battle, 'mercyList');
  if (command === 'spare') trySpare(battle);
  if (command === 'defend') defend(battle);
}

// Two-column list (ACT, ITEM, MERCY).
function updateList(battle, options, choose) {
  const { dx, dy } = directionPressed();
  const column = battle.listIndex % LIST_COLUMNS;
  let next = battle.listIndex + dy * LIST_COLUMNS;
  if (dx > 0 && column < LIST_COLUMNS - 1) next += 1;
  if (dx < 0 && column > 0) next -= 1;

  if (next !== battle.listIndex && next >= 0 && next < options.length) {
    battle.listIndex = next;
    sfx.move();
  }

  if (cancelPressed()) {
    sfx.cancel();
    setPhase(battle, 'menu');
    return;
  }
  if (!confirmPressed()) return;

  const option = options[battle.listIndex];
  if (!option || option.disabled) {
    sfx.cancel();
    return;
  }
  sfx.select();
  choose(battle, option);
}

function showResult(battle, text) {
  // an ACT or item may have ended the fight already (e.g. claiming the last house)
  if (battle.outcome || battle.phase === 'gameover') return;
  setBattleText(battle, text);
  setPhase(battle, 'result');
}

function afterPlayerAction(battle) {
  if (battle.outcome) return;
  // some bosses use their HP bar for something else and don't lose at 0 (Mad Dummy)
  if (battle.bossHp <= 0 && !battle.boss.noHpDefeat) {
    winBattle(battle, 'defeated');
    return;
  }
  startEnemyTalk(battle);
}

// -------------- FIGHT --------
function startFight(battle) {
  battle.fight = { pos: 0, stoppedAt: null, perfect: false, missed: false };
  setPhase(battle, 'fight');
}

function updateFight(battle, dt) {
  const fight = battle.fight;
  fight.pos += dt / FIGHT_BAR_TIME;

  if (confirmPressed()) resolveFight(battle, Math.min(fight.pos, 1));
  else if (fight.pos >= 1) resolveFight(battle, null);
}

function resolveFight(battle, pos) {
  const fight = battle.fight;
  const boss = battle.boss;
  const at = bossPosition(boss);
  fight.stoppedAt = pos;
  setPhase(battle, 'fightResult');

  if (pos === null) {
    fight.missed = true;
    addPopup('MISS', at.x, at.y - 10, '#bbbbbb');
    sfx.cancel();
    if (boss.onMiss) boss.onMiss(battle);
    return;
  }

  // 1 = dead centre of the target, 0 = the very edge
  const accuracy = 1 - Math.min(1, Math.abs(pos - 0.5) * 2);
  fight.perfect = accuracy >= PERFECT_ACCURACY;

  sfx.slash();
  effects.susieLunge = SUSIE_LUNGE_TIME;
  addSlash(at.x, at.y);

  // Some bosses dodge (Sans) or react in their own way.
  if (boss.onFight && boss.onFight(battle, accuracy) === 'miss') {
    fight.missed = true;
    addPopup('MISS', at.x, at.y - 10, '#bbbbbb');
    return;
  }

  const power = playerStats(boss).power;
  const damage = dealDamage(battle, power * (0.25 + 0.75 * accuracy) * (fight.perfect ? 1.4 : 1));
  if (boss.onDamaged) boss.onDamaged(battle, damage);
}

function dealDamage(battle, raw) {
  const variance = 0.9 + Math.random() * 0.2;
  const damage = Math.max(1, Math.round(raw * variance - battle.boss.defense));
  const at = bossPosition(battle.boss);
  battle.bossHp = Math.max(0, battle.bossHp - damage);
  battle.bossHurt = 0.5;
  addPopup(damage, at.x, at.y - 10, battle.boss.game === 'undertale' ? '#ff3030' : '#ff4fd8');
  sfx.damage();
  return damage;
}

// -------------- ACT --------
function getActOptions(battle) {
  const boss = battle.boss;
  const options = [{ name: 'Check', kind: 'check', description: 'Learn more about the enemy.' }];

  for (const act of boss.acts) {
    if (act.hidden && act.hidden(battle)) continue;
    const tpShort = act.tp && battle.tp < act.tp;
    options.push({
      name: act.name,
      kind: 'act',
      act,
      note: act.tp ? `${act.tp}% TP` : undefined,
      disabled: Boolean(tpShort),
      description: tpShort ? 'Not enough TP.' : act.description || ''
    });
  }

  if (boss.game === 'deltarune' && !boss.noRudeBuster) {
    const enoughTp = battle.tp >= RUDE_BUSTER_COST;
    options.push({
      name: 'Rude Buster',
      kind: 'buster',
      note: `${RUDE_BUSTER_COST}% TP`,
      disabled: !enoughTp,
      description: enoughTp ? 'Susie\'s devastating spell.' : 'Not enough TP. Graze bullets or DEFEND.'
    });
  }

  return options;
}

function checkText(battle) {
  const boss = battle.boss;
  return `* ${boss.name.toUpperCase()} - AT ${boss.checkAttack ?? boss.attack} DF ${boss.checkDefense ?? boss.defense}\n* ${boss.check}`;
}

function chooseAct(battle, option) {
  const boss = battle.boss;

  if (option.kind === 'check') {
    showResult(battle, checkText(battle));
    return;
  }

  if (option.kind === 'buster') {
    rudeBuster(battle);
    return;
  }

  const act = option.act;
  const uses = battle.actUses[act.name] || 0;
  battle.actUses[act.name] = uses + 1;
  if (act.tp) battle.tp -= act.tp;

  if (act.use) {
    showResult(battle, act.use(battle, uses));
    return;
  }

  const repeated = uses > 0;
  addMercy(battle, repeated && act.repeatMercy !== undefined ? act.repeatMercy : act.mercy || 0);
  if (act.effect) act.effect(battle);
  showResult(battle, repeated && act.repeatText ? act.repeatText : act.text);
}

function addMercy(battle, amount) {
  if (!amount || isSpareable(battle)) return;
  battle.mercy = Math.max(0, Math.min(100, battle.mercy + amount));
  const at = bossPosition(battle.boss);
  if (amount > 0) {
    addPopup(`+${amount}%`, at.x, at.y - 30, '#ffe14d');
    sfx.mercy();
  }
}

function rudeBuster(battle) {
  battle.tp -= RUDE_BUSTER_COST;
  const at = bossPosition(battle.boss);
  sfx.buster();
  effects.susieLunge = SUSIE_LUNGE_TIME;
  addShake(4);
  addSlash(at.x, at.y);
  const power = playerStats(battle.boss).power;
  const damage = dealDamage(battle, power * 2.4);
  if (battle.boss.onDamaged) battle.boss.onDamaged(battle, damage);
  showResult(battle, `* Susie cast RUDE BUSTER!\n* ${damage} damage!`);
}

// -------------- ITEM --------
function getItemOptions(battle) {
  return battle.inventory
    .filter(stack => stack.count > 0)
    .map(stack => {
      const item = ITEMS[stack.id];
      return {
        name: item.name,
        note: stack.count > 1 ? `×${stack.count}` : '',
        stack,
        description: item.heal === Infinity ? 'Heals all HP.' : `Heals ${item.heal} HP.`
      };
    });
}

function chooseItem(battle, option) {
  const result = useItem(option.stack, state.player);
  const pos = partyPopupPos();
  if (result.healed > 0) addPopup(`+${result.healed}`, pos.x, pos.y, '#7dff7d');
  sfx.heal();
  let text = result.text;
  if (battle.boss.onItem) text = battle.boss.onItem(battle, option.stack.id, text) || text;
  showResult(battle, text);
}

// -------------- MERCY (Undertale) / SPARE and DEFEND (Deltarune) --------
function getMercyOptions(battle) {
  const options = [{ name: 'Spare', kind: 'spare', spareable: isSpareable(battle) }];
  if (battle.boss.canFlee || battle.boss.onFlee) options.push({ name: 'Flee', kind: 'flee' });
  return options;
}

function chooseMercy(battle, option) {
  if (option.kind === 'spare') trySpare(battle);
  else tryFlee(battle);
}

function trySpare(battle) {
  battle.spareCount += 1;
  if (battle.boss.onSpare && battle.boss.onSpare(battle)) return;
  if (isSpareable(battle)) {
    winBattle(battle, 'spared');
    return;
  }
  const who = battle.boss.game === 'undertale' ? 'You' : 'Susie';
  showResult(battle, `* ${who} tried to spare ${battle.boss.name}...\n* But its name wasn't YELLOW.`);
}

function tryFlee(battle) {
  if (battle.boss.onFlee && battle.boss.onFlee(battle)) return;
  showResult(battle, '* You tried to flee...\n* ...but you couldn\'t escape!');
}

function defend(battle) {
  battle.defending = true;
  battle.tp = Math.min(100, battle.tp + DEFEND_TP);
  showResult(battle, '* Susie is defending.\n* The next attack only does half damage. TP charged.');
}

// -------------- Enemy turn --------
function chooseNextAttack(battle) {
  const boss = battle.boss;
  if (boss.chooseAttack) return boss.chooseAttack(battle);
  return boss.attacks[battle.turn % boss.attacks.length];
}

function startEnemyTalk(battle) {
  const boss = battle.boss;
  const attack = chooseNextAttack(battle);
  battle.nextAttack = attack;

  let line = attack.dialogue !== undefined ? attack.dialogue : null;
  if (line === null && boss.getDialogue) line = boss.getDialogue(battle, attack);
  else if (line === null && boss.dialogue.length) line = boss.dialogue[battle.turn % boss.dialogue.length];
  if (typeof line === 'function') line = line(battle);

  battle.bubble = line ? createTyper(line, bubbleRect(battle).w - 24, BUBBLE_FONT) : null;

  // the board takes the attack's size while the boss talks
  const box = attackBox(attack, boss);
  setArena(box.w, box.h, box.offsetX || 0);
  const p = state.player;
  p.x = arena.x + arena.w / 2;
  p.y = arena.y + arena.h / 2;
  p.hurtCooldown = 0;
  state.bullets = [];
  state.shots = [];

  setPhase(battle, 'enemyTalk');
}

function updateEnemyTalk(battle) {
  if (battle.phaseTime < BOX_SETTLE_TIME) return;
  if (!battle.bubble) {
    startAttack(battle);
    return;
  }
  updateTextPhase(battle, battle.bubble, () => startAttack(battle));
}

function attackBox(attack, boss) {
  if (attack.box) return typeof attack.box === 'function' ? attack.box() : attack.box;
  if (boss.box) return boss.box;
  return { w: ARENA_DEFAULT.w, h: ARENA_DEFAULT.h };
}

function startAttack(battle) {
  const attack = battle.nextAttack || chooseNextAttack(battle);
  const boss = battle.boss;
  // each loop through the attack list is faster, and faster still when the boss is low on HP
  const level = Math.floor(battle.turn / Math.max(1, boss.attacks.length));
  const lowHp = battle.bossHp <= boss.maxHp * 0.3;
  const speed = boss.fixedSpeed ? battle.nextAttackSpeed
    : (1 + 0.12 * Math.min(level, 3) + (lowHp ? 0.1 : 0)) * battle.nextAttackSpeed;

  battle.nextAttackSpeed = 1;
  battle.bubble = null;
  battle.attack = beginAttackRun(attack, { level, speed, battle });
  setPhase(battle, 'attack');
  setHint(SOUL_HINTS[state.player.mode] || PHASE_HINTS.attack);
}

function updateAttack(battle, dt) {
  const run = battle.attack;
  stepAttackRun(run, dt);

  // the SOUL may have run out of HP - then we are in the gameover phase already
  if (battle.phase !== 'attack') return;
  if (attackRunFinished(run)) endAttack(battle);
}

function endAttack(battle) {
  if (battle.attack) finishAttackRun(battle.attack);
  battle.attack = null;
  battle.nextAttack = null;
  battle.defending = false;
  battle.attackMult = 1;
  battle.turn += 1;
  if (battle.boss.onTurnEnd) battle.boss.onTurnEnd(battle);
  if (battle.outcome || ['victory', 'result', 'gameover'].includes(battle.phase)) return;
  enterMenu(battle);
}

// -------------- Attack runs (shared by battle and survival) --------
function beginAttackRun(attack, { level = 0, speed = 1, battle = null } = {}) {
  const boss = state.currentBoss;
  const box = attackBox(attack, boss);
  setArena(box.w, box.h, box.offsetX || 0);
  state.bullets = [];
  state.shots = [];

  const p = state.player;
  p.x = arena.x + arena.w / 2;
  p.y = arena.y + arena.h / 2;
  setSoulMode(attack.soul || 'red', attack.soulOptions || {});

  const run = {
    attack,
    pattern: attack,
    t: 0,
    dt: 0,
    timers: {},
    data: {},
    level,
    speed,
    battle,
    done: false,
    delay: battle ? 0 : 0.35
  };
  if (attack.start) attack.start(run);
  return run;
}

function stepAttackRun(run, dt) {
  run.dt = dt;
  if (run.delay > 0) {
    run.delay -= dt;
    updateSoul(dt);
    return;
  }
  run.t += dt;
  updateSoul(dt);
  run.attack.update(run, dt);
  updateBullets(dt);
  updateShots(dt);
}

function attackRunFinished(run) {
  return run.done || (run.attack.duration !== undefined && run.t >= run.attack.duration);
}

function finishAttackRun(run) {
  if (run.attack.end) run.attack.end(run);
  state.bullets = [];
  state.shots = [];
  state.player.hurtCooldown = 0;
}

// -------------- End of the fight --------
function winBattle(battle, outcome, customText) {
  const boss = battle.boss;
  const turns = battle.turn + 1;

  battle.outcome = outcome;
  state.running = false;
  state.bullets = [];
  state.shots = [];
  stopMusic();
  state.record = recordBattleResult(boss.id, outcome === 'spared' ? 'spared' : 'defeated', turns);

  let text = customText || (boss.victoryText && boss.victoryText(battle, outcome));
  if (!text) {
    const headline = outcome === 'spared' ? '* YOU WON! The enemy was spared.' : '* YOU WON!';
    text = boss.game === 'undertale'
      ? `${headline}\n* You earned 0 EXP and ${boss.gold || 0} gold.`
      : `${headline}\n* Got 0 EXP and ${boss.gold || 0} D$.`;
    text += `\n* The fight took ${plural(turns, 'turn')}.`;
  }
  setBattleText(battle, text);

  if (outcome === 'spared') sfx.spare();
  else sfx.victory();

  setPhase(battle, 'victory');
  setHint(`You won! Fastest win: ${plural(state.record.bestTurns, 'turn')}. Z = boss select, X = fight again.`);
  updateUi();
}

function updateVictory(battle) {
  if (cancelPressed() && battle.phaseTime > 0.4) {
    startGame();
    return;
  }
  updateTextPhase(battle, battle.typer, () => openBossSelect(nextPlayableBoss(battle.boss.id)));
}

// Called by endGame() when the SOUL runs out of HP during an attack.
function loseBattle() {
  const battle = state.battle;
  state.bullets = [];
  state.shots = [];
  battle.attack = null;
  battle.bubble = null;
  sfx.gameOver();
  setPhase(battle, 'gameover');
}

function updateGameOver(battle) {
  if (battle.phaseTime < 0.8) return;
  if (confirmPressed()) startGame();
  else if (cancelPressed()) openBossSelect();
}
