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
  await page.evaluate(({ mode, boss }) => {
    selection.mode = mode;
    selection.boss = boss;
    startGame();
  }, { mode, boss });
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
    assert.equal(await page.evaluate(() => state.screen), 'title');

    // title -> BOSS RUSH -> boss select -> fight
    await page.focus('#game');
    await page.keyboard.press('z');
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => state.screen), 'select');
    await page.keyboard.press('z');
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
      inSelect: isPlayable(boss.id)
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
        spawnBullet(soulHitPoints()[0].x, soulHitPoints()[0].y, 0, 0, 10);
        updateBullets(0);
        return before - p.hp;
      });
      assert.ok(hit > 0, `${id}: a hit did no damage`);

      // Toriel and Asriel can't kill you - every other boss can
      const cannotLose = await page.evaluate(() => Boolean(state.currentBoss.cannotLose));
      const result = await page.evaluate(() => {
        const p = state.player;
        p.hp = 1;
        p.hurtCooldown = 0;
        spawnBullet(soulHitPoints()[0].x, soulHitPoints()[0].y, 0, 0, 10);
        updateBullets(0);
        return { phase: state.battle.phase, over: state.gameOver, hp: p.hp };
      });
      if (cannotLose) {
        assert.equal(result.over, false, `${id} should not be able to kill`);
        assert.ok(result.hp >= 1, `${id} hp`);
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
        spawnBullet(soulHitPoints()[0].x, soulHitPoints()[0].y, 0, 0, 10);
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

// Play enemy turns (without dodging) until the fight is over.
function playOutFight(page, maxTurns = 14) {
  return page.evaluate(maxTurns => {
    const b = state.battle;
    for (let i = 0; i < maxTurns && !b.outcome; i++) {
      if (b.phase === 'fightResult' || b.phase === 'result') afterPlayerAction(b);
      if (b.outcome) break;
      if (b.phase === 'menu') startEnemyTalk(b);
      if (b.phase === 'enemyTalk') startAttack(b);
      if (b.phase === 'attack') endAttack(b);
    }
    return { phase: b.phase, outcome: b.outcome };
  }, maxTurns);
}

test('battle: every boss that can be fought is beaten with FIGHT, and Z then returns to the boss select', async () => {
  const { page, errors, close } = await openGame();
  try {
    for (const id of BOSS_IDS) {
      await startMode(page, 'battle', id);
      if (await page.evaluate(() => Boolean(state.currentBoss.cannotBeFought))) continue;
      await page.evaluate(() => {
        const b = state.battle;
        if (b.boss.id === 'sans') b.flags.asleep = true;
        b.bossHp = 1;
      });
      // some bosses keep going after reaching 0 HP (Undyne the Undying) or need a last hit
      // after a scripted finale (the Roaring Knight): FIGHT, play a few turns, repeat
      let result = null;
      for (let round = 0; round < 6; round++) {
        await page.evaluate(() => { if (state.battle.bossHp > 1) state.battle.bossHp = 1; });
        await perfectFight(page);
        await step(page, 1.2);
        result = await playOutFight(page, 4);
        if (result.phase === 'victory') break;
      }
      assert.equal(result.phase, 'victory', id);
      assert.ok(['defeated', 'survived'].includes(result.outcome), `${id}: ${result.outcome}`);

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
        spawnBullet(soulHitPoints()[0].x, soulHitPoints()[0].y, 0, 0, 10);
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

test('Napstablook: cheering it up three times ends the fight', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'napstablook');
    const result = await page.evaluate(() => {
      const b = state.battle;
      const cheer = Napstablook.acts.find(a => a.name === 'Cheer');
      for (let i = 0; i < 3; i++) chooseAct(b, { kind: 'act', act: cheer });
      startEnemyTalk(b);
      startAttack(b);
      const attack = b.attack.attack.name;
      endAttack(b);
      return { attack, outcome: b.outcome };
    });
    assert.deepEqual(result, { attack: 'Dapper blook', outcome: 'spared' });
  } finally {
    await close();
  }
});

test('Mad Dummy: FIGHT fails, dodged scribbles hurt it, and it leaves after the robots, knife and rain', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'mad_dummy');
    await perfectFight(page);
    assert.equal(await page.evaluate(() => state.battle.fight.missed), true);
    await step(page, 1.2);

    const selfHit = await page.evaluate(() => {
      const b = state.battle;
      if (b.attack) endAttack(b);
      b.phase = 'menu';
      startEnemyTalk(b);
      startAttack(b);
      state.bullets = [];
      // a scribble flying straight up at Mad Dummy
      const at = MadDummy.pos;
      madShot(spawn({ kind: 'scribble', x: at.x, y: arena.y, vx: 0, vy: -300, r: 6 }));
      const before = b.bossHp;
      for (let i = 0; i < 60; i++) updateBullets(1 / 60);
      return before - b.bossHp;
    });
    assert.equal(selfHit, 1);

    await page.evaluate(() => { state.battle.bossHp = 0; });
    const result = await playOutFight(page, 12);
    assert.deepEqual(result, { phase: 'victory', outcome: 'survived' });
  } finally {
    await close();
  }
});

