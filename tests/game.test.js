// Automated tests: the game runs in headless Chromium (Playwright).
// Run: npm install && npx playwright install chromium && npm test
//
// Most tests stub requestAnimationFrame and step the game manually through updateGame(dt),
// so results don't depend on machine speed. Generic tests loop over every registered boss,
// so each new boss is automatically checked for: every attack running to completion,
// taking damage, dying, and retrying.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('./server');

const FRAME = 1 / 60;
let server;
let browser;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/index.html`;
  browser = await chromium.launch();
});

after(async () => {
  if (browser) await browser.close();
  if (server) server.close();
});

// Helpers installed into the page.
function installHelpers() {
  window.T = {
    frame() {
      updateGame(1 / 60);
      render();
      endInputFrame();
    },
    step(seconds) {
      for (let i = 0; i < Math.max(1, Math.round(seconds * 60)); i++) T.frame();
    },
    press(key) {
      pressedKeys.add(key);
      T.frame();
    },
    // Advance through text/bubbles (pressing Z) and skip attacks until the player's menu,
    // the results screen or GAME OVER.
    toMenu(maxFrames = 20000) {
      for (let i = 0; i < maxFrames; i++) {
        const b = state.battle;
        if (!b || ['menu', 'results', 'gameover'].includes(b.phase)) return b ? b.phase : 'none';
        if (b.step && b.step.type === 'attack' && b.run) b.run.finished = true;
        if (i % 3 === 0) pressedKeys.add('z');
        T.frame();
      }
      return 'timeout';
    },
    // Choose a command (index into the command row), then confirm through target lists.
    command(index) {
      state.battle.menu.button = index;
      T.press('z');
    },
    // Runs a real attack step using a throwaway attack definition on the current boss.
    runTestAttack(spec) {
      const battle = state.battle;
      battle.boss.attacks.__test = Object.assign({ duration: 99, box: { w: 200, h: 140 } }, spec);
      state.bullets = [];
      battle.phase = 'steps';
      battle.step = null;
      battle.steps = [
        { type: 'call', fn: () => prepareAttack(battle, battle.boss.attacks.__test) },
        { type: 'attack', key: '__test' }
      ];
      T.step(0.4);
    },
    // Advance to the next attack and return once it is running.
    toAttack(maxFrames = 6000) {
      for (let i = 0; i < maxFrames; i++) {
        const b = state.battle;
        if (b.phase === 'steps' && b.step && b.step.type === 'attack' && b.run) return true;
        if (b.phase !== 'steps') return false;
        if (i % 3 === 0) pressedKeys.add('z');
        T.frame();
      }
      return false;
    }
  };
}

async function openGame({ manualLoop = true, initScript, context: ctxOpts } = {}) {
  const context = await browser.newContext(ctxOpts || { viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
  });
  if (manualLoop) await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  if (initScript) await page.addInitScript(initScript);
  await page.addInitScript(installHelpers);
  await page.goto(baseUrl);
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof T !== 'undefined');
  await page.focus('#game');
  return { page, errors, close: () => context.close() };
}

test('the page loads into the boss select with every asset loaded and no errors', async () => {
  const { page, errors, close } = await openGame({ manualLoop: false });
  try {
    await page.waitForTimeout(400);
    const result = await page.evaluate(() => ({
      scene: state.scene,
      assets: Object.values(ASSETS).every(img => img.complete && img.naturalWidth > 0)
    }));
    assert.deepEqual(result, { scene: 'select', assets: true });
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('the roster covers both games and every registered boss is on it', async () => {
  const { page, close } = await openGame();
  try {
    const result = await page.evaluate(() => {
      const ids = allRosterEntries().map(e => e.id);
      return {
        games: ROSTER.map(g => g.game),
        unlisted: Object.keys(BOSSES).filter(id => !ids.includes(id)),
        duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
        size: ids.length
      };
    });
    assert.deepEqual(result.games, ['undertale', 'deltarune']);
    assert.deepEqual(result.unlisted, []);
    assert.deepEqual(result.duplicates, []);
    assert.ok(result.size >= 30, `roster has ${result.size} entries`);
  } finally {
    await close();
  }
});

test('every boss has complete data and its texts fit the text box and bubble', async () => {
  const { page, close } = await openGame();
  try {
    const problems = await page.evaluate(() => {
      const out = [];
      for (const boss of Object.values(BOSSES)) {
        const style = boss.game;
        state.battle = { style, boss };
        const width = textWidthFor({ style });
        const bubbleW = (boss.bubble || bubbleLayout({ style, boss })).w - 24;
        const fits = (text, w, f, max, where) => {
          if (wrapText(text, w, f).length > max) out.push(`${boss.id}: ${where} is too long`);
        };
        if (!boss.draw) out.push(`${boss.id}: no draw()`);
        if (!Object.keys(boss.attacks).length) out.push(`${boss.id}: no attacks`);
        for (const [key, a] of Object.entries(boss.attacks)) {
          if (!a.duration && !a.update) out.push(`${boss.id}.${key}: neither duration nor update`);
        }
        const maxLines = style === 'undertale' ? 3 : 3;
        [boss.intro, boss.check, ...boss.flavor].filter(Boolean).forEach((t, i) => fits(t, width, TEXT_FONT, maxLines, `text #${i}`));
        for (const line of [].concat(boss.dialogueLines || [])) fits(line, bubbleW, BUBBLE_FONT, 6, `bubble "${line.slice(0, 20)}"`);
      }
      state.battle = null;
      return out;
    });
    assert.deepEqual(problems, []);
  } finally {
    await close();
  }
});

