// Automatické testy hry v headless Chromiu (Playwright).
// Spuštění: npm install && npx playwright install chromium && npm test
//
// Většina testů vypne vlastní herní smyčku (requestAnimationFrame) a krokuje hru ručně
// přes updateGame(dt), takže výsledky nezávisí na rychlosti stroje.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('./server');

const BOSS_IDS = ['gerson', 'dummy', 'bones', 'cards', 'neo'];
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

// Otevře hru v čistém kontextu (vlastní localStorage). manualLoop = hru krokují testy.
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

// Simuluje `seconds` sekund hry po snímcích, včetně kreslení (odhalí chyby v renderu).
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
  await page.selectOption('#bossSelect', boss);
  await page.evaluate(() => startGame());
  // stejně jako tlačítko Start: fokus na plátno
  await page.focus('#game');
  await step(page);
}

// Dopíše text v boxu a pokračuje dál.
async function advanceText(page) {
  await press(page, 'z');
  await press(page, 'z');
}

test('the page loads, every asset loads and the real game loop runs without errors', async () => {
  const { page, errors, close } = await openGame({ manualLoop: false });
  try {
    await page.waitForTimeout(400);
    const assets = await page.evaluate(() =>
      [susieSprite, soulRedSprite, gersonSheet, axe01Sprite].map(img => img.complete && img.naturalWidth > 0)
    );
    assert.deepEqual(assets, [true, true, true, true]);

    await page.click('#startBtn');
    await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => state.running), true);
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('every boss in the select is registered and has complete battle data', async () => {
  const { page, close } = await openGame();
  try {
    const report = await page.evaluate(() => {
      const options = [...bossSelect.options].map(o => o.value);
      return options.map(id => {
        const boss = getBoss(id);
        if (!boss) return { id, missing: true };
        return {
          id,
          name: boss.name === bossSelect.querySelector(`option[value="${id}"]`).textContent,
          survival: typeof boss.init === 'function' && typeof boss.update === 'function',
          draw: typeof boss.draw === 'function',
          stats: boss.maxHp > 0 && boss.attack > 0 && boss.defense >= 0,
          texts: Boolean(boss.intro && boss.check && boss.flavor.length && boss.dialogue.length),
          acts: boss.acts.length > 0 && boss.acts.every(a => a.name && a.mercy > 0 && a.text),
          attacks: boss.attacks.length > 0 &&
            boss.attacks.every(a => a.duration > 0 && typeof a.update === 'function')
        };
      });
    });

    assert.deepEqual(report.map(r => r.id).sort(), [...BOSS_IDS].sort());
    for (const r of report) {
      assert.deepEqual(r, {
        id: r.id, name: true, survival: true, draw: true, stats: true, texts: true, acts: true, attacks: true
      });
    }
  } finally {
    await close();
  }
});

test('all battle texts fit into the text box and speech bubble', async () => {
  const { page, close } = await openGame();
  try {
    const tooLong = await page.evaluate(() => {
      const boxWidth = TEXT_BOX.w - TEXT_PADDING * 2;
      const bubbleWidth = BUBBLE.w - 24;
      const problems = [];
      const check = (text, width, font, maxLines, where) => {
        const lines = wrapText(text, width, font);
        if (lines.length > maxLines) problems.push(`${where}: ${lines.length} řádků`);
      };

      for (const boss of Object.values(BOSSES)) {
        const boxTexts = [
          boss.intro,
          `* ${boss.name.toUpperCase()} - ÚT ${boss.attack} OBR ${boss.defense}\n* ${boss.check}`,
          `* ${boss.name} už nechce bojovat.`,
          ...boss.flavor,
          ...(boss.lowHpFlavor ? [boss.lowHpFlavor] : []),
          ...boss.acts.flatMap(a => [a.text, a.repeatText].filter(Boolean))
        ];
        boxTexts.forEach((t, i) => check(t, boxWidth, TEXT_FONT, 4, `${boss.id} box #${i}`));
        boss.dialogue.forEach((t, i) => check(t, bubbleWidth, BUBBLE_FONT, 4, `${boss.id} bublina #${i}`));
      }
      for (const [id, item] of Object.entries(ITEMS)) {
        check(`${item.text}\n* Obnoveno 99 HP.`, boxWidth, TEXT_FONT, 4, `item ${id}`);
      }
      return problems;
    });

    assert.deepEqual(tooLong, []);
  } finally {
    await close();
  }
});

test('survival: every boss spawns its bullets and a hit costs exactly 1 HP', async () => {
  const { page, errors, close } = await openGame();
  try {
    const expectedKinds = { gerson: 'axe01', dummy: 'normal', bones: 'bone', cards: 'card', neo: 'blaster' };
    for (const id of BOSS_IDS) {
      await startMode(page, 'survival', id);
      await step(page, 1.5);
      const kinds = await page.evaluate(() => [...new Set(state.bullets.map(b => b.kind))]);
      assert.deepEqual(kinds, [expectedKinds[id]], `druhy střel u ${id}`);

      const hp = await page.evaluate(() => {
        state.bullets = [];
        state.player.hurtCooldown = 0;
        const before = state.player.hp;
        spawnBullet(state.player.x, state.player.y, 0, 0, 10);
        updateBullets(0);
        return [before, state.player.hp];
      });
      assert.equal(hp[0] - hp[1], 1, `poškození v přežití u ${id}`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('survival: Training Dummy bullets are actually visible on the canvas', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'survival', 'dummy');
    const pixel = await page.evaluate(() => {
      state.bullets = [];
      const x = arena.x + 40;
      const y = arena.y + 40;
      spawnBullet(x, y, 0, 0, 9);
      render();
      return [...ctx.getImageData(x, y, 1, 1).data];
    });
    // pozadí arény je #0d0d0d - střela musí být výrazně světlejší
    assert.ok(pixel[0] > 200 && pixel[1] > 200 && pixel[2] > 200, `pixel ${pixel}`);
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
    assert.ok(result.stored >= 1, `uložený čas ${result.stored}`);

    // Z po krátké pauze spustí novou hru
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
    await page.selectOption('#bossSelect', 'cards');
    assert.equal(await page.evaluate(() => gersonMusic.paused && currentMusic === null), true);
  } finally {
    await close();
  }
});

test('game keys do not scroll the page or re-click the Start button while playing', async () => {
  const { page, close } = await openGame({ manualLoop: false });
  try {
    await page.selectOption('#modeSelect', 'survival');
    await page.click('#startBtn');
    await page.keyboard.down('ArrowDown');
    // s rezervou: na pomalém stroji běží hra méně snímky za sekundu (dt je omezené na 33 ms)
    await page.waitForTimeout(900);
    await page.keyboard.up('ArrowDown');

    // hráč, který se k tlačítku dostal Tabem, nesmí mezerníkem restartovat hru
    await page.focus('#startBtn');
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);

    const result = await page.evaluate(() => ({ scrollY: window.scrollY, timer: state.timer }));
    assert.equal(result.scrollY, 0);
    // kdyby mezerník/Enter znovu stiskl Start, časovač by se vynuloval
    assert.ok(result.timer > 0.35, `timer ${result.timer}`);
  } finally {
    await close();
  }
});

test('battle: FIGHT with a centred hit damages the boss', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'gerson');
    await press(page, 'z'); // ÚTOK
    assert.equal(await page.evaluate(() => state.battle.phase), 'fight');

    // počkat, až bude kurzor uprostřed terče, a udeřit
    await step(page, await page.evaluate(() => FIGHT_BAR_TIME / 2));
    await press(page, 'z');
    const afterHit = await page.evaluate(() => ({
      phase: state.battle.phase,
      bossHp: state.battle.bossHp,
      perfect: state.battle.fight.perfect
    }));
    assert.equal(afterHit.phase, 'fightResult');
    assert.ok(afterHit.bossHp < 400 - 30, `boss HP ${afterHit.bossHp}`);
    assert.equal(afterHit.perfect, true);

    await step(page, 1.2);
    assert.equal(await page.evaluate(() => state.battle.phase), 'enemyTalk');
  } finally {
    await close();
  }
});