test('Muffet: the SOUL is purple and a Spider Donut makes her spare you', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'muffet');
    await startNextAttack(page);
    assert.equal(await page.evaluate(() => state.player.mode), 'purple');
    const result = await page.evaluate(() => {
      const b = state.battle;
      endAttack(b);
      const donut = b.inventory.find(s => s.id === 'spiderDonut');
      chooseItem(b, { stack: donut });
      b.phase = 'menu';
      trySpare(b);
      return b.outcome;
    });
    assert.equal(result, 'spared');
  } finally {
    await close();
  }
});

test('Muffet: during the pet attack the strings scroll down into its mouth', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'muffet');
    const result = await page.evaluate(() => {
      const b = state.battle;
      b.turn = MUFFET_PET_TURNS[0];
      startEnemyTalk(b);
      startAttack(b);
      state.player.hp = 999;
      const first = state.player.laneList[0];
      for (let i = 0; i < 18; i++) updateGame(1 / 60);
      const moved = state.player.laneList[0] > first;
      // keep going: the bottom string gets eaten and a new one appears on top
      const count = state.player.laneList.length;
      for (let i = 0; i < 120; i++) updateGame(1 / 60);
      return { attack: b.attack.attack.name, moved, sameCount: state.player.laneList.length === count, newTop: state.player.laneList[0] < first };
    });
    assert.deepEqual(result, { attack: 'Pet attack', moved: true, sameCount: true, newTop: true });
  } finally {
    await close();
  }
});

test('Mettaton EX: posing raises the ratings and 10000 ratings end the show', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'mettaton_ex');
    const result = await page.evaluate(() => {
      const b = state.battle;
      const pose = MettatonEx.acts.find(a => a.name === 'Pose');
      const before = b.flags.ratings;
      chooseAct(b, { kind: 'act', act: pose });
      const after = b.flags.ratings;
      b.flags.ratings = 9990;
      startEnemyTalk(b);
      startAttack(b);
      mttRatings(b, 50);
      endAttack(b);
      return { rose: after > before, outcome: b.outcome };
    });
    assert.deepEqual(result, { rose: true, outcome: 'survived' });
  } finally {
    await close();
  }
});

test('Asgore: MERCY is destroyed and a lethal hit leaves you at 1 HP', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'asgore');
    await page.evaluate(() => { state.battle.command = 3; });
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.battle.phase), 'menu');

    await startNextAttack(page);
    const hp = await page.evaluate(() => {
      const p = state.player;
      p.hp = 5;
      p.hurtCooldown = 0;
      spawn({ x: p.x, y: p.y, r: 10, damage: 99 });
      updateBullets(0);
      return { hp: p.hp, phase: state.battle.phase };
    });
    assert.deepEqual(hp, { hp: 1, phase: 'attack' });
  } finally {
    await close();
  }
});

test('Asriel: FIGHT misses, you cannot die, and STRUGGLE -> SAVE the lost souls -> SAVE him wins', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'asriel');
    await perfectFight(page);
    assert.equal(await page.evaluate(() => state.battle.fight.missed), true);
    await step(page, 1.2);

    const result = await page.evaluate(() => {
      const b = state.battle;
      if (b.attack) endAttack(b);
      // play through phase 1 up to Hyper Goner
      for (let i = 0; i < ASRIEL_PHASE1.length; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
      }
      const labels = [getCommands(b)[0].label];
      // press the single command until the fight ends
      for (let i = 0; i < 40 && !b.outcome; i++) {
        b.phase = 'menu';
        getCommands(b)[0].run(b);
        labels.push(getCommands(b)[0].label);
        if (b.outcome) break;
        afterPlayerAction(b);
        if (b.phase === 'enemyTalk') startAttack(b);
        if (b.phase === 'attack') endAttack(b);
      }
      return { first: labels[0], sawSave: labels.includes('SAVE'), outcome: b.outcome };
    });
    assert.deepEqual(result, { first: 'STRUGGLE', sawSave: true, outcome: 'spared' });
  } finally {
    await close();
  }
});

