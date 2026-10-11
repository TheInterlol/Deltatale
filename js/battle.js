// Battle flow shared by every boss:
//   menu (choose actions) -> steps (text, fight bars, spells, bubbles, the attack itself)
//   -> next menu ... until a win, a GAME OVER, or the player leaves.
// Everything that happens in order is a "step" in battle.steps, so bosses can insert their own
// cutscenes (Sans' spare trap, Toriel giving up, ...) without a separate engine.
const UT_COMMANDS = ['fight', 'act', 'item', 'mercy'];
const DR_COMMAND_LABELS = { fight: 'FIGHT', act: 'ACT', magic: 'MAGIC', item: 'ITEM', spare: 'SPARE', defend: 'DEFEND' };
const UT_COMMAND_LABELS = { fight: 'FIGHT', act: 'ACT', item: 'ITEM', mercy: 'MERCY' };
const DEFEND_TP = 16;
const TEXT_PAD = 26;

// -------------- Start / restart --------------
function startBossFight(bossId) {
  const boss = BOSSES[bossId];
  if (!boss) return;

  settings.lastBoss = bossId;
  saveSettings();
  stopMusic();
  pressedKeys.clear();

  state.scene = 'battle';
  state.paused = false;
  state.bullets = [];
  state.shots = [];
  resetEffects();

  const battle = createBattle(boss);
  state.battle = battle;

  soul.visible = false;
  soul.frozen = false;
  soul.invuln = 0;
  setSoulMode('red', { announce: false });
  board.angle = 0;
  board.spin = 0;
  board.alpha = 1;
  if (battle.style === 'undertale') {
    board.visible = true;
    setBoard(UT.textBox, { instant: true });
  } else {
    board.visible = false;
    setBoard({ w: 150, h: 150 }, { instant: true });
  }

  if (boss.setup) boss.setup(battle);
  if (boss.music) playMusic(boss.music);

  if (boss.opening) {
    battle.phase = 'steps';
    battle.steps = boss.opening(battle) || [];
    battle.steps.push({ type: 'call', fn: () => enterMenu(battle) });
  } else {
    enterMenu(battle, boss.intro);
  }
  setStatus(`${boss.name} — ${battle.style === 'undertale' ? 'Undertale' : 'Deltarune'}. Z confirm, X back, Esc pause.`);
}

function retryFight() {
  if (state.battle) startBossFight(state.battle.boss.id);
}

function createBattle(boss) {
  return {
    boss,
    style: boss.game,
    party: createParty(boss.party),
    inventory: createInventory(boss.items),
    enemy: {
      name: boss.name,
      hp: boss.hp,
      maxHp: boss.hp,
      def: boss.def,
      mercy: 0,
      tired: false,
      spareable: false,
      alpha: 1,
      offsetX: 0,
      offsetY: 0,
      hurt: 0,
      barTimer: 0,
      visible: true
    },
    tp: 0,
    turn: 0,
    phase: 'menu',
    phaseTime: 0,
    menu: { mode: 'buttons', button: 0, index: 0, member: 0, pending: null, commands: [] },
    actions: [],
    steps: [],
    step: null,
    typer: null,
    bubble: null,
    run: null,
    attackKey: null,
    outcome: null,
    elapsed: 0,
    kr: 0,
    karma: Boolean(boss.karma),
    data: {},
    results: null
  };
}

function setStatus(text) {
  if (statusText) statusText.textContent = text;
}

// -------------- Text helpers --------------
function textWidthFor(battle) {
  return (battle.style === 'undertale' ? UT.textBox.w : DR.textBox.w) - TEXT_PAD * 2 - 10;
}

function setText(battle, text) {
  battle.typer = text ? createTyper(text, textWidthFor(battle)) : null;
}

function memberName(battle, member) {
  return battle.style === 'undertale' ? 'You' : member.name;
}

