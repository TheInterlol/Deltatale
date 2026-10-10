// Tahová bitva ve stylu Deltarune:
// menu příkazů -> akce Susie -> replika bosse -> útok (uhýbání v aréně) -> znovu menu.
// Bitva končí poražením bosse (ÚTOK), ušetřením (MILOST 100 % + UŠETŘIT), nebo GAME OVER.

const COMMANDS = [
  { id: 'fight', label: 'ÚTOK' },
  { id: 'act', label: 'AKCE' },
  { id: 'item', label: 'VĚCI' },
  { id: 'spare', label: 'UŠETŘIT' },
  { id: 'defend', label: 'OBRANA' }
];

const SUSIE_POWER = 46;          // základní síla útoku Susie
const FIGHT_BAR_TIME = 1.4;      // za kolik sekund přejede kurzor přes celý cíl
const PERFECT_ACCURACY = 0.93;   // přesnost, od které je zásah "perfektní"
const RUDE_BUSTER_COST = 50;     // cena kouzla v % TP
const DEFEND_TP = 16;
const BOX_SETTLE_TIME = 0.3;     // box se před útokem musí stihnout zmenšit
const TEXT_PADDING = 24;
const LIST_COLUMNS = 2;

// Nápověda pod plátnem pro každou fázi bitvy.
const PHASE_HINTS = {
  menu: 'Vyber příkaz šipkami ← →, potvrď Z / Enter.',
  actList: 'Vyber šipkami, Z / Enter potvrdí, X se vrátí.',
  itemList: 'Vyber šipkami, Z / Enter potvrdí, X se vrátí.',
  fight: 'Zmáčkni Z, až bude kurzor uprostřed cíle!',
  result: 'Z / Enter pokračuje.',
  enemyTalk: 'Z / Enter pokračuje.',
  attack: 'Uhýbej! Těsné míjení střel (graze) nabíjí TP.',
  victory: 'Vítězství! Z / Enter pro návrat.',
  gameover: 'Z / Enter = zkusit znovu, X = zpět.'
};

function createBattle(boss) {
  return {
    boss,
    phase: 'menu',
    phaseTime: 0,
    turn: 0,                 // počet odehraných útoků bosse
    bossHp: boss.maxHp,
    mercy: 0,
    tp: 0,
    defending: false,
    nextAttackSpeed: 1,      // ACT efekty můžou zpomalit příští útok
    command: 0,
    listIndex: 0,
    actUses: {},
    inventory: createInventory(),
    typer: null,             // text v boxu
    bubble: null,            // replika bosse
    fight: null,             // stav lišty při ÚTOKU
    attack: null,            // běžící útok bosse
    outcome: null,           // 'defeated' | 'spared'
    bossHurt: 0,             // jak dlouho se ještě boss třese po zásahu
    bossAlpha: 1
  };
}

function startBattle() {
  const battle = createBattle(state.currentBoss);
  state.battle = battle;
  enterMenu(battle, battle.boss.intro);
}

function setPhase(battle, phase) {
  battle.phase = phase;
  battle.phaseTime = 0;
  if (PHASE_HINTS[phase]) statusText.textContent = PHASE_HINTS[phase];
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

function updateBattle(dt) {
  const battle = state.battle;
  battle.phaseTime += dt;
  battle.bossHurt = Math.max(0, battle.bossHurt - dt);

  if (battle.typer) updateTyper(battle.typer, dt);
  if (battle.bubble) updateTyper(battle.bubble, dt);

  if (battle.outcome === 'defeated') battle.bossAlpha = Math.max(0, battle.bossAlpha - dt * 0.8);
  if (battle.outcome === 'spared') battle.bossAlpha = Math.max(0.35, battle.bossAlpha - dt * 1.5);

  switch (battle.phase) {
    case 'menu': updateMenu(battle); break;
    case 'actList': updateList(battle, getActOptions(battle), chooseAct); break;
    case 'itemList': updateList(battle, getItemOptions(battle), chooseItem); break;
    case 'fight': updateFight(battle, dt); break;
    case 'fightResult': if (battle.phaseTime >= 1.1) afterPlayerAction(battle); break;
    case 'result': updateTextPhase(battle, battle.typer, () => afterPlayerAction(battle)); break;
    case 'enemyTalk':
      if (battle.phaseTime >= BOX_SETTLE_TIME) updateTextPhase(battle, battle.bubble, () => startAttack(battle));
      break;
    case 'attack': updateAttack(battle, dt); break;
    case 'victory': updateTextPhase(battle, battle.typer, resetGame); break;
    case 'gameover': updateGameOver(battle); break;
  }
}

// Z dopíše rozepsaný text, další Z pokračuje dál.
function updateTextPhase(battle, typer, onDone) {
  if (!confirmPressed()) return;
  if (!typerDone(typer)) {
    finishTyper(typer);
    return;
  }
  onDone();
}

// -------------- Menu příkazů --------
function enterMenu(battle, text = pickFlavor(battle)) {
  setPhase(battle, 'menu');
  setBattleText(battle, text);
}

function pickFlavor(battle) {
  const boss = battle.boss;
  if (isSpareable(battle)) return `* ${boss.name} už nechce bojovat.`;
  if (boss.lowHpFlavor && battle.bossHp <= boss.maxHp * 0.3) return boss.lowHpFlavor;
  return boss.flavor[battle.turn % boss.flavor.length];
}

function updateMenu(battle) {
  const { dx } = directionPressed();
  if (dx) {
    battle.command = (battle.command + dx + COMMANDS.length) % COMMANDS.length;
    sfx.move();
  }
  if (!confirmPressed()) return;

  const command = COMMANDS[battle.command].id;
  if (command === 'item' && !hasItems(battle.inventory)) {
    sfx.cancel();
    statusText.textContent = 'Už nemáš žádné věci.';
    return;
  }

  sfx.select();
  battle.listIndex = 0;

  if (command === 'fight') startFight(battle);
  if (command === 'act') setPhase(battle, 'actList');
  if (command === 'item') setPhase(battle, 'itemList');
  if (command === 'spare') trySpare(battle);
  if (command === 'defend') defend(battle);
}

// Seznam ve dvou sloupcích (AKCE, VĚCI).
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
  setBattleText(battle, text);
  setPhase(battle, 'result');
}