test('Undyne the Undying: at 0 HP she keeps fighting with slower spears, then melts', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'undyne_undying');
    const result = await page.evaluate(() => {
      const b = state.battle;
      b.bossHp = 0;
      const paces = [];
      for (let i = 0; i < 6 && !b.outcome; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        paces.push(b.attack.data.pace);
        endAttack(b);
      }
      return { outcome: b.outcome, slower: paces[2] < paces[0], turns: paces.length };
    });
    assert.deepEqual(result, { outcome: 'defeated', slower: true, turns: 3 });
  } finally {
    await close();
  }
});

test('Lancer: his bike runs out of fuel after four turns', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'lancer');
    const result = await playOutFight(page, 10);
    assert.deepEqual(result, { phase: 'victory', outcome: 'survived' });
    assert.equal(await page.evaluate(() => state.battle.turn), 4);
  } finally {
    await close();
  }
});

test('K. Round: bowing loosens the crown until it falls off; it heals when hurt', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'k_round');
    const result = await page.evaluate(() => {
      const b = state.battle;
      b.bossHp = 900;
      KRound.onDamaged(b);
      startEnemyTalk(b);
      const heal = b.nextAttack.name;
      startAttack(b);
      const healed = b.bossHp > 900;
      endAttack(b);
      const bow = KRound.acts.find(a => a.name === 'Bow');
      for (let i = 0; i < 7; i++) chooseAct(b, { kind: 'act', act: bow });
      startEnemyTalk(b);
      startAttack(b);
      endAttack(b);
      return { heal, healed, outcome: b.outcome };
    });
    assert.deepEqual(result, { heal: 'Self-care', healed: true, outcome: 'spared' });
  } finally {
    await close();
  }
});

test('King: the scripted 15 turns end the fight', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'king');
    const result = await playOutFight(page, 20);
    assert.deepEqual(result, { phase: 'victory', outcome: 'survived' });
    assert.equal(await page.evaluate(() => state.battle.turn), 15);
  } finally {
    await close();
  }
});

test('Berdly: Bump raises MERCY, and he can be spared once TIRED at half HP', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'berdly');
    const result = await page.evaluate(() => {
      const b = state.battle;
      trySpare(b);
      const early = b.outcome;
      b.phase = 'menu';
      b.bossHp = b.boss.maxHp / 2;
      trySpare(b);
      return { early, outcome: b.outcome };
    });
    assert.deepEqual(result, { early: null, outcome: 'spared' });
  } finally {
    await close();
  }
});

test('Spamton: only the right answers to his DEAL let you spare him', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'spamton');
    const result = await page.evaluate(() => {
      const b = state.battle;
      const pickAct = name => Spamton.acts.find(a => a.name === name);
      // a wrong answer doesn't advance
      chooseAct(b, { kind: 'act', act: pickAct(SPAMTON_WRONG[0]) });
      const afterWrong = b.flags.deal;
      for (const answer of SPAMTON_DEAL) {
        b.phase = 'menu';
        chooseAct(b, { kind: 'act', act: pickAct(answer) });
      }
      b.phase = 'menu';
      trySpare(b);
      return { afterWrong, deal: b.flags.deal, outcome: b.outcome };
    });
    assert.deepEqual(result, { afterWrong: 0, deal: 6, outcome: 'spared' });
  } finally {
    await close();
  }
});

