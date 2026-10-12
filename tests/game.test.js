// Automated tests of the game in headless Chromium (Playwright).
// Run: npm install && npx playwright install chromium && npm test
//
// Most tests switch off the real game loop (requestAnimationFrame) and step the game by hand
// with updateGame(dt), so results don't depend on how fast the machine is.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('./server');

const FRAME = 1 / 60;

let server;
let browser;
let baseUrl;
let BOSS_IDS = [];

before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/index.html`;
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  const { page, close } = await openGame();
  BOSS_IDS = await page.evaluate(() => Object.keys(BOSSES));
  await close();
});

after(async () => {
  if (browser) await browser.close();
  if (server) server.close();
});

// Opens the game in a clean context (own localStorage). manualLoop = the test steps the game.
async function openGame({ manualLoop = true, initScript } = {}) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
  });

  if (manualLoop) await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  if (initScript) await page.addInitScript(initScript);

  await page.goto(baseUrl);
  await page.waitForFunction(() => typeof state !== 'undefined' && state.player !== null);

  return { page, errors, close: () => context.close() };
}

// Simulate `seconds` of play frame by frame, including drawing (catches render errors).
function step(page, seconds = FRAME) {
  return page.evaluate(({ seconds, frame }) => {
    const frames = Math.max(1, Math.round(seconds / frame));
    for (let i = 0; i < frames; i++) {
      updateGame(frame);
      render();
      endInputFrame();
    }
  }, { seconds, frame: FRAME });
}

async function press(page, key) {
  await page.keyboard.press(key);
  await step(page);
}

async function startMode(page, mode, boss) {
  await page.selectOption('#modeSelect', mode);
  await page.evaluate(id => { bossSelect.value = id; }, boss);
  await page.evaluate(() => startGame());
  // like the Fight button: focus the canvas
  await page.focus('#game');
  await step(page);
}

// Jump straight into the boss' next attack (skips the speech bubble).
function startNextAttack(page) {
  return page.evaluate(() => {
    const b = state.battle;
    startEnemyTalk(b);
    startAttack(b);
  });
}

// Finish the text in the box and continue.
async function advanceText(page) {
  await press(page, 'z');
  await press(page, 'z');
}

// FIGHT with a perfect hit.
async function perfectFight(page) {
  await page.evaluate(() => { state.battle.phase = 'menu'; state.battle.command = 0; });
  await press(page, 'z');
  await step(page, await page.evaluate(() => FIGHT_BAR_TIME / 2));
  await press(page, 'z');
}

// ---------------------------------------------------------------- page & data

test('the page loads, every asset loads and the real game loop runs without errors', async () => {
  const { page, errors, close } = await openGame({ manualLoop: false });
  try {
    await page.waitForTimeout(400);
    const assets = await page.evaluate(() =>
      [susieSprite, soulRedSprite, gersonSheet, axe01Sprite].map(img => img.complete && img.naturalWidth > 0)
    );
    assert.deepEqual(assets, [true, true, true, true]);
    assert.equal(await page.evaluate(() => state.screen), 'select');

    await page.click('#startBtn');
    await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => state.screen === 'fight' && state.running), true);
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('the page has no Czech text left', async () => {
  const { page, close } = await openGame();
  try {
    const text = await page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /[ěščřžůĚŠČŘŽŮ]/);
  } finally {
    await close();
  }
});

test('every registered boss is in the roster and has complete data', async () => {
  const { page, close } = await openGame();
  try {
    const report = await page.evaluate(() => Object.values(BOSSES).map(boss => ({
      id: boss.id,
      inRoster: Boolean(rosterEntry(boss.id)),
      game: ['undertale', 'deltarune'].includes(boss.game),
      stats: boss.maxHp > 0 && boss.attack > 0,
      texts: Boolean(boss.intro && boss.check),
      attacks: boss.attacks.length > 0 &&
        boss.attacks.every(a => a.name && typeof a.update === 'function'),
      inSelect: [...bossSelect.options].some(o => o.value === boss.id && !o.disabled)
    })));
    for (const r of report) {
      assert.deepEqual(r, { id: r.id, inRoster: true, game: true, stats: true, texts: true, attacks: true, inSelect: true });
    }
    // the roster really is the full boss rush, not just the playable part
    const total = await page.evaluate(() => rosterEntries().length);
    assert.ok(total >= 40, `roster has ${total} entries`);
  } finally {
    await close();
  }
});

test('all fixed battle texts fit into the text box and speech bubble', async () => {
  const { page, close } = await openGame();
  try {
    const tooLong = await page.evaluate(() => {
      const boxWidth = TEXT_BOX.w - TEXT_PADDING * 2;
      const problems = [];
      const check = (text, width, font, maxLines, where) => {
        const lines = wrapText(text, width, font);
        if (lines.length > maxLines) problems.push(`${where}: ${lines.length} lines`);
      };

      for (const boss of Object.values(BOSSES)) {
        const boxTexts = [
          boss.intro,
          `* ${boss.name.toUpperCase()} - AT ${boss.checkAttack ?? boss.attack} DF ${boss.checkDefense ?? boss.defense}\n* ${boss.check}`,
          ...boss.flavor,
          ...(boss.lowHpFlavor ? [boss.lowHpFlavor] : []),
          ...boss.acts.flatMap(a => [a.text, a.repeatText].filter(Boolean))
        ];
        boxTexts.forEach((t, i) => check(t, boxWidth, TEXT_FONT, 4, `${boss.id} box #${i}`));
        const bubbleWidth = (boss.game === 'undertale' ? 190 : BUBBLE_DR.w) - 24;
        const lines = [...boss.dialogue, ...boss.attacks.map(a => a.line).filter(Boolean)];
        lines.forEach((t, i) => check(t, bubbleWidth, BUBBLE_FONT, 7, `${boss.id} bubble #${i}`));
      }
      for (const [id, item] of Object.entries(ITEMS)) {
        check(`${item.text}\n* You recovered 99 HP!`, boxWidth, TEXT_FONT, 4, `item ${id}`);
      }
      return problems;
    });

    assert.deepEqual(tooLong, []);
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------- every boss