function afterPlayerAction(battle) {
  if (battle.bossHp <= 0) {
    winBattle(battle, 'defeated');
    return;
  }
  startEnemyTalk(battle);
}

// -------------- ÚTOK --------
function startFight(battle) {
  battle.fight = { pos: 0, stoppedAt: null, perfect: false };
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
  fight.stoppedAt = pos;
  setPhase(battle, 'fightResult');

  if (pos === null) {
    addPopup('MISS', BOSS_POS.x, BOSS_POS.y - 10, '#bbbbbb');
    sfx.cancel();
    return;
  }

  // 1 = přesně uprostřed cíle, 0 = úplně na okraji
  const accuracy = 1 - Math.min(1, Math.abs(pos - 0.5) * 2);
  fight.perfect = accuracy >= PERFECT_ACCURACY;

  sfx.slash();
  addSlash(BOSS_POS.x, BOSS_POS.y);
  dealDamage(battle, SUSIE_POWER * (0.25 + 0.75 * accuracy) * (fight.perfect ? 1.4 : 1));
}

function dealDamage(battle, raw) {
  const variance = 0.9 + Math.random() * 0.2;
  const damage = Math.max(1, Math.round(raw * variance - battle.boss.defense));
  battle.bossHp = Math.max(0, battle.bossHp - damage);
  battle.bossHurt = 0.5;
  addPopup(damage, BOSS_POS.x, BOSS_POS.y - 10, '#ff4fd8');
  sfx.damage();
  return damage;
}

// -------------- AKCE --------
function getActOptions(battle) {
  const options = [{ name: 'Prověřit', kind: 'check', description: 'Zjistí víc o nepříteli.' }];

  for (const act of battle.boss.acts) {
    options.push({ name: act.name, kind: 'act', act, description: 'Může zvýšit MILOST.' });
  }

  const enoughTp = battle.tp >= RUDE_BUSTER_COST;
  options.push({
    name: 'Rude Buster',
    kind: 'buster',
    note: `${RUDE_BUSTER_COST}% TP`,
    disabled: !enoughTp,
    description: enoughTp
      ? 'Ničivé kouzlo Susie.'
      : 'Málo TP. Nabij ho grazem nebo OBRANOU.'
  });

  return options;
}

function chooseAct(battle, option) {
  const boss = battle.boss;

  if (option.kind === 'check') {
    showResult(battle, `* ${boss.name.toUpperCase()} - ÚT ${boss.attack} OBR ${boss.defense}\n* ${boss.check}`);
    return;
  }

  if (option.kind === 'buster') {
    rudeBuster(battle);
    return;
  }

  const act = option.act;
  const uses = battle.actUses[act.name] || 0;
  battle.actUses[act.name] = uses + 1;

  const repeated = uses > 0;
  addMercy(battle, repeated && act.repeatMercy !== undefined ? act.repeatMercy : act.mercy);
  if (act.effect) act.effect(battle);
  showResult(battle, repeated && act.repeatText ? act.repeatText : act.text);
}

function addMercy(battle, amount) {
  if (amount <= 0 || isSpareable(battle)) return;
  battle.mercy = Math.min(100, battle.mercy + amount);
  addPopup(`+${amount}%`, BOSS_POS.x, BOSS_POS.y - 30, '#ffe14d');
  sfx.mercy();
}