test('Queen: her acid shield blocks FIGHT until it is toasted away; loosening the cable frees Berdly', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'queen');
    const shield = await page.evaluate(() => {
      const b = state.battle;
      b.bossHp = b.boss.maxHp * 0.7;
      startEnemyTalk(b);
      const attack = b.nextAttack.name;
      startAttack(b);
      endAttack(b);
      return { attack, shield: b.flags.shield };
    });
    assert.equal(shield.attack, 'Wine');
    assert.ok(shield.shield > 0);

    await perfectFight(page);
    assert.equal(await page.evaluate(() => state.battle.fight.missed), true);

    const result = await page.evaluate(() => {
      const b = state.battle;
      b.phase = 'menu';
      while (b.flags.shield > 0) chooseAct(b, { kind: 'act', act: Queen.acts.find(a => a.name === 'Toast') });
      for (let i = 0; i < 10; i++) chooseAct(b, { kind: 'act', act: Queen.acts.find(a => a.name === 'Loosen') });
      b.phase = 'menu';
      trySpare(b);
      return b.outcome;
    });
    assert.equal(result, 'spared');
  } finally {
    await close();
  }
});

test('Rouxls Kaard: owning more houses when the board fills up wins the house game', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'rouxls_kaard');
    const result = await page.evaluate(() => {
      const b = state.battle;
      const take3 = RouxlsKaard.acts.find(a => a.name === 'TakeHouse3');
      for (let i = 0; i < 20 && !b.outcome; i++) {
        b.phase = 'menu';
        b.tp = 100;
        chooseAct(b, { kind: 'act', act: take3 });
        if (b.outcome) break;
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
      }
      return { outcome: b.outcome, mine: b.flags.mine, his: b.flags.his };
    });
    assert.equal(result.outcome, 'spared');
    assert.equal(result.mine + result.his, 25);
  } finally {
    await close();
  }
});

test('Tenna: 1000 points start the FINAL EPISODE, and shooting his head wins peacefully', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'tenna');
    const result = await page.evaluate(() => {
      const b = state.battle;
      const love = Tenna.acts.find(a => a.name === 'ILoveTV');
      chooseAct(b, { kind: 'act', act: love });
      const afterAct = b.flags.points;
      b.flags.points = TENNA_GOAL;
      const names = [];
      for (let i = 0; i < 3; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        names.push(b.attack.attack.name);
        if (i < 2) endAttack(b);
      }
      // DEFEAT TENNA: destroy the head
      const head = state.bullets.find(x => x.kind === 'tvHead');
      head.shootHp = 0;
      head.dead = true;
      head.onDestroyed(head);
      return { afterAct, names, outcome: b.outcome };
    });
    assert.ok(result.afterAct > 0);
    assert.deepEqual(result.names, ['Minigame: Dodge Fire', 'Minigame: Shoot the Targets', 'DEFEAT TENNA']);
    assert.equal(result.outcome, 'spared');
  } finally {
    await close();
  }
});

test('Roaring Knight: below 80 % it charges and ROARS, and only then can it be finished', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'knight');
    const result = await page.evaluate(() => {
      const b = state.battle;
      b.bossHp = 1;
      Knight.onDamaged(b, 1);
      const survived = b.bossHp >= 1;
      const names = [];
      for (let i = 0; i < 3; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        names.push(b.attack.attack.name);
        endAttack(b);
      }
      return { survived, names, stage: b.flags.roarStage };
    });
    assert.deepEqual(result, { survived: true, names: ['Rotating slash (charged)', 'Charging', 'ROARING'], stage: 3 });
    await perfectFight(page);
    await step(page, 1.2);
    assert.equal(await page.evaluate(() => state.battle.outcome), 'defeated');
  } finally {
    await close();
  }
});

test('Titan: white bullets in the SOUL\'s light become TP; at half HP the old man joins and Susie\'s Idea ends it', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'titan');
    const purified = await page.evaluate(() => {
      const b = state.battle;
      startEnemyTalk(b);
      startAttack(b);
      state.bullets = [];
      const p = state.player;
      const white = titanPurifiable({ kind: 'normal', x: p.x + 20, y: p.y, r: 5 });
      const tp = b.tp;
      titanPurify(b.attack);
      endAttack(b);
      return { gone: white.dead === true, tp: b.tp > tp };
    });
    assert.deepEqual(purified, { gone: true, tp: true });

    const result = await page.evaluate(() => {
      const b = state.battle;
      b.bossHp = b.boss.maxHp / 2;
      Titan.onDamaged(b, 0);
      for (let i = 0; i < 6; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
      }
      const acts = () => Titan.acts.map(a => a.name);
      const first = acts();
      for (let i = 0; i < 2; i++) chooseAct(b, { kind: 'act', act: Titan.acts[0] });
      const later = acts();
      b.phase = 'menu';
      chooseAct(b, { kind: 'act', act: Titan.acts[0] });
      return { first, later, outcome: b.outcome };
    });
    assert.deepEqual(result, { first: ['DualBuster'], later: ['Susie\'s Idea'], outcome: 'defeated' });
  } finally {
    await close();
  }
});