test('battle: every attack of every boss runs to completion and returns to the menu', async () => {
  const { page, errors, close } = await openGame();
  try {
    for (const id of BOSS_IDS) {
      await startMode(page, 'battle', id);
      const count = await page.evaluate(() => state.battle.boss.attacks.length);

      for (let i = 0; i < count; i++) {
        const result = await page.evaluate(({ i, frame }) => {
          const b = state.battle;
          b.phase = 'menu';
          const attack = b.boss.attacks[i];
          startEnemyTalk(b);
          b.nextAttack = attack;
          startAttack(b);
          state.player.maxHp = 99999;
          state.player.hp = 99999; // immortal, so the attack runs to its end
          let maxBullets = 0;
          let frames = 0;
          while (b.phase === 'attack' && frames < 60 * 40) {
            updateGame(frame);
            render();
            endInputFrame();
            maxBullets = Math.max(maxBullets, state.bullets.length);
            frames++;
          }
          return { name: attack.name, quiet: Boolean(attack.quiet), phase: b.phase, maxBullets, seconds: frames * frame };
        }, { i, frame: FRAME });

        const label = `${id} attack #${i} (${result.name})`;
        assert.equal(result.phase, 'menu', label);
        if (!result.quiet) assert.ok(result.maxBullets > 0, `${label} never fired`);
        assert.ok(result.seconds < 30, `${label} took ${result.seconds} s`);
      }
      await page.evaluate(() => { state.player.maxHp = playerStats(state.currentBoss).maxHp; });
    }
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('battle: for every boss a hit hurts, dying shows GAME OVER, Z retries and X goes to boss select', async () => {
  const { page, errors, close } = await openGame();
  try {
    for (const id of BOSS_IDS) {
      await startMode(page, 'battle', id);
      await startNextAttack(page);
      const hit = await page.evaluate(() => {
        const p = state.player;
        p.hurtCooldown = 0;
        const before = p.hp;
        spawnBullet(p.x, p.y, 0, 0, 10);
        updateBullets(0);
        return before - p.hp;
      });
      assert.ok(hit > 0, `${id}: a hit did no damage`);

      // Toriel never kills you - every other boss does
      const result = await page.evaluate(() => {
        const p = state.player;
        p.hp = 1;
        p.hurtCooldown = 0;
        spawnBullet(p.x, p.y, 0, 0, 10);
        updateBullets(0);
        return { phase: state.battle.phase, over: state.gameOver, hp: p.hp };
      });
      if (id === 'toriel') {
        assert.deepEqual(result, { phase: 'attack', over: false, hp: 1 }, id);
        continue;
      }
      assert.deepEqual({ phase: result.phase, over: result.over }, { phase: 'gameover', over: true }, id);
      await step(page);

      await step(page, 1);
      await press(page, 'z');
      const retried = await page.evaluate(() => ({
        phase: state.battle.phase, full: state.player.hp === state.player.maxHp, over: state.gameOver, boss: state.mode
      }));
      assert.deepEqual(retried, { phase: 'menu', full: true, over: false, boss: id }, `${id} retry`);

      // die again and go back to the boss select with X
      await startNextAttack(page);
      await page.evaluate(() => {
        const p = state.player;
        p.hp = 1;
        p.hurtCooldown = 0;
        spawnBullet(p.x, p.y, 0, 0, 10);
        updateBullets(0);
      });
      await step(page, 1);
      await press(page, 'x');
      assert.equal(await page.evaluate(() => state.screen), 'select', `${id} back to select`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('battle: every boss can be beaten with FIGHT, and Z then returns to the boss select', async () => {
  const { page, errors, close } = await openGame();
  try {
    for (const id of BOSS_IDS) {
      await startMode(page, 'battle', id);
      await page.evaluate(() => {
        const b = state.battle;
        if (b.boss.id === 'sans') b.flags.asleep = true;
        b.bossHp = 1;
      });
      await perfectFight(page);
      await step(page, 1.2);
      const result = await page.evaluate(() => ({ phase: state.battle.phase, outcome: state.battle.outcome }));
      assert.deepEqual(result, { phase: 'victory', outcome: 'defeated' }, id);

      const record = await page.evaluate(id => getBossRecord(id).defeated, id);
      assert.equal(record, 1, `${id} record`);

      await step(page, 3);
      await press(page, 'z');
      assert.equal(await page.evaluate(() => state.screen), 'select', `${id} -> select`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('survival: every boss keeps attacking and a hit costs exactly 1 HP', async () => {
  const { page, errors, close } = await openGame();
  try {
    for (const id of BOSS_IDS) {
      await startMode(page, 'survival', id);
      await page.evaluate(() => { state.player.hp = 9999; state.player.maxHp = 9999; });
      await step(page, 4);
      const alive = await page.evaluate(() => ({ running: state.running, bullets: state.bullets.length }));
      assert.equal(alive.running, true, `${id} survival running`);

      const hp = await page.evaluate(() => {
        state.bullets = [];
        const p = state.player;
        p.hurtCooldown = 0;
        const before = p.hp;
        spawnBullet(p.x, p.y, 0, 0, 10);
        updateBullets(0);
        return before - p.hp;
      });
      assert.equal(hp, 1, `survival damage for ${id}`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------- SOUL modes

test('blue SOUL: gravity pulls it to the floor and ↑ jumps', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'papyrus');
    await page.evaluate(() => {
      const b = state.battle;
      b.flags.acted = true;
      startEnemyTalk(b);
      startAttack(b);
      state.bullets = [];
    });
    assert.equal(await page.evaluate(() => state.player.mode), 'blue');
    await step(page, 1);
    const floor = await page.evaluate(() => ({ y: state.player.y, floor: arena.y + arena.h - state.player.r, grounded: state.player.grounded }));
    assert.ok(Math.abs(floor.y - floor.floor) < 1 && floor.grounded, JSON.stringify(floor));

    await page.keyboard.down('ArrowUp');
    await step(page, 0.15);
    const air = await page.evaluate(() => state.player.y);
    await page.keyboard.up('ArrowUp');
    assert.ok(air < floor.y - 30, `jumped to ${air} from ${floor.y}`);
    await step(page, 1);
    assert.equal(await page.evaluate(() => state.player.grounded), true);
  } finally {
    await close();
  }
});

test('cyan bones only hurt a moving SOUL, orange only a still one', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'dummy');
    await startNextAttack(page);
    const result = await page.evaluate(() => {
      const p = state.player;
      const tryHit = (color, moving) => {
        state.bullets = [];
        p.hurtCooldown = 0;
        p.moving = moving;
        const before = p.hp;
        spawn({ x: p.x, y: p.y, r: 10, color });
        // run the collision part only (updateSoul would recompute "moving")
        for (const b of state.bullets) {
          if (distanceToBullet(b, p.x, p.y) < p.r && colorAllowsHit(b)) hurtPlayer(getHitDamage(b), b);
        }
        return before - p.hp > 0;
      };
      return {
        cyanStill: tryHit('cyan', false), cyanMoving: tryHit('cyan', true),
        orangeStill: tryHit('orange', false), orangeMoving: tryHit('orange', true)
      };
    });
    assert.deepEqual(result, { cyanStill: false, cyanMoving: true, orangeStill: true, orangeMoving: false });
  } finally {
    await close();
  }
});

test('green SOUL: the shield blocks spears from the side it faces', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'undyne');
    await startNextAttack(page);
    const result = await page.evaluate(() => {
      state.bullets = [];
      const p = state.player;
      p.shield = 'left';
      undyneSpear('left', 300);
      const hp = p.hp;
      for (let i = 0; i < 90; i++) updateBullets(1 / 60);
      const blockedHp = p.hp;
      p.shield = 'up';
      p.hurtCooldown = 0;
      undyneSpear('left', 300);
      for (let i = 0; i < 90; i++) updateBullets(1 / 60);
      return { mode: p.mode, blocked: blockedHp === hp, hurt: p.hp < hp };
    });
    assert.deepEqual(result, { mode: 'green', blocked: true, hurt: true });
  } finally {
    await close();
  }
});

test('yellow SOUL: shots destroy shootable bullets and a held Z fires a BIG SHOT', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'spamton_neo');
    await startNextAttack(page);
    assert.equal(await page.evaluate(() => state.player.mode), 'yellow');
    await page.evaluate(() => {
      state.bullets = [];
      const p = state.player;
      window.__target = spawn({ kind: 'normal', x: p.x + 120, y: p.y, r: 10, shootHp: 1, harmless: true });
      window.__armour = spawn({ kind: 'normal', x: p.x + 60, y: p.y + 40, r: 10, shootHp: 4, bigOnly: true, harmless: true });
    });
    await press(page, 'z');
    await step(page, 0.5);
    assert.equal(await page.evaluate(() => window.__target.dead), true);

    // small shots bounce off armour, a BIG SHOT breaks it
    await page.evaluate(() => { state.player.y += 40; });
    await press(page, 'z');
    await step(page, 0.4);
    assert.equal(await page.evaluate(() => Boolean(window.__armour.dead)), false);
    await page.keyboard.down('z');
    await step(page, 0.7);
    await page.keyboard.up('z');
    await step(page, 0.4);
    assert.equal(await page.evaluate(() => window.__armour.dead), true);
  } finally {
    await close();
  }
});

test('purple SOUL: up/down jumps between strings, left/right moves along them', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'dummy');
    await startNextAttack(page);
    await page.evaluate(() => { state.bullets = []; setSoulMode('purple', { lanes: 3 }); });
    const start = await page.evaluate(() => ({ lane: state.player.lane, y: state.player.y }));
    await press(page, 'ArrowDown');
    await step(page, 0.3);
    const after = await page.evaluate(() => ({ lane: state.player.lane, y: state.player.y, target: laneY(state.player.lane) }));
    assert.equal(after.lane, start.lane + 1);
    assert.equal(after.y, after.target);
  } finally {
    await close();
  }
});

test('KARMA keeps draining HP but never takes the last point', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'sans');
    const result = await page.evaluate(() => {
      const p = state.player;
      p.hp = 10;
      p.karma = 40;
      for (let i = 0; i < 600; i++) updateKarma(1 / 60);
      return { hp: p.hp, karma: p.karma };
    });
    assert.equal(result.hp, 1);
    assert.ok(result.karma < 40);
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------- boss mechanics

test('Toriel: sparing over and over (or missing) ends the fight peacefully', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'toriel');
    const result = await page.evaluate(() => {
      const b = state.battle;
      for (let i = 0; i < 30 && !b.outcome; i++) {
        b.phase = 'menu';
        if (i === 0) Toriel.onMiss(b);
        else trySpare(b);
      }
      return { outcome: b.outcome, spares: b.flags.spares };
    });
    assert.deepEqual(result, { outcome: 'spared', spares: 18 });
  } finally {
    await close();
  }
});