test('every attack of every boss runs to completion without errors', async () => {
  const { page, errors, close } = await openGame();
  try {
    const report = await page.evaluate(() => {
      const out = [];
      for (const boss of Object.values(BOSSES)) {
        for (const key of Object.keys(boss.attacks)) {
          startBossFight(boss.id);
          const battle = state.battle;
          battle.phase = 'steps';
          battle.steps = [];
          battle.step = null;
          beginEnemyTurn(battle);
          // force this attack
          const attackStep = battle.steps.find(s => s.type === 'attack');
          const prep = battle.steps.find(s => s.type === 'call');
          battle.attackKey = key;
          battle.steps = [
            { type: 'call', fn: () => prepareAttack(battle, boss.attacks[key]) },
            { type: 'attack', key },
            { type: 'call', fn: () => endEnemyTurn(battle) }
          ];
          for (const m of battle.party) { m.hp = 99999; m.maxHp = 99999; }
          let frames = 0;
          let maxBullets = 0;
          let sawAttack = false;
          while (frames < 60 * 40) {
            T.frame();
            frames++;
            if (battle.step && battle.step.type === 'attack') sawAttack = true;
            maxBullets = Math.max(maxBullets, state.bullets.length);
            if (sawAttack && battle.phase === 'menu') break;
            if (battle.phase === 'gameover' || battle.phase === 'results') break;
          }
          out.push({ id: `${boss.id}.${key}`, phase: battle.phase, maxBullets, seconds: frames / 60, attackStep: Boolean(attackStep || prep) });
        }
      }
      return out;
    });
    for (const r of report) {
      assert.ok(['menu', 'results'].includes(r.phase), `${r.id} ended in ${r.phase}`);
      assert.ok(r.maxBullets > 0, `${r.id} never spawned anything`);
      assert.ok(r.seconds < 39, `${r.id} took ${r.seconds}s`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('every boss can hurt the player, kill them, and retry instantly', async () => {
  const { page, errors, close } = await openGame();
  try {
    const report = await page.evaluate(() => {
      const out = [];
      for (const boss of Object.values(BOSSES)) {
        startBossFight(boss.id);
        T.toMenu();
        // ACT > Check to get to the enemy turn
        const battle = state.battle;
        battle.menu.button = battle.style === 'undertale' ? 1 : 0;
        if (battle.style === 'undertale') {
          T.press('z'); T.press('z'); T.press('z');
        } else {
          for (let i = 0; i < battle.party.length; i++) battle.party[i].commands.indexOf('defend') >= 0 && (battle.menu.button = battle.party[i].commands.indexOf('defend'), T.press('z'));
        }
        const attacking = T.toAttack();
        const before = battle.party.map(m => m.hp);
        soul.invuln = 0;
        battle.kr = 0;
        const blob = spawn({ x: soul.x, y: soul.y, r: 30, damage: 3, color: 'white' });
        T.step(0.05);
        const hurt = battle.party.some((m, i) => m.hp < before[i]);
        // now kill
        for (const m of battle.party) { m.hp = 1; m.down = false; }
        soul.invuln = 0;
        battle.karmaHitTimer = 0;
        blob.dead = true;
        spawn({ x: soul.x, y: soul.y, r: 30, damage: 999, color: 'white' });
        let died = false;
        for (let i = 0; i < 400 && !died; i++) {
          soul.invuln = 0;
          battle.karmaHitTimer = 0;
          if (battle.style === 'deltarune') for (const m of aliveMembers(battle)) { m.hp = 1; }
          T.frame();
          died = state.battle.phase === 'gameover';
          if (!died && state.bullets.length === 0 && battle.phase === 'steps' && battle.step && battle.step.type === 'attack') spawn({ x: soul.x, y: soul.y, r: 30, damage: 999, color: 'white' });
        }
        T.step(1.2);
        T.press('z');
        const retried = state.battle && state.battle !== battle && state.battle.boss.id === boss.id;
        out.push({ id: boss.id, attacking, hurt, died, retried });
      }
      return out;
    });
    for (const r of report) {
      assert.deepEqual(r, { id: r.id, attacking: true, hurt: true, died: true, retried: true });
    }
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('Toriel: twelve spares make her give up; FIGHT at low HP kills her', async () => {
  const { page, close } = await openGame();
  try {
    const spared = await page.evaluate(() => {
      startBossFight('toriel');
      for (let i = 0; i < 12; i++) {
        T.command(3);   // MERCY
        T.press('z');   // Spare
        const phase = T.toMenu();
        if (phase !== 'menu') return { phase, outcome: state.battle.outcome, spares: i + 1 };
      }
      return { phase: state.battle.phase };
    });
    assert.deepEqual(spared, { phase: 'results', outcome: 'spared', spares: 12 });

    const killed = await page.evaluate(() => {
      startBossFight('toriel');
      state.battle.enemy.hp = 120;
      T.command(0);
      T.press('z');
      T.step(UT_BAR_TIME / 2);
      T.press('z');
      return { hp: state.battle.enemy.hp, phase: T.toMenu(), outcome: state.battle.outcome };
    });
    assert.deepEqual(killed, { hp: 0, phase: 'results', outcome: 'killed' });
  } finally {
    await close();
  }
});

test('SOUL modes: blue gravity + jump, green shield blocks, yellow shots destroy targets', async () => {
  const { page, close } = await openGame();
  try {
    const r = await page.evaluate(() => {
      startBossFight('toriel');
      const battle = state.battle;
      T.runTestAttack({ soul: 'blue' });
      T.step(0.3);
      const floor = boardBounds(soul.r).bottom;
      const landed = Math.abs(soul.y - floor) < 1;
      keys.arrowup = true;
      T.step(0.15);
      const jumped = soul.y < floor - 20;
      keys.arrowup = false;
      T.step(0.8);
      const back = Math.abs(soul.y - floor) < 1;

      T.runTestAttack({ soul: 'green', box: { w: 80, h: 80 } });
      pressedKeys.add('arrowleft');
      T.step(0.2);
      const hp = battle.party[0].hp;
      spawnArrow('left', 0.3, { speed: 200 });
      T.step(0.6);
      const blocked = battle.party[0].hp === hp;
      spawnArrow('right', 0.3, { speed: 200 });
      T.step(0.6);
      const hitFromBehind = battle.party[0].hp < hp;

      T.runTestAttack({ soul: 'yellow' });
      const target = spawn({ x: soul.x, y: soul.y - 50, r: 10, shootable: true, hp: 1, harmless: true });
      pressedKeys.add('z');
      T.step(0.3);
      return { landed, jumped, back, blocked, hitFromBehind, destroyed: target.dead };
    });
    assert.deepEqual(r, { landed: true, jumped: true, back: true, blocked: true, hitFromBehind: true, destroyed: true });
  } finally {
    await close();
  }
});

test('blue attacks only hurt a moving SOUL, orange only a still one', async () => {
  const { page, close } = await openGame();
  try {
    const r = await page.evaluate(() => {
      startBossFight('toriel');
      const battle = state.battle;
      T.runTestAttack({ soul: 'red' });
      const hp0 = battle.party[0].hp;
      const blue = spawn({ x: soul.x, y: soul.y, r: 20, color: 'blue', damage: 2 });
      T.step(0.1);
      const stillVsBlue = battle.party[0].hp === hp0;
      keys.arrowleft = true;
      T.step(0.1);
      keys.arrowleft = false;
      const movingVsBlue = battle.party[0].hp < hp0;
      blue.dead = true;
      T.step(1);
      const hp1 = battle.party[0].hp;
      const orange = spawn({ x: soul.x, y: soul.y, r: 20, color: 'orange', damage: 2 });
      T.step(0.1);
      const stillVsOrange = battle.party[0].hp < hp1;
      orange.dead = true;
      return { stillVsBlue, movingVsBlue, stillVsOrange };
    });
    assert.deepEqual(r, { stillVsBlue: true, movingVsBlue: true, stillVsOrange: true });
  } finally {
    await close();
  }
});

test('boss select: keyboard and mouse pick bosses; unimplemented ones do not start', async () => {
  const { page, close } = await openGame();
  try {
    const r = await page.evaluate(() => {
      openBossSelect('toriel');
      T.press('arrowdown'); // Napstablook (not implemented, at least for now)
      const second = selectedEntry().id;
      T.press('z');
      const stillSelecting = state.scene === 'select' || state.battle.boss.id === second;
      T.press('arrowright');
      const tab = selectState.tab;
      openBossSelect('toriel');
      T.press('z');
      return { second, stillSelecting, tab, started: state.scene === 'battle' && state.battle.boss.id === 'toriel' };
    });
    assert.equal(r.tab, 1);
    assert.equal(r.started, true);
    assert.equal(r.stillSelecting, true);
  } finally {
    await close();
  }
});

test('pause menu freezes the fight and can retry or quit', async () => {
  const { page, close } = await openGame();
  try {
    const r = await page.evaluate(() => {
      startBossFight('toriel');
      T.toMenu();
      const t0 = state.battle.elapsed;
      T.press('escape');
      T.step(1);
      const frozen = state.paused && state.battle.elapsed === t0;
      T.press('arrowright'); // Retry
      T.press('z');
      const retried = !state.paused && state.battle.elapsed < 0.1;
      T.press('escape');
      T.press('arrowright');
      T.press('arrowright');
      T.press('z');
      return { frozen, retried, quit: state.scene === 'select' };
    });
    assert.deepEqual(r, { frozen: true, retried: true, quit: true });
  } finally {
    await close();
  }
});

test('game keys never scroll the page', async () => {
  const { page, close } = await openGame({ manualLoop: false });
  try {
    await page.keyboard.press('z');
    await page.keyboard.down('ArrowDown');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowDown');
    assert.equal(await page.evaluate(() => window.scrollY), 0);
  } finally {
    await close();
  }
});

test('touch controls appear on touch devices and drive the menus', async () => {
  const { page, errors, close } = await openGame({
    context: { viewport: { width: 400, height: 800 }, isMobile: true, hasTouch: true }
  });
  try {
    assert.equal(await page.isVisible('.touch-controls'), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.evaluate(() => openBossSelect('toriel'));
    await page.tap('[data-key="z"]');
    await page.evaluate(() => T.frame());
    assert.equal(await page.evaluate(() => state.scene === 'battle' && state.battle.boss.id), 'toriel');
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('the game still works when localStorage is blocked', async () => {
  const { page, errors, close } = await openGame({
    initScript: () => {
      const fail = () => { throw new Error('storage blocked'); };
      Storage.prototype.getItem = fail;
      Storage.prototype.setItem = fail;
    }
  });
  try {
    const phase = await page.evaluate(() => {
      startBossFight('toriel');
      state.battle.enemy.hp = 1;
      T.command(0);
      T.press('z');
      T.step(UT_BAR_TIME / 2);
      T.press('z');
      return T.toMenu();
    });
    assert.equal(phase, 'results');
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});