// -------------- Menu --------------
function enterMenu(battle, text) {
  battle.phase = 'menu';
  battle.phaseTime = 0;
  battle.steps = [];
  battle.step = null;
  battle.bubble = null;
  battle.actions = [];
  battle.menu.mode = 'buttons';
  battle.menu.index = 0;
  battle.menu.pending = null;
  for (const m of battle.party) m.defending = false;
  battle.menu.member = nextActiveMember(battle, -1);

  soul.visible = false;
  state.bullets = [];
  state.shots = [];
  board.spin = 0;
  board.angle = 0;
  if (battle.style === 'undertale') {
    board.visible = true;
    setBoard(UT.textBox);
  } else {
    board.visible = false;
  }

  setText(battle, text !== undefined ? text : flavorText(battle));
}

function flavorText(battle) {
  const boss = battle.boss;
  if (boss.flavorText) {
    const custom = boss.flavorText(battle);
    if (custom) return custom;
  }
  if (battle.style === 'deltarune' && battle.enemy.mercy >= 100) return `* ${boss.name} is ready to be spared.`;
  if (battle.style === 'deltarune' && battle.enemy.tired) return `* ${boss.name} looks TIRED.`;
  if (!boss.flavor.length) return `* ${boss.name} is here.`;
  return boss.flavor[battle.turn % boss.flavor.length];
}

// Deltarune: index of the next member who still has to choose (not downed, not used by an X-Action).
function nextActiveMember(battle, from) {
  for (let i = from + 1; i < battle.party.length; i++) {
    const m = battle.party[i];
    if (!m.down && !battle.actions.some(a => a.uses && a.uses.includes(m.id))) return i;
  }
  return -1;
}

function prevActiveMember(battle, from) {
  for (let i = from - 1; i >= 0; i--) {
    if (!battle.party[i].down) return i;
  }
  return -1;
}

function activeMember(battle) {
  return battle.party[battle.menu.member] || battle.party[0];
}

function menuCommands(battle) {
  if (battle.style === 'undertale') return UT_COMMANDS;
  return activeMember(battle).commands;
}

function updateMenu(battle) {
  const menu = battle.menu;

  if (menu.mode === 'buttons') {
    const commands = menuCommands(battle);
    const { dx } = directionPressed();
    if (dx) {
      menu.button = (menu.button + dx + commands.length) % commands.length;
      sfx.move();
    }
    if (cancelPressed() && battle.style === 'deltarune') undoLastAction(battle);
    else if (confirmPressed()) chooseCommand(battle, commands[menu.button]);
    return;
  }

  const options = menuOptions(battle);
  const columns = menuColumns(menu.mode);
  const { dx, dy } = directionPressed();
  const column = menu.index % columns;
  let next = menu.index + dy * columns;
  if (dx > 0 && column < columns - 1) next += 1;
  if (dx < 0 && column > 0) next -= 1;
  if (next !== menu.index && next >= 0 && next < options.length) {
    menu.index = next;
    sfx.move();
  }

  if (cancelPressed()) {
    sfx.cancel();
    menuBack(battle);
    return;
  }
  if (!confirmPressed()) return;

  const option = options[menu.index];
  if (!option || option.disabled) {
    sfx.cancel();
    return;
  }
  sfx.select();
  chooseOption(battle, option);
}

function menuColumns(mode) {
  return mode === 'acts' || mode === 'items' || mode === 'magic' ? 2 : 1;
}

function openList(battle, mode, pending = battle.menu.pending) {
  battle.menu.mode = mode;
  battle.menu.index = 0;
  battle.menu.pending = pending;
}

function menuBack(battle) {
  const menu = battle.menu;
  if (menu.mode === 'acts') openList(battle, 'target', 'act');
  else if (menu.mode === 'ally') openList(battle, menu.pending && menu.pending.type === 'item' ? 'items' : 'magic', null);
  else menu.mode = 'buttons';
}

function chooseCommand(battle, command) {
  const menu = battle.menu;
  if (command === 'item' && !hasItems(battle.inventory)) {
    sfx.cancel();
    return;
  }
  sfx.select();

  if (command === 'fight') openList(battle, 'target', 'fight');
  else if (command === 'act') openList(battle, 'target', 'act');
  else if (command === 'item') openList(battle, 'items', null);
  else if (command === 'mercy') openList(battle, 'mercy', null);
  else if (command === 'magic') openList(battle, 'magic', null);
  else if (command === 'spare') openList(battle, 'target', 'spare');
  else if (command === 'defend') {
    battle.tp = Math.min(100, battle.tp + DEFEND_TP);
    recordAction(battle, { type: 'defend', tpGain: DEFEND_TP });
  }
  menu.index = 0;
}