test('Toriel: below 3 HP her fire swerves around the SOUL and cannot hurt it', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'toriel');
    await startNextAttack(page);
    await page.evaluate(() => { state.player.hp = 2; });
    await step(page, 4);
    assert.equal(await page.evaluate(() => state.player.hp), 2);
  } finally {
    await close();
  }
});

test('Papyrus: the SOUL turns blue after the first action and he spares you after his special attack', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'papyrus');
    await startNextAttack(page);
    assert.equal(await page.evaluate(() => state.player.mode), 'red');
    await page.evaluate(() => endAttack(state.battle));

    // spare once -> next attack is the blue attack
    await page.evaluate(() => { state.battle.phase = 'menu'; state.battle.command = 3; });
    await press(page, 'z');
    await press(page, 'z');
    const blue = await page.evaluate(() => {
      const b = state.battle;
      startEnemyTalk(b);
      startAttack(b);
      return { mode: state.player.mode, attack: b.attack.attack.name };
    });
    assert.deepEqual(blue, { mode: 'blue', attack: 'Blue attack' });

    // run through the whole script until he offers to spare
    const offered = await page.evaluate(() => {
      const b = state.battle;
      for (let i = 0; i < 12 && !b.flags.offersSpare; i++) {
        endAttack(b);
        startEnemyTalk(b);
        startAttack(b);
      }
      endAttack(b);
      return { offers: b.flags.offersSpare, mercy: b.mercy };
    });
    assert.deepEqual(offered, { offers: true, mercy: 100 });
    await page.evaluate(() => { state.battle.phase = 'menu'; trySpare(state.battle); });
    assert.equal(await page.evaluate(() => state.battle.outcome), 'spared');
  } finally {
    await close();
  }
});