test('battle: ACT raises mercy, SPARE fails before 100 % and wins after', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'dummy');

    // SPARE hned na začátku nevyjde
    await press(page, 'ArrowLeft');
    await press(page, 'ArrowLeft'); // UŠETŘIT (3)
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.battle.phase), 'result');
    assert.match(await page.evaluate(() => state.battle.typer.text), /ŽLUTÉ/);

    // AKCE > Promluvit dvakrát (+50 % a +50 %), mezi tím proběhne útok
    for (let round = 0; round < 2; round++) {
      await page.evaluate(() => {
        // přeskočit na začátek dalšího tahu hráče
        const b = state.battle;
        if (b.phase !== 'menu') {
          b.bubble = null;
          endAttack(b);
        }
      });
      await page.evaluate(() => { state.battle.command = 1; });
      await press(page, 'z');                 // AKCE
      await press(page, 'ArrowRight');        // Promluvit
      await press(page, 'z');
    }

    const mercy = await page.evaluate(() => ({ mercy: state.battle.mercy, spareable: isSpareable(state.battle) }));
    assert.deepEqual(mercy, { mercy: 100, spareable: true });

    await page.evaluate(() => {
      endAttack(state.battle);
      state.battle.command = 3;
    });
    await press(page, 'z');

    const result = await page.evaluate(() => ({
      phase: state.battle.phase,
      outcome: state.battle.outcome,
      record: JSON.parse(localStorage.getItem('deltatale_records')).dummy,
      typerLines: state.battle.typer.lines.length
    }));
    assert.equal(result.phase, 'victory');
    assert.equal(result.outcome, 'spared');
    assert.equal(result.record.spared, 1);
    assert.ok(result.typerLines <= 4);

    // po vítězství se Z vrátí do klidového stavu
    await step(page, 3);
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.battle), null);
  } finally {
    await close();
  }
});