test('Omega Flowey: calling the six SOULs for help, then his HP runs out and MERCY spares him', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'omega_flowey');
    const result = await page.evaluate(() => {
      const b = state.battle;
      const souls = [];
      for (let i = 0; i < 40 && b.flags.saved.length < 6; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
        const act = getCommands(b).find(c => c.id === 'act');
        if (act) {
          souls.push(b.flags.soulNow.id);
          b.phase = 'menu';
          act.run(b);
        }
      }
      b.bossHp = 1;
      OmegaFlowey.onDamaged(b, 1);
      for (let i = 0; i < 5 && !b.flags.choice; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
      }
      const commands = getCommands(b).map(c => c.id);
      b.phase = 'menu';
      trySpare(b);
      return { souls, commands, outcome: b.outcome };
    });
    assert.deepEqual(result.souls, ['cyan', 'orange', 'blue', 'purple', 'green', 'yellow']);
    assert.deepEqual(result.commands, ['fight', 'mercy']);
    assert.equal(result.outcome, 'spared');
  } finally {
    await close();
  }
});

test('Undertale minibosses: each one can be spared its own way', async () => {
  const { page, close } = await openGame();
  try {
    const plans = {
      doggo: ['@turn', 'Pet'],
      dogamy_dogaressa: ['Roll Around', 'Re-sniff', 'Pet'],
      greater_dog: ['Beckon', 'Pet', 'Play', 'Pet', 'Pet'],
      shyren: ['Hum'],
      royal_guards: ['Clean Armor', 'Clean Armor', 'Clean Armor', 'Clean Armor', 'Clean Armor', 'Whisper'],
      glyde: ['Applaud', 'Applaud', 'Nothing', 'Nothing', 'Nothing'],
      glad_dummy: []
    };
    for (const [id, plan] of Object.entries(plans)) {
      await startMode(page, 'battle', id);
      const outcome = await page.evaluate(plan => {
        const b = state.battle;
        for (const step of plan) {
          if (b.outcome) break;
          b.phase = 'menu';
          if (step === '@turn') {
            startEnemyTalk(b);
            startAttack(b);
            endAttack(b);
            continue;
          }
          const act = b.boss.acts.find(a => a.name === step);
          chooseAct(b, { kind: 'act', act });
        }
        if (!b.outcome) {
          b.phase = 'menu';
          trySpare(b);
        }
        return b.outcome;
      }, plan);
      assert.equal(outcome, 'spared', id);
    }
  } finally {
    await close();
  }
});

test('the Stick ends any Snowdin dog fight with a game of fetch', async () => {
  const { page, close } = await openGame();
  try {
    for (const id of ['doggo', 'dogamy_dogaressa', 'greater_dog']) {
      await startMode(page, 'battle', id);
      const outcome = await page.evaluate(() => {
        const b = state.battle;
        chooseItem(b, { stack: b.inventory.find(s => s.id === 'stick') });
        b.phase = 'menu';
        trySpare(b);
        return b.outcome;
      });
      assert.equal(outcome, 'spared', id);
    }
  } finally {
    await close();
  }
});

test('So Sorry: eleven hits or ten peaceful turns end the fight', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'so_sorry');
    const result = await playOutFight(page, 14);
    assert.deepEqual(result, { phase: 'victory', outcome: 'survived' });
  } finally {
    await close();
  }
});

test('Mad Mew Mew: split SOUL halves move separately and colored circles let the matching half through', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'mad_mew_mew');
    await startNextAttack(page);
    assert.equal(await page.evaluate(() => state.player.mode), 'split');
    await press(page, 'a');
    await press(page, 'ArrowRight');
    const slots = await page.evaluate(() => state.player.halves.map(h => h.slot));
    assert.deepEqual(slots, [0, 2]);

    const pass = await page.evaluate(() => {
      state.bullets = [];
      const p = state.player;
      const [red, blue] = p.halves;
      p.hurtCooldown = 0;
      const before = p.hp;
      spawn({ x: red.x, y: red.y, r: 8, passColor: 'red' });
      updateBullets(0);
      const redPassed = p.hp === before;
      state.bullets = [];
      p.hurtCooldown = 0;
      spawn({ x: blue.x, y: blue.y, r: 8, passColor: 'red' });
      updateBullets(0);
      return { redPassed, blueHit: p.hp < before };
    });
    assert.deepEqual(pass, { redPassed: true, blueHit: true });

    const outcome = await page.evaluate(() => {
      const b = state.battle;
      for (let i = 0; i < 8; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
      }
      b.phase = 'menu';
      chooseAct(b, { kind: 'act', act: MadMewMew.acts[0] });
      b.phase = 'menu';
      trySpare(b);
      return b.outcome;
    });
    assert.equal(outcome, 'spared');
  } finally {
    await close();
  }
});