test('Undyne: no escape while the SOUL is green, fleeing works once the red phase started', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'undyne');
    await page.evaluate(() => tryFlee(state.battle));
    assert.match(await page.evaluate(() => state.battle.typer.text), /can't escape/);
    await page.evaluate(() => { state.battle.flags.redSeen = true; tryFlee(state.battle); });
    assert.equal(await page.evaluate(() => state.battle.outcome), 'survived');
  } finally {
    await close();
  }
});

test('Sans: dodges every FIGHT, his mercy is a trap, and he can only be hit while asleep', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'sans');
    await perfectFight(page);
    assert.equal(await page.evaluate(() => state.battle.fight.missed), true);
    await step(page, 1.2);

    // the false mercy
    const trap = await page.evaluate(() => {
      const b = state.battle;
      if (b.attack) endAttack(b);
      b.turn = 12;
      b.phase = 'menu';
      startEnemyTalk(b);
      startAttack(b);
      const offer = b.attack.attack.name;
      endAttack(b);
      b.phase = 'menu';
      trySpare(b);
      startEnemyTalk(b);
      startAttack(b);
      state.player.hurtCooldown = 0;
      for (let i = 0; i < 120 && b.phase === 'attack'; i++) updateGame(1 / 60);
      return { offer, phase: b.phase };
    });
    assert.deepEqual(trap, { offer: 'A break', phase: 'gameover' });
  } finally {
    await close();
  }
});