// Options shown in the current list.
function menuOptions(battle) {
  const menu = battle.menu;
  const enemy = battle.enemy;
  const member = activeMember(battle);

  if (menu.mode === 'target') {
    return [{
      label: enemy.name,
      value: 'enemy',
      yellow: battle.style === 'undertale' ? enemy.spareable : enemy.mercy >= 100 || enemy.tired,
      hpBar: menu.pending === 'fight' || battle.style === 'deltarune',
      tired: enemy.tired
    }];
  }

  if (menu.mode === 'acts') {
    const list = [{ label: 'Check', value: { name: 'Check', check: true } }];
    for (const act of battle.boss.acts) {
      if (act.available && !act.available(battle)) continue;
      const tp = act.tp || 0;
      const membersOk = !act.members || act.members.every(id => {
        const m = battle.party.find(p => p.id === id);
        return m && !m.down && !battle.actions.some(a => a.member === m || (a.uses && a.uses.includes(id)));
      });
      list.push({
        label: act.name,
        note: tp ? `${tp}%` : '',
        members: act.members,
        value: act,
        disabled: battle.tp < tp || !membersOk,
        description: act.description || ''
      });
    }
    return list;
  }

  if (menu.mode === 'items') {
    return battle.inventory
      .map((stack, i) => ({ stack, i }))
      .filter(({ stack }) => stack.count > 0 && !battle.actions.some(a => a.stack === stack && stack.count <= 1))
      .map(({ stack }) => ({
        label: ITEMS[stack.id].name,
        note: stack.count > 1 ? `x${stack.count}` : '',
        value: stack,
        description: itemDescription(ITEMS[stack.id])
      }));
  }

  if (menu.mode === 'mercy') {
    const list = [{ label: 'Spare', value: 'spare', yellow: battle.enemy.spareable }];
    if (battle.boss.canFlee !== undefined) list.push({ label: 'Flee', value: 'flee' });
    return list;
  }

  if (menu.mode === 'magic') {
    return (member.spells || []).map(id => {
      const spell = SPELLS[id];
      return { label: spell.name, note: `${spell.tp}%`, value: id, disabled: battle.tp < spell.tp, description: spell.description };
    });
  }

  if (menu.mode === 'ally') {
    return battle.party.map(m => ({ label: m.name, value: m, hpOf: m }));
  }

  return [];
}

function chooseOption(battle, option) {
  const menu = battle.menu;
  const pending = menu.pending;

  if (menu.mode === 'target') {
    if (pending === 'fight') recordAction(battle, { type: 'fight' });
    else if (pending === 'act') openList(battle, 'acts', 'act');
    else if (pending === 'spare') recordAction(battle, { type: 'spare' });
    else if (pending && pending.type === 'spell') {
      battle.tp -= SPELLS[pending.spell].tp;
      recordAction(battle, { type: 'spell', spell: pending.spell, tpCost: SPELLS[pending.spell].tp });
    }
    return;
  }

  if (menu.mode === 'acts') {
    const act = option.value;
    if (act.check) {
      recordAction(battle, { type: 'check' });
    } else {
      battle.tp -= act.tp || 0;
      recordAction(battle, { type: 'act', act, tpCost: act.tp || 0, uses: act.members || null });
    }
    return;
  }

  if (menu.mode === 'items') {
    if (battle.style === 'undertale' || ITEMS[option.value.id].all) recordAction(battle, { type: 'item', stack: option.value });
    else openList(battle, 'ally', { type: 'item', stack: option.value });
    return;
  }

  if (menu.mode === 'mercy') {
    recordAction(battle, { type: option.value });
    return;
  }

  if (menu.mode === 'magic') {
    const spell = SPELLS[option.value];
    if (spell.target === 'ally') openList(battle, 'ally', { type: 'spell', spell: option.value });
    else openList(battle, 'target', { type: 'spell', spell: option.value });
    return;
  }

  if (menu.mode === 'ally') {
    if (pending.type === 'item') recordAction(battle, { type: 'item', stack: pending.stack, target: option.value });
    else {
      battle.tp -= SPELLS[pending.spell].tp;
      recordAction(battle, { type: 'spell', spell: pending.spell, target: option.value, tpCost: SPELLS[pending.spell].tp });
    }
  }
}