test('Sweet Cap\'n Cakes: dancing all three band members ends the battle', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'sweet_cap_cakes');
    const outcome = await page.evaluate(() => {
      const b = state.battle;
      const dance = SweetCapnCakes.acts.find(a => a.name === 'Dance');
      for (let i = 0; i < 12 && !b.outcome; i++) {
        b.phase = 'menu';
        chooseAct(b, { kind: 'act', act: dance });
        if (b.outcome) break;
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
      }
      return b.outcome;
    });
    assert.equal(outcome, 'spared');
  } finally {
    await close();
  }
});

test('Lanino & Elnina: after "I love TV" they ask for a favorite, and the show ends a few turns later', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'lanino_elnina');
    const result = await page.evaluate(() => {
      const b = state.battle;
      chooseAct(b, { kind: 'act', act: LaninoElnina.acts.find(a => a.name === 'ILoveTV') });
      for (let i = 0; i < 3; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
      }
      const asking = b.flags.asking;
      chooseAct(b, { kind: 'act', act: LaninoElnina.acts.find(a => a.name === 'Elnina') });
      for (let i = 0; i < 4 && !b.outcome; i++) {
        b.phase = 'menu';
        startEnemyTalk(b);
        startAttack(b);
        endAttack(b);
      }
      return { asking, outcome: b.outcome };
    });
    assert.deepEqual(result, { asking: true, outcome: 'spared' });
  } finally {
    await close();
  }
});

test('Shuttah: a good group photo at 80 % MERCY ends the battle', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'shuttah');
    await page.evaluate(() => {
      const b = state.battle;
      b.mercy = 80;
      chooseAct(b, { kind: 'act', act: Shuttah.acts[0] });
      startEnemyTalk(b);
      startAttack(b);
      // put the viewfinder right on the subject
      const subject = state.bullets.find(x => x.kind === 'suit');
      subject.update(subject, 0);
      state.player.x = subject.x;
      state.player.y = subject.y;
    });
    await page.keyboard.press('z');
    await page.evaluate(() => {
      const b = state.battle;
      const s = b.attack.data.subject;
      state.player.x = s.x;
      state.player.y = s.y;
      // run the photo check exactly once
      b.attack.attack.update(b.attack, 1 / 60);
    });
    assert.equal(await page.evaluate(() => state.battle.outcome), 'spared');
  } finally {
    await close();
  }
});

test('Jackenstein: the maze walls block the SOUL, the key opens the exit, and Unleash x3 spares him', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'jackenstein');
    const maze = await page.evaluate(() => {
      const b = state.battle;
      startEnemyTalk(b);
      startAttack(b);
      const p = state.player;
      const walls = state.bullets.filter(x => x.solid);
      const blocked = (x, y) => walls.some(w => Math.abs(x - w.x) < w.hw - 1 && Math.abs(y - w.y) < w.hh - 1);
      // a wall with an open cell on its left; step from that cell most of the way into the wall
      const wall = walls.find(w => w.x - w.hw * 2 > arena.x && !blocked(w.x - w.hw * 2, w.y));
      p.x = wall.x - wall.hw * 2;
      p.y = wall.y;
      p.x += wall.hw * 1.2;
      pushOutOfWalls(p, 'x');
      const pushed = p.x + p.r <= wall.x - wall.hw + 0.01;
      const key = b.attack.data.key;
      p.x = key.x;
      p.y = key.y;
      b.attack.attack.update(b.attack, 1 / 60);
      const exit = b.attack.data.exit;
      p.x = exit.x;
      p.y = exit.y;
      b.attack.attack.update(b.attack, 1 / 60);
      return { pushed, hasKey: b.attack.data.hasKey, done: b.attack.done };
    });
    assert.deepEqual(maze, { pushed: true, hasKey: true, done: true });

    const outcome = await page.evaluate(() => {
      const b = state.battle;
      endAttack(b);
      const unleash = Jackenstein.acts.find(a => a.name === 'Unleash');
      for (let i = 0; i < 3; i++) {
        b.tp = 100;
        chooseAct(b, { kind: 'act', act: unleash });
      }
      b.phase = 'menu';
      trySpare(b);
      return b.outcome;
    });
    assert.equal(outcome, 'spared');
  } finally {
    await close();
  }
});