test('Jevil: Pirouette and Hypnosis tire him out, then SPARE pacifies him', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'jevil');
    const result = await page.evaluate(() => {
      const b = state.battle;
      const hypnosis = Jevil.acts.find(a => a.name === 'Hypnosis');
      for (let i = 0; i < 5; i++) {
        b.tp = 100;
        chooseAct(b, { kind: 'act', act: hypnosis });
      }
      b.phase = 'menu';
      trySpare(b);
      return { tired: b.flags.tired, outcome: b.outcome };
    });
    assert.deepEqual(result, { tired: 9, outcome: 'spared' });
  } finally {
    await close();
  }
});

test('Jevil: getting him tired also moves him into later phases', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'jevil');
    const phases = await page.evaluate(() => {
      const b = state.battle;
      const list = [jevilPhase(b)];
      b.flags.tired = 4;
      list.push(jevilPhase(b));
      b.flags.tired = 0;
      b.bossHp = b.boss.maxHp * 0.35;
      list.push(jevilPhase(b));
      return list;
    });
    assert.deepEqual(phases, [1, 3, 4]);
  } finally {
    await close();
  }
});

test('Spamton NEO: snapping wires fills MERCY and SPARE then frees him', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'spamton_neo');
    const result = await page.evaluate(() => {
      const b = state.battle;
      const snap = SpamtonNeo.acts.find(a => a.name === 'Snap');
      for (let i = 0; i < 8; i++) chooseAct(b, { kind: 'act', act: snap });
      b.phase = 'menu';
      trySpare(b);
      return { mercy: b.mercy, outcome: b.outcome };
    });
    assert.deepEqual(result, { mercy: 100, outcome: 'spared' });
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------- menus & UI