function recordAction(battle, action) {
  action.member = activeMember(battle);
  battle.actions.push(action);

  if (battle.style === 'undertale') {
    resolveTurn(battle);
    return;
  }
  const next = nextActiveMember(battle, battle.menu.member);
  if (next === -1) {
    resolveTurn(battle);
    return;
  }
  battle.menu.member = next;
  battle.menu.mode = 'buttons';
  battle.menu.button = 0;
  battle.menu.pending = null;
}

// Deltarune: X on the command row goes back to the previous member and refunds their choice.
function undoLastAction(battle) {
  const last = battle.actions.pop();
  if (!last) {
    sfx.cancel();
    return;
  }
  sfx.cancel();
  if (last.tpCost) battle.tp = Math.min(100, battle.tp + last.tpCost);
  if (last.tpGain) battle.tp = Math.max(0, battle.tp - last.tpGain);
  battle.menu.member = battle.party.indexOf(last.member);
  battle.menu.mode = 'buttons';
  battle.menu.pending = null;
}

// -------------- Resolving the player's turn --------------
function resolveTurn(battle) {
  battle.phase = 'steps';
  battle.step = null;
  battle.typer = null;
  const steps = [];
  const fighters = [];

  for (const action of battle.actions) {
    if (action.type === 'defend') action.member.defending = true;
    if (action.type === 'fight') fighters.push(action.member);
    else steps.push({ type: 'call', fn: () => runAction(battle, action) });
  }
  if (fighters.length) steps.push({ type: 'fight', fighters });
  steps.push({ type: 'call', fn: () => afterPlayerTurn(battle) });
  battle.steps = steps;
}

// Inserts steps to run right after the current one.
function insertSteps(battle, steps) {
  battle.steps.unshift(...steps);
}

function textSteps(texts) {
  return [].concat(texts).filter(Boolean).map(text => ({ type: 'text', text }));
}

function runAction(battle, action) {
  const boss = battle.boss;
  const member = action.member;
  const name = memberName(battle, member);
  member.pose = 'act';
  member.poseTime = 0.4;

  if (action.type === 'check') {
    insertSteps(battle, textSteps(boss.check || `* ${boss.name.toUpperCase()} - Nothing to say.`));
    return;
  }

  if (action.type === 'act') {
    const prefix = battle.style === 'deltarune' ? `* ${member.name} used ${action.act.name}!` : null;
    const result = action.act.run ? action.act.run(battle, member) : null;
    const texts = [].concat(result || []);
    if (prefix && texts.length && !texts[0].startsWith('* ' + member.name)) texts[0] = `${prefix}\n${texts[0]}`;
    if (!texts.length && prefix) texts.push(prefix);
    insertSteps(battle, textSteps(texts));
    return;
  }

  if (action.type === 'item') {
    const item = ITEMS[action.stack.id];
    action.stack.count -= 1;
    const targets = item.all ? aliveMembers(battle) : [action.target || member];
    let healedText = '';
    for (const t of targets) {
      if (t.down && !item.revive && !item.all) { /* can still heal a downed member */ }
      const amount = item.heal === Infinity ? t.maxHp - t.hp : item.heal;
      const res = healMember(battle, t, amount);
      if (battle.style === 'undertale') healedText = t.hp >= t.maxHp ? '* Your HP was maxed out.' : `* You recovered ${res.healed} HP!`;
    }
    sfx.heal();
    const text = battle.style === 'undertale'
      ? `* ${item.text}\n${healedText}`
      : `* ${member.name} ${item.text}`;
    insertSteps(battle, textSteps(text));
    return;
  }

  if (action.type === 'spell') {
    insertSteps(battle, castSpell(battle, member, action));
    return;
  }

  if (action.type === 'spare') {
    const custom = boss.onSpare ? boss.onSpare(battle, member) : undefined;
    if (custom !== undefined) {
      if (custom) insertSteps(battle, textSteps(custom));
      return;
    }
    const canSpare = battle.style === 'undertale' ? battle.enemy.spareable : battle.enemy.mercy >= 100;
    if (canSpare) {
      winBattle(battle, 'spared');
      return;
    }
    insertSteps(battle, textSteps(battle.style === 'undertale'
      ? `* You spared ${boss.name}.\n* But nothing happened.`
      : `* ${member.name} spared ${boss.name}!\n* But its name wasn't YELLOW...`));
    return;
  }

  if (action.type === 'flee') {
    const custom = boss.onFlee ? boss.onFlee(battle) : null;
    insertSteps(battle, textSteps(custom || '* You tried to flee...\n* But you couldn\'t escape!'));
  }
}