test('Sound of Justice: green arrows, then hammer strikes; it ends on its own after nine attacks', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'sound_of_justice');
    await startNextAttack(page);
    assert.equal(await page.evaluate(() => state.player.mode), 'green');
    const result = await playOutFight(page, 12);
    assert.deepEqual(result, { phase: 'victory', outcome: 'survived' });
  } finally {
    await close();
  }
});

test('GIGA Queen: punching while she is open hurts her, and the final baseball ends round 3', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'giga_queen');
    await startNextAttack(page);
    const punched = await page.evaluate(() => {
      const b = state.battle;
      const run = b.attack;
      run.data.open = run.t + 1;
      const before = b.bossHp;
      pressedKeys.add('z');
      gigaPunch(run);
      return before - b.bossHp;
    });
    assert.ok(punched > 0);

    const outcome = await page.evaluate(() => {
      const b = state.battle;
      endAttack(b);
      b.flags.round = 2;
      b.bossHp = 1;
      b.phase = 'menu';
      startEnemyTalk(b);
      startAttack(b);
      const ball = b.attack.data.ball;
      state.player.x = ball.x;
      state.player.y = ball.y + 20;
      pressedKeys.add('z');
      ball.update(ball, 1 / 60);
      return { name: b.attack.attack.name, outcome: b.outcome };
    });
    assert.deepEqual(outcome, { name: 'Final baseball', outcome: 'defeated' });
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------- menus & UI

test('boss select: arrow keys and Z start the chosen boss, unfinished bosses do not start', async () => {
  const { page, close } = await openGame();
  try {
    await page.focus('#game');
    await page.evaluate(() => openBossSelect());
    // find an unfinished boss right after a playable one in the same tab
    let pair = await page.evaluate(() => {
      for (let tab = 0; tab < ROSTER.length; tab++) {
        const rows = menuBossRows(tab).map(r => r.row.entry.id);
        for (let i = 1; i < rows.length; i++) {
          if (isPlayable(rows[i - 1]) && !isPlayable(rows[i])) return { playable: rows[i - 1], missing: rows[i] };
        }
      }
      return null;
    });
    if (!pair) {
      // the whole roster is playable: register a fake unfinished entry right after the first boss
      pair = await page.evaluate(() => {
        const group = ROSTER[0].groups[0];
        const playable = group.bosses[0].id;
        group.bosses.splice(1, 0, { id: 'test_unfinished', name: 'Unfinished' });
        return { playable, missing: 'test_unfinished' };
      });
    }
    await page.evaluate(id => focusBossInMenu(id), pair.playable);
    await press(page, 'ArrowDown'); // the unfinished boss
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.screen), 'select');
    await press(page, 'ArrowUp'); // back to the playable one
    await press(page, 'z');
    assert.deepEqual(await page.evaluate(() => [state.screen, state.mode]), ['fight', pair.playable]);
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
    await page.evaluate(() => openBossSelect());
    assert.equal(await page.evaluate(() => gersonMusic.paused && currentMusic === songMusic('menu')), true);
    await startMode(page, 'battle', 'jevil');
    assert.equal(await page.evaluate(() => gersonMusic.paused && currentMusic === songMusic('jevil')), true);
  } finally {
    await close();
  }
});

test('game keys do not scroll the page while playing', async () => {
  const { page, close } = await openGame({ manualLoop: false });
  try {
    await page.evaluate(() => { selection.mode = 'survival'; selection.boss = 'dummy'; startGame(); });
    await page.focus('#game');
    await page.keyboard.down('ArrowDown');
    // with margin: a slow machine runs fewer frames per second (dt is capped at 33 ms)
    await page.waitForTimeout(900);
    await page.keyboard.up('ArrowDown');
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);

    const result = await page.evaluate(() => ({ scrollY: window.scrollY, timer: state.timer }));
    assert.equal(result.scrollY, 0);
    assert.ok(result.timer > 0.35, `timer ${result.timer}`);
  } finally {
    await close();
  }
});