test('boss select: arrow keys and Z start the chosen boss, unfinished bosses do not start', async () => {
  const { page, close } = await openGame();
  try {
    await page.focus('#game');
    await page.evaluate(() => focusBossInMenu('dummy'));
    await press(page, 'ArrowDown'); // Napstablook - coming soon
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.screen), 'select');
    await press(page, 'ArrowDown'); // Toriel
    await press(page, 'z');
    assert.deepEqual(await page.evaluate(() => [state.screen, state.mode]), ['fight', 'toriel']);
  } finally {
    await close();
  }
});

test('battle: ACT, ITEM and X behave', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'gerson');
    await page.evaluate(() => { state.battle.command = 1; });
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.battle.phase), 'actList');
    await press(page, 'x');
    assert.deepEqual(
      await page.evaluate(() => ({ phase: state.battle.phase, turn: state.battle.turn })),
      { phase: 'menu', turn: 0 }
    );

    await page.evaluate(() => { state.player.hp = 5; state.battle.command = 2; });
    await press(page, 'z');
    await press(page, 'z'); // Dark Candy (+40)
    const healed = await page.evaluate(() => ({
      hp: state.player.hp,
      candies: state.battle.inventory.find(s => s.id === 'darkCandy').count,
      phase: state.battle.phase
    }));
    assert.deepEqual(healed, { hp: 45, candies: 1, phase: 'result' });
  } finally {
    await close();
  }
});

test('battle: DEFEND halves the damage of the next attack and grants TP', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'gerson');
    await page.evaluate(() => { state.battle.command = 4; });
    await press(page, 'z'); // DEFEND
    await advanceText(page);
    await step(page, 0.4);   // the box shrinks into the bullet board
    await advanceText(page); // speech bubble -> attack

    const result = await page.evaluate(() => {
      state.bullets = [];
      state.player.hurtCooldown = 0;
      const before = state.player.hp;
      spawnBullet(state.player.x, state.player.y, 0, 0, 10);
      updateBullets(0);
      return { phase: state.battle.phase, lost: before - state.player.hp, tp: state.battle.tp };
    });
    assert.equal(result.phase, 'attack');
    assert.equal(result.lost, Math.ceil(24 / 2));
    assert.ok(result.tp >= 16);
  } finally {
    await close();
  }
});