function castSpell(battle, member, action) {
  const spell = SPELLS[action.spell];
  const steps = [];
  member.pose = 'attack';
  member.poseTime = 0.5;
  sfx.spell();

  if (action.spell === 'rudeBuster') {
    const damage = Math.max(1, Math.round(member.atk * 11 + member.magic * 5 - battle.enemy.def * 3));
    steps.push({ type: 'call', fn: () => attackEnemy(battle, damage, { member, spell: true }) });
    steps.push({ type: 'wait', duration: 0.6 });
    steps.unshift({ type: 'text', text: `* ${member.name} cast RUDE BUSTER!` });
  } else if (action.spell === 'pacify') {
    if (battle.enemy.tired) {
      steps.push({ type: 'call', fn: () => winBattle(battle, 'pacified', [`* ${member.name} cast PACIFY!\n* ${battle.boss.name} fell asleep!`]) });
    } else {
      steps.push({ type: 'text', text: `* ${member.name} cast PACIFY!\n* But the enemy wasn't TIRED...` });
    }
  } else if (action.spell === 'healPrayer' || action.spell === 'ultimateHeal') {
    const target = action.target || member;
    const amount = action.spell === 'healPrayer' ? member.magic * 5 : member.magic + 10;
    healMember(battle, target, amount);
    sfx.heal();
    steps.push({ type: 'text', text: `* ${member.name} cast ${spell.name.toUpperCase()}!` });
  }
  return steps;
}

function afterPlayerTurn(battle) {
  if (battle.outcome) return;
  if (battle.enemy.hp <= 0) {
    enemyDefeated(battle);
    return;
  }
  beginEnemyTurn(battle);
}

// -------------- Damage to the enemy --------------
function enemyPosition(battle) {
  const base = battle.style === 'undertale' ? UT.enemy : DR.enemy;
  return { x: base.x + battle.enemy.offsetX, y: base.y + battle.enemy.offsetY };
}

function attackEnemy(battle, damage, { member = null, crit = false, spell = false } = {}) {
  const boss = battle.boss;
  const enemy = battle.enemy;
  const pos = enemyPosition(battle);
  let dmg = damage;

  if (boss.onFight) {
    const result = boss.onFight(battle, dmg, member, { spell });
    if (result === 'miss' || result === 0) {
      addPopup('MISS', pos.x, pos.y - 40, '#c0c0c0');
      sfx.miss();
      return 0;
    }
    if (typeof result === 'number') dmg = result;
  }

  enemy.hp = Math.max(0, enemy.hp - dmg);
  enemy.hurt = 0.5;
  enemy.barTimer = 1.4;
  addSlash(pos.x, pos.y, member && member.color ? member.color : '#ff3030');
  addPopup(dmg, pos.x, pos.y - 40, crit ? '#ffff40' : '#ff4040', crit ? 30 : 26);
  sfx.damage();
  if (boss.onEnemyDamaged) boss.onEnemyDamaged(battle, dmg);
  return dmg;
}

function addMercy(battle, amount) {
  if (amount <= 0 || battle.enemy.mercy >= 100) return;
  battle.enemy.mercy = Math.min(100, battle.enemy.mercy + amount);
  const pos = enemyPosition(battle);
  addPopup(`+${amount}%`, pos.x, pos.y - 70, '#ffe14d', 20);
  sfx.mercy();
}