function rudeBuster(battle) {
  battle.tp -= RUDE_BUSTER_COST;
  sfx.buster();
  addShake(4);
  addSlash(BOSS_POS.x, BOSS_POS.y);
  const damage = dealDamage(battle, SUSIE_POWER * 2.4);
  showResult(battle, `* Susie použila RUDE BUSTER!\n* ${damage} poškození!`);
}

// -------------- VĚCI --------
function getItemOptions(battle) {
  return battle.inventory
    .filter(stack => stack.count > 0)
    .map(stack => {
      const item = ITEMS[stack.id];
      return {
        name: item.name,
        note: `×${stack.count}`,
        stack,
        description: item.heal === Infinity ? 'Obnoví všechna HP.' : `Obnoví ${item.heal} HP.`
      };
    });
}

function chooseItem(battle, option) {
  const result = useItem(option.stack, state.player);
  if (result.healed > 0) addPopup(`+${result.healed}`, SUSIE_POS.x + 36, SUSIE_POS.y + 40, '#7dff7d');
  sfx.heal();
  showResult(battle, result.text);
}

// -------------- UŠETŘIT a OBRANA --------
function trySpare(battle) {
  if (isSpareable(battle)) {
    winBattle(battle, 'spared');
    return;
  }
  showResult(battle, '* Susie se pokusila nepřítele ušetřit...\n* Jenže jeho jméno nebylo ŽLUTÉ.');
}

function defend(battle) {
  battle.defending = true;
  battle.tp = Math.min(100, battle.tp + DEFEND_TP);
  showResult(battle, '* Susie se kryje.\n* Příští útok ubere jen polovinu HP. TP se dobilo.');
}

// -------------- Tah bosse --------
function startEnemyTalk(battle) {
  const lines = battle.boss.dialogue;
  battle.bubble = createTyper(lines[battle.turn % lines.length], BUBBLE.w - 24, BUBBLE_FONT);

  // srdce se před každým útokem vrací doprostřed arény
  const p = state.player;
  p.x = arena.x + arena.w / 2;
  p.y = arena.y + arena.h / 2;
  p.hurtCooldown = 0;
  state.bullets = [];

  setPhase(battle, 'enemyTalk');
}

function startAttack(battle) {
  const attacks = battle.boss.attacks;
  const pattern = attacks[battle.turn % attacks.length];
  // každé další kolo časové osy je rychlejší, a ještě víc, když bossovi dochází HP
  const level = Math.floor(battle.turn / attacks.length);
  const lowHp = battle.bossHp <= battle.boss.maxHp * 0.3;
  const speed = (1 + 0.12 * Math.min(level, 3) + (lowHp ? 0.1 : 0)) * battle.nextAttackSpeed;

  battle.nextAttackSpeed = 1;
  battle.bubble = null;
  battle.attack = { pattern, t: 0, dt: 0, timers: {}, data: {}, level, speed };
  if (pattern.start) pattern.start(battle.attack);

  setPhase(battle, 'attack');
}

function updateAttack(battle, dt) {
  const run = battle.attack;
  run.dt = dt;
  run.t += dt;

  updatePlayer(dt);
  run.pattern.update(run, dt);
  updateBullets(dt);

  // srdci mohlo dojít HP - pak už jsme ve fázi gameover
  if (battle.phase !== 'attack') return;
  if (run.t >= run.pattern.duration) endAttack(battle);
}

function endAttack(battle) {
  state.bullets = [];
  state.player.hurtCooldown = 0;
  battle.attack = null;
  battle.defending = false;
  battle.turn += 1;
  enterMenu(battle);
}

// -------------- Konec bitvy --------
function winBattle(battle, outcome) {
  const boss = battle.boss;
  const turns = battle.turn + 1;

  battle.outcome = outcome;
  state.running = false;
  state.bullets = [];
  stopMusic();
  state.record = recordBattleResult(boss.id, outcome, turns);

  const headline = outcome === 'spared'
    ? '* VYHRÁLI JSTE! Nepřítel byl ušetřen.'
    : '* VYHRÁLI JSTE!';
  setBattleText(
    battle,
    `${headline}\n* Získáno 0 EXP a ${boss.gold} D$.\n* Bitva trvala ${turns} ${plural(turns, 'kolo', 'kola', 'kol')}.`
  );

  if (outcome === 'spared') sfx.spare();
  else sfx.victory();

  setPhase(battle, 'victory');
  statusText.textContent = `Vítězství! Nejrychlejší výhra: ${state.record.bestTurns} ${plural(state.record.bestTurns, 'kolo', 'kola', 'kol')}. Z / Enter pro návrat.`;
  updateUi();
}

// Volá endGame(), když srdci dojdou HP během útoku.
function loseBattle() {
  const battle = state.battle;
  state.bullets = [];
  battle.attack = null;
  battle.bubble = null;
  sfx.gameOver();
  setPhase(battle, 'gameover');
}

function updateGameOver(battle) {
  if (battle.phaseTime < 0.8) return;
  if (confirmPressed()) startGame();
  else if (cancelPressed()) resetGame();
}