test('survival: dying saves the best time under the original localStorage key', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'survival', 'dummy');
    await step(page, 1);
    await page.evaluate(() => {
      state.player.hp = 1;
      state.player.hurtCooldown = 0;
      spawnBullet(state.player.x, state.player.y, 0, 0, 10);
    });
    await step(page);

    const result = await page.evaluate(() => ({
      gameOver: state.gameOver,
      stored: Number(localStorage.getItem('battle_best_dummy'))
    }));
    assert.equal(result.gameOver, true);
    assert.ok(result.stored >= 1, `stored time ${result.stored}`);

    await step(page, 0.5);
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.running && state.player.hp === 20), true);
  } finally {
    await close();
  }
});

test('switching away from Gerson stops his music', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'survival', 'gerson');
    assert.equal(await page.evaluate(() => currentMusic === gersonMusic), true);
    await page.selectOption('#bossSelect', 'jevil');
    assert.equal(await page.evaluate(() => gersonMusic.paused && currentMusic === null), true);
  } finally {
    await close();
  }
});

test('game keys do not scroll the page or re-click the Fight button while playing', async () => {
  const { page, close } = await openGame({ manualLoop: false });
  try {
    await page.selectOption('#modeSelect', 'survival');
    await page.evaluate(() => { bossSelect.value = 'dummy'; });
    await page.click('#startBtn');
    await page.keyboard.down('ArrowDown');
    // with margin: a slow machine runs fewer frames per second (dt is capped at 33 ms)
    await page.waitForTimeout(900);
    await page.keyboard.up('ArrowDown');

    // a player who tabbed to the button must not restart the game with Space
    await page.focus('#startBtn');
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);

    const result = await page.evaluate(() => ({ scrollY: window.scrollY, timer: state.timer }));
    assert.equal(result.scrollY, 0);
    assert.ok(result.timer > 0.35, `timer ${result.timer}`);
  } finally {
    await close();
  }
});

test('pause freezes the fight, Esc resumes it and X quits to the boss select', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'survival', 'dummy');
    await press(page, 'Escape');
    const frozen = await page.evaluate(() => state.timer);
    await step(page, 1);
    assert.equal(await page.evaluate(() => state.paused && state.timer), frozen);

    await press(page, 'Escape');
    await step(page, 0.5);
    assert.ok((await page.evaluate(() => state.timer)) > frozen);

    await press(page, 'Escape');
    await press(page, 'x');
    assert.equal(await page.evaluate(() => state.screen), 'select');
  } finally {
    await close();
  }
});

test('touch controls appear on touch devices and drive the game', async () => {
  const context = await browser.newContext({
    viewport: { width: 400, height: 800 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.goto(baseUrl);
    await page.waitForFunction(() => typeof state !== 'undefined' && state.player !== null);
    await page.selectOption('#modeSelect', 'survival');
    await page.evaluate(() => { bossSelect.value = 'dummy'; focusBossInMenu('dummy'); });

    assert.equal(await page.isVisible('.touch-controls'), true);

    // Z on the touch pad starts the fight
    await page.tap('[data-key="z"]');
    await step(page);
    assert.equal(await page.evaluate(() => state.running), true);

    // holding right moves the SOUL
    await step(page, 0.5);
    const startX = await page.evaluate(() => state.player.x);
    const box = await page.locator('[data-key="arrowright"]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await step(page, 0.3);
    await page.mouse.up();
    const movedX = await page.evaluate(() => state.player.x);
    assert.ok(movedX > startX + 30, `x ${startX} -> ${movedX}`);

    // it stops after releasing
    await step(page, 0.3);
    assert.equal(await page.evaluate(() => state.player.x), movedX);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('touch controls stay hidden on desktop', async () => {
  const { page, close } = await openGame();
  try {
    assert.equal(await page.isVisible('.touch-controls'), false);
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
    await startMode(page, 'battle', 'dummy');
    await page.evaluate(() => { state.battle.mercy = 100; state.battle.command = 3; });
    await press(page, 'z'); // MERCY
    await press(page, 'z'); // Spare
    assert.equal(await page.evaluate(() => state.battle.phase), 'victory');
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});