function enemyDefeated(battle) {
  const boss = battle.boss;
  const lines = boss.onEnemyDefeated ? boss.onEnemyDefeated(battle) : null;
  winBattle(battle, 'killed', lines || []);
}

// -------------- Enemy turn --------------
function defaultNextAttack(battle) {
  const boss = battle.boss;
  const seq = boss.sequence.length ? boss.sequence : Object.keys(boss.attacks);
  if (battle.turn < seq.length) return seq[battle.turn];
  const loop = boss.loop || seq;
  return loop[(battle.turn - seq.length) % loop.length];
}

function beginEnemyTurn(battle) {
  const boss = battle.boss;
  const key = boss.nextAttack ? boss.nextAttack(battle) : defaultNextAttack(battle);
  const attack = key ? boss.attacks[key] : null;
  battle.attackKey = key;

  let lines = null;
  if (boss.dialogue) lines = boss.dialogue(battle, key);
  if (!lines && attack && attack.dialogue) lines = typeof attack.dialogue === 'function' ? attack.dialogue(battle) : attack.dialogue;

  const steps = [];
  if (attack) steps.push({ type: 'call', fn: () => prepareAttack(battle, attack) });
  if (lines && [].concat(lines).length) steps.push({ type: 'bubble', lines: [].concat(lines) });
  if (attack) steps.push({ type: 'attack', key });
  steps.push({ type: 'call', fn: () => endEnemyTurn(battle) });
  insertSteps(battle, steps);
}

function prepareAttack(battle, attack) {
  const box = typeof attack.box === 'function' ? attack.box(battle) : (attack.box || { w: 165, h: 140 });
  board.visible = true;
  board.alpha = 1;
  if (battle.style === 'deltarune' && board.w > 400) setBoard({ w: 10, h: 10 }, { instant: true });
  setBoard(box);
  board.angle = box.angle || 0;
  board.spin = 0;
  battle.typer = null;

  state.bullets = [];
  state.shots = [];
  soul.visible = true;
  soul.frozen = true;
  soul.invuln = 0;
  const opts = typeof attack.soulOptions === 'function' ? attack.soulOptions(battle) : (attack.soulOptions || {});
  setSoulMode(attack.soul || 'red', opts);
  centerSoul();
  if (attack.soulStart) {
    const t = board.target;
    placeSoul(t.x + t.w * attack.soulStart.x, t.y + t.h * attack.soulStart.y);
  }
}

function createRun(battle, key, attack) {
  const level = battle.turn;
  const run = {
    battle,
    key,
    attack,
    t: 0,
    dt: 0,
    data: {},
    timers: {},
    fired: new Set(),
    speed: 1,
    level,
    finished: false,
    every(name, interval, fn, firstDelay = 0) {
      if (!(name in run.timers)) run.timers[name] = interval - firstDelay;
      run.timers[name] += run.dt;
      while (run.timers[name] >= interval) {
        run.timers[name] -= interval;
        fn();
      }
    },
    at(time, fn) {
      const id = `${time}`;
      if (run.t >= time && !run.fired.has(id)) {
        run.fired.add(id);
        fn();
      }
    },
    once(name, fn) {
      if (run.fired.has(name)) return;
      run.fired.add(name);
      fn();
    },
    finish() {
      run.finished = true;
    }
  };
  return run;
}

function updateAttackStep(battle, step, dt) {
  if (!step.started) {
    step.started = true;
    const attack = battle.boss.attacks[step.key];
    battle.run = createRun(battle, step.key, attack);
    soul.frozen = false;
    statusText && setStatus(attackHint(attack));
    if (attack.start) attack.start(battle.run);
  }

  const run = battle.run;
  const attack = run.attack;
  run.dt = dt;
  run.t += dt;

  updateSoul(dt);
  if (attack.update) attack.update(run, dt);
  updateBullets(dt);
  updateShots(dt);
  updateCombat(dt);

  if (battle.phase !== 'steps' || battle.outcome) return false;
  if (run.finished || (attack.duration && run.t >= attack.duration)) {
    if (attack.end) attack.end(run);
    return true;
  }
  return false;
}