test('pause freezes the fight, Esc resumes it and the pause menu quits to the boss select', async () => {
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

    // X resumes too
    await press(page, 'Escape');
    await press(page, 'x');
    assert.equal(await page.evaluate(() => state.paused), false);

    // Resume, Retry, Settings, Boss select
    await press(page, 'Escape');
    for (let i = 0; i < 3; i++) await press(page, 'ArrowDown');
    await press(page, 'z');
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
    await page.evaluate(() => { selection.mode = 'survival'; openBossSelect('dummy'); });

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

test('title screen: BOSS RUSH and SURVIVAL pick the mode, X goes back from the boss select', async () => {
  const { page, close } = await openGame();
  try {
    await page.focus('#game');
    assert.equal(await page.evaluate(() => state.screen), 'title');
    await press(page, 'ArrowDown'); // SURVIVAL
    await press(page, 'z');
    assert.deepEqual(await page.evaluate(() => [state.screen, selection.mode]), ['select', 'survival']);
    await press(page, 'x');
    assert.equal(await page.evaluate(() => state.screen), 'title');
    await press(page, 'ArrowUp'); // BOSS RUSH
    await press(page, 'z');
    await page.evaluate(() => focusBossInMenu('dummy'));
    await press(page, 'z');
    assert.deepEqual(await page.evaluate(() => [state.screen, state.gameMode, state.mode]), ['fight', 'battle', 'dummy']);
  } finally {
    await close();
  }
});

test('settings: volume, sound and shake can be changed and are saved; the pause menu opens them too', async () => {
  const { page, close } = await openGame();
  try {
    await page.focus('#game');
    await press(page, 'ArrowUp'); // SETTINGS (wraps around)
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.screen), 'settings');
    const before = await page.evaluate(() => settings.musicVolume);
    await press(page, 'ArrowLeft');
    await press(page, 'ArrowDown'); // sound effects
    await press(page, 'ArrowRight');
    await press(page, 'ArrowDown'); // sound on/off
    await press(page, 'ArrowDown'); // screen shake
    await press(page, 'z');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('deltatale_settings')));
    assert.equal(saved.musicVolume, before - 1);
    assert.equal(saved.shake, false);
    await press(page, 'x');
    assert.equal(await page.evaluate(() => state.screen), 'title');

    await startMode(page, 'battle', 'dummy');
    await press(page, 'Escape');
    await press(page, 'ArrowDown');
    await press(page, 'ArrowDown'); // Settings
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.screen), 'settings');
    await press(page, 'x');
    assert.deepEqual(await page.evaluate(() => [state.screen, state.paused]), ['fight', true]);
  } finally {
    await close();
  }
});

test('music: every boss has an original song, every song compiles, and the sequencer plays it', async () => {
  const { page, errors, close } = await openGame();
  try {
    const report = await page.evaluate(() => {
      const missing = Object.values(BOSSES).filter(b => !getBossMusic(b)).map(b => b.id);
      const songs = Object.entries(SONGS).map(([id, spec]) => {
        const c = compileSong(spec);
        const notes = c.steps.flat().filter(Boolean);
        return { id, ok: c.length > 0 && notes.some(n => n.ch === 'lead') && notes.every(n => Number.isFinite(n.midi)) };
      });
      return { missing, bad: songs.filter(s => !s.ok).map(s => s.id) };
    });
    assert.deepEqual(report, { missing: [], bad: [] });

    await startMode(page, 'battle', 'sans');
    await step(page, 0.5);
    assert.equal(await page.evaluate(() => music.playing && music.song === SONGS.sans), true);
    await press(page, 'Escape');
    assert.equal(await page.evaluate(() => music.playing), false);
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('the canvas fills the window at 16:9', async () => {
  const { page, close } = await openGame();
  try {
    const size = await page.evaluate(() => {
      const r = canvas.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight };
    });
    assert.ok(size.w === size.vw || size.h === size.vh, JSON.stringify(size));
    assert.ok(Math.abs(size.w / size.h - 16 / 9) < 0.01, JSON.stringify(size));
  } finally {
    await close();
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