test('battle: ITEM heals Susie and uses up the item', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'bones');
    await page.evaluate(() => { state.player.hp = 5; state.battle.command = 2; });
    await press(page, 'z'); // VĚCI
    assert.equal(await page.evaluate(() => state.battle.phase), 'itemList');
    await press(page, 'z'); // Tmavá cukrovinka (+8)

    const result = await page.evaluate(() => ({
      hp: state.player.hp,
      candies: state.battle.inventory.find(s => s.id === 'darkCandy').count,
      phase: state.battle.phase
    }));
    assert.deepEqual(result, { hp: 13, candies: 1, phase: 'result' });
  } finally {
    await close();
  }
});

test('battle: X backs out of a submenu without spending the turn', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'cards');
    await page.evaluate(() => { state.battle.command = 1; });
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.battle.phase), 'actList');
    await press(page, 'x');
    assert.deepEqual(
      await page.evaluate(() => ({ phase: state.battle.phase, turn: state.battle.turn })),
      { phase: 'menu', turn: 0 }
    );
  } finally {
    await close();
  }
});

test('battle: DEFEND halves the damage of the next attack and grants TP', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'gerson');
    await page.evaluate(() => { state.battle.command = 4; });
    await press(page, 'z'); // OBRANA
    await advanceText(page);
    await step(page, 0.4);   // box se zmenší na arénu
    await advanceText(page); // replika -> útok

    const result = await page.evaluate(() => {
      state.bullets = [];
      state.player.hurtCooldown = 0;
      const before = state.player.hp;
      spawnBullet(state.player.x, state.player.y, 0, 0, 10);
      updateBullets(0);
      return { phase: state.battle.phase, lost: before - state.player.hp, tp: state.battle.tp };
    });
    assert.equal(result.phase, 'attack');
    assert.equal(result.lost, Math.ceil(4 / 2));
    assert.ok(result.tp >= 16);
  } finally {
    await close();
  }
});

test('battle: every attack of every boss runs to completion and returns to the menu', async () => {
  const { page, errors, close } = await openGame();
  try {
    for (const id of BOSS_IDS) {
      await startMode(page, 'battle', id);
      const count = await page.evaluate(() => state.battle.boss.attacks.length);

      for (let i = 0; i < count; i++) {
        const result = await page.evaluate(({ i, frame }) => {
          const b = state.battle;
          b.turn = i;
          startEnemyTalk(b);
          startAttack(b);
          state.player.hp = 9999; // nesmrtelnost, ať útok doběhne celý
          let maxBullets = 0;
          let frames = 0;
          while (b.phase === 'attack' && frames < 60 * 30) {
            updateGame(frame);
            render();
            endInputFrame();
            maxBullets = Math.max(maxBullets, state.bullets.length);
            frames++;
          }
          return { phase: b.phase, maxBullets, seconds: frames * frame };
        }, { i, frame: FRAME });

        const label = `${id} útok #${i}`;
        assert.equal(result.phase, 'menu', label);
        assert.ok(result.maxBullets > 0, `${label} nevystřelil`);
        assert.ok(result.seconds < 15, `${label} trval ${result.seconds} s`);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test('battle: running out of HP shows GAME OVER and Z retries the fight', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'battle', 'neo');
    await page.evaluate(() => {
      const b = state.battle;
      startEnemyTalk(b);
      startAttack(b);
      state.player.hp = 1;
      spawnBullet(state.player.x, state.player.y, 0, 0, 10);
    });
    await step(page);
    assert.deepEqual(
      await page.evaluate(() => ({ phase: state.battle.phase, over: state.gameOver, music: currentMusic })),
      { phase: 'gameover', over: true, music: null }
    );

    await step(page, 1);
    await press(page, 'z');
    assert.deepEqual(
      await page.evaluate(() => ({ phase: state.battle.phase, hp: state.player.hp, over: state.gameOver })),
      { phase: 'menu', hp: 20, over: false }
    );
  } finally {
    await close();
  }
});

test('pause freezes the fight and Esc resumes it', async () => {
  const { page, close } = await openGame();
  try {
    await startMode(page, 'survival', 'neo');
    await press(page, 'Escape');
    const frozen = await page.evaluate(() => state.timer);
    await step(page, 1);
    assert.equal(await page.evaluate(() => state.paused && state.timer), frozen);

    await press(page, 'Escape');
    await step(page, 0.5);
    assert.ok((await page.evaluate(() => state.timer)) > frozen);
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

    assert.equal(await page.isVisible('.touch-controls'), true);

    // Z na dotykovém panelu spustí hru
    await page.tap('[data-key="z"]');
    await step(page, 0.5);
    await page.tap('[data-key="z"]');
    await step(page);
    assert.equal(await page.evaluate(() => state.running), true);

    // podržení šipky doprava posune srdce
    const startX = await page.evaluate(() => state.player.x);
    const box = await page.locator('[data-key="arrowright"]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await step(page, 0.3);
    await page.mouse.up();
    const movedX = await page.evaluate(() => state.player.x);
    assert.ok(movedX > startX + 30, `x ${startX} -> ${movedX}`);

    // po puštění se srdce zastaví
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
    await press(page, 'z');
    assert.equal(await page.evaluate(() => state.battle.phase), 'victory');
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});