function attackHint(attack) {
  const mode = attack.soul || 'red';
  if (mode === 'blue') return 'Blue SOUL: gravity! Press the key opposite to gravity to jump.';
  if (mode === 'green') return 'Green SOUL: you can\'t move. Turn the shield with the arrow keys.';
  if (mode === 'yellow') return 'Yellow SOUL: Z shoots. In Deltarune, hold Z to charge a BIG SHOT.';
  if (mode === 'purple') return 'Purple SOUL: Up/Down jump between strings, Left/Right move along them.';
  return 'Dodge! Blue attacks hurt only when you move, orange ones only when you stand still.';
}

function endEnemyTurn(battle) {
  state.bullets = [];
  state.shots = [];
  soul.visible = false;
  board.spin = 0;
  battle.run = null;
  battle.turn += 1;

  if (battle.style === 'deltarune') {
    // downed members slowly recover each turn
    for (const m of battle.party) {
      if (!m.down) continue;
      m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp / 8));
      if (m.hp > 0) m.down = false;
    }
  }

  insertSteps(battle, [{ type: 'call', fn: () => enterMenu(battle) }]);
  if (battle.boss.onTurnEnd) battle.boss.onTurnEnd(battle);
}

// -------------- Step processing --------------
function updateSteps(battle, dt) {
  let guard = 0;
  while (guard++ < 50) {
    if (!battle.step) {
      battle.step = battle.steps.shift() || null;
      if (!battle.step) return;
      battle.step.time = 0;
    }
    const step = battle.step;
    step.time += dt;
    const done = runStep(battle, step, dt);
    if (battle.phase !== 'steps') return;
    if (!done) return;
    if (battle.step === step) battle.step = null;
    dt = 0;
  }
}

function runStep(battle, step, dt) {
  switch (step.type) {
    case 'call':
      step.fn();
      return true;

    case 'wait':
      return step.time >= step.duration;

    case 'text': {
      if (!step.started) {
        step.started = true;
        if (battle.style === 'undertale') {
          board.visible = true;
          setBoard(UT.textBox);
          soul.visible = false;
        }
        setText(battle, step.text);
      }
      if (battle.typer) updateTyper(battle.typer, dt);
      if (!confirmPressed()) return false;
      if (battle.typer && !typerDone(battle.typer)) {
        finishTyper(battle.typer);
        return false;
      }
      battle.typer = null;
      return true;
    }

    case 'bubble': {
      if (!step.started) {
        step.started = true;
        step.index = 0;
        battle.bubble = makeBubble(battle, step.lines[0]);
      }
      if (battle.bubble) updateTyper(battle.bubble, dt);
      if (step.time < 0.25) return false;
      if (!confirmPressed()) return false;
      if (!typerDone(battle.bubble)) {
        finishTyper(battle.bubble);
        return false;
      }
      step.index += 1;
      if (step.index < step.lines.length) {
        battle.bubble = makeBubble(battle, step.lines[step.index]);
        return false;
      }
      battle.bubble = null;
      return true;
    }

    case 'attack':
      return updateAttackStep(battle, step, dt);

    case 'fight':
      return updateFightStep(battle, step, dt);

    case 'anim':
      if (step.update) step.update(step, dt);
      return step.time >= step.duration;

    default:
      return true;
  }
}

function bubbleLayout(battle) {
  const custom = battle.boss.bubble;
  if (custom) return custom;
  if (battle.style === 'undertale') return { x: UT.enemy.x + 90, y: 30, w: 190, side: 'left' };
  return { x: DR.enemy.x - 250, y: 60, w: 180, side: 'right' };
}

function makeBubble(battle, text) {
  const layout = bubbleLayout(battle);
  return createTyper(text, layout.w - 24, BUBBLE_FONT, battle.boss.voice);
}

// -------------- Victory / defeat --------------
function winBattle(battle, outcome, lines = []) {
  if (battle.outcome) return;
  const boss = battle.boss;
  battle.outcome = outcome;
  soul.visible = false;
  state.bullets = [];
  state.shots = [];
  battle.bubble = null;
  stopMusic();

  battle.record = recordWin(boss.id, outcome, battle.elapsed);
  battle.results = { outcome, time: battle.elapsed };

  const exp = outcome === 'killed' ? boss.exp : 0;
  const reward = battle.style === 'undertale'
    ? `* YOU WON!\n* You earned ${exp} EXP and ${boss.gold} gold.`
    : `* You won!\n* Got ${exp} EXP and ${boss.gold} D$.`;

  if (outcome === 'killed') {
    const pos = enemyPosition(battle);
    addParticles(pos.x, pos.y, 50, { color: '#ffffff', speed: 120, size: 3, life: 1.4, gravity: -40 });
    sfx.victory();
  } else {
    sfx.spare();
  }

  battle.phase = 'steps';
  battle.step = null;
  battle.steps = [...textSteps(lines), { type: 'text', text: reward }, { type: 'call', fn: () => showResults(battle) }];
  if (battle.style === 'undertale') {
    board.visible = true;
    setBoard(UT.textBox);
  } else {
    board.visible = false;
  }
}

function showResults(battle) {
  battle.phase = 'results';
  battle.phaseTime = 0;
  battle.menu.index = 0;
  setStatus(`Cleared ${battle.boss.name} in ${formatTime(battle.elapsed)}. Retry, next boss or boss select.`);
}

function playerDefeated(battle) {
  if (battle.phase === 'gameover') return;
  battle.phase = 'gameover';
  battle.phaseTime = 0;
  battle.outcome = 'dead';
  battle.deathPos = { x: soul.x, y: soul.y, color: soul.color };
  battle.bubble = null;
  soul.visible = false;
  state.bullets = [];
  state.shots = [];
  stopMusic();
  recordDeath(battle.boss.id);
  addShake(4);
  sfx.shatter();
  setStatus('GAME OVER. Z = retry instantly, X = boss select.');
}

function resultOptions(battle) {
  if (battle.phase === 'gameover') return ['Retry', 'Boss select'];
  return ['Retry', 'Next boss', 'Boss select'];
}

function updateEndScreen(battle) {
  if (battle.phase === 'gameover' && battle.phaseTime < 0.9) return;
  const options = resultOptions(battle);
  const { dx, dy } = directionPressed();
  const delta = dx || dy;
  if (delta) {
    battle.menu.index = (battle.menu.index + delta + options.length) % options.length;
    sfx.move();
  }
  if (battle.phase === 'gameover' && cancelPressed()) {
    openBossSelect();
    return;
  }
  if (!confirmPressed()) return;
  sfx.select();
  const choice = options[battle.menu.index];
  if (choice === 'Retry') retryFight();
  else if (choice === 'Next boss') startBossFight(nextBossId(battle.boss.id));
  else openBossSelect();
}

function nextBossId(id) {
  const ids = implementedBossIds();
  const i = ids.indexOf(id);
  return ids[(i + 1) % ids.length];
}

// -------------- Main battle update --------------
function updateBattle(dt) {
  const battle = state.battle;
  battle.phaseTime += dt;
  if (!battle.outcome) battle.elapsed += dt;

  const enemy = battle.enemy;
  enemy.hurt = Math.max(0, enemy.hurt - dt);
  enemy.barTimer = Math.max(0, enemy.barTimer - dt);
  for (const m of battle.party) {
    m.hurt = Math.max(0, m.hurt - dt);
    m.poseTime = Math.max(0, m.poseTime - dt);
    if (m.poseTime <= 0) m.pose = 'idle';
  }
  if (battle.outcome === 'killed') enemy.alpha = Math.max(0, enemy.alpha - dt * 0.8);
  if (battle.outcome === 'spared' || battle.outcome === 'pacified') enemy.alpha = Math.max(0.45, enemy.alpha - dt * 1.5);

  if (battle.phase === 'menu') {
    if (battle.typer) updateTyper(battle.typer, dt);
    updateMenu(battle);
  } else if (battle.phase === 'steps') {
    updateSteps(battle, dt);
  } else if (battle.phase === 'results' || battle.phase === 'gameover') {
    updateEndScreen(battle);
  }

  if (battle.style === 'undertale' && battle.karma === false) battle.kr = 0;
}
