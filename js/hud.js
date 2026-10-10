// Kreslení rozhraní: spodní panel se Susie, tlačítka příkazů, TP, stav bosse,
// obsah textového boxu, bublina a překryvy (start, game over, pauza).
const BUBBLE = { x: 318, y: 16, w: 186, h: 92 };
const BUBBLE_FONT = SMALL_FONT;
const PARTY_PANEL = { x: 14, y: 350, w: 236, h: 48 };
const COMMAND_BUTTON = { x: 262, y: 354, w: 82, h: 40, gap: 6 };
const TP_GAUGE = { x: 22, y: 166, w: 18, h: 146 };
const SUSIE_COLOR = '#d462d9';
const BIG_FONT = 'bold 28px "Courier New", Courier, monospace';
const HUGE_FONT = 'bold 52px "Courier New", Courier, monospace';

function drawSoulIcon(cx, cy, size) {
  if (soulRedSprite.complete && soulRedSprite.naturalWidth > 0) {
    ctx.drawImage(soulRedSprite, cx - size / 2, cy - size / 2, size, size);
  } else {
    ctx.fillStyle = '#ff3b3b';
    fillCircle(cx, cy, size / 2.5);
  }
}

function drawPartyPanel() {
  const p = state.player;
  const panel = PARTY_PANEL;
  const hp = Math.max(0, p.hp);

  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = SUSIE_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(panel.x + 1, panel.y + 1, panel.w - 2, panel.h - 2);

  ctx.font = SMALL_FONT;
  ctx.fillStyle = SUSIE_COLOR;
  ctx.fillText('SUSIE', panel.x + 10, panel.y + 19);
  if (state.battle && state.battle.defending) {
    ctx.fillStyle = '#7fd4ff';
    ctx.fillText('KRYJE SE', panel.x + 80, panel.y + 19);
  }

  ctx.fillStyle = '#fff';
  ctx.fillText('HP', panel.x + 10, panel.y + 39);
  const bar = { x: panel.x + 40, y: panel.y + 29, w: 110, h: 12 };
  ctx.fillStyle = '#7a0000';
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  ctx.fillStyle = '#ffd200';
  ctx.fillRect(bar.x, bar.y, (bar.w * hp) / p.maxHp, bar.h);

  ctx.fillStyle = hp <= p.maxHp * 0.25 ? '#ff5e5e' : '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(`${hp}/${p.maxHp}`, panel.x + panel.w - 10, panel.y + 39);
  ctx.restore();
}

function drawCommandButtons(battle) {
  const choosing = battle && ['menu', 'actList', 'itemList'].includes(battle.phase);
  const b = COMMAND_BUTTON;

  ctx.save();
  ctx.font = 'bold 13px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 2;

  COMMANDS.forEach((command, i) => {
    const x = b.x + i * (b.w + b.gap);
    const selected = choosing && i === battle.command;
    const color = selected ? '#ffd34d' : '#d17f1f';

    ctx.globalAlpha = choosing ? 1 : 0.45;
    ctx.fillStyle = selected ? '#2a1c00' : '#000';
    ctx.fillRect(x, b.y, b.w, b.h);
    ctx.strokeStyle = color;
    ctx.strokeRect(x + 1, b.y + 1, b.w - 2, b.h - 2);

    ctx.fillStyle = color;
    if (selected) {
      drawSoulIcon(x + 12, b.y + b.h / 2, 12);
      ctx.fillStyle = color;
      ctx.fillText(command.label, x + 48, b.y + b.h / 2 + 5);
    } else {
      ctx.fillText(command.label, x + b.w / 2, b.y + b.h / 2 + 5);
    }
  });

  ctx.restore();
}

function drawTpGauge(battle) {
  const g = TP_GAUGE;
  const fill = (g.h * battle.tp) / 100;

  ctx.save();
  ctx.font = SMALL_FONT;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('TP', g.x + g.w / 2, g.y - 8);

  ctx.fillStyle = '#3a1a00';
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = battle.tp >= 100 ? '#ffd34d' : '#ff8c1a';
  ctx.fillRect(g.x, g.y + g.h - fill, g.w, fill);

  // značka, od které jde seslat Rude Buster
  const markY = g.y + g.h - (g.h * RUDE_BUSTER_COST) / 100;
  ctx.fillStyle = '#fff';
  ctx.fillRect(g.x - 3, markY - 1, g.w + 6, 2);

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(g.x, g.y, g.w, g.h);
  ctx.fillText(battle.tp >= 100 ? 'MAX' : `${Math.floor(battle.tp)}%`, g.x + g.w / 2, g.y + g.h + 18);
  ctx.restore();
}

function drawBossStatus(battle) {
  const boss = battle.boss;
  const x = 196;
  const y = 122;
  const barW = 120;

  ctx.save();
  ctx.font = SMALL_FONT;
  ctx.fillStyle = isSpareable(battle) ? '#ffe14d' : '#fff';
  ctx.fillText(boss.name, x, y);

  ctx.fillStyle = '#5a0000';
  ctx.fillRect(x, y + 8, barW, 8);
  ctx.fillStyle = '#3bd16f';
  ctx.fillRect(x, y + 8, (barW * battle.bossHp) / boss.maxHp, 8);

  ctx.fillStyle = '#ffe14d';
  ctx.fillText(`MILOST ${battle.mercy}%`, x + barW + 12, y + 17);
  ctx.restore();
}

function isTextBoxSettled() {
  return Math.abs(state.box.w - TEXT_BOX.w) < 2 && Math.abs(state.box.h - TEXT_BOX.h) < 2;
}

function drawBattleBoxContents(battle) {
  if (!isTextBoxSettled()) return;
  const x = TEXT_BOX.x + TEXT_PADDING;
  const y = TEXT_BOX.y + 36;

  switch (battle.phase) {
    case 'menu':
    case 'result':
    case 'victory':
      drawTyper(battle.typer, x, y, 26);
      break;
    case 'actList':
      drawOptionList(battle, getActOptions(battle));
      break;
    case 'itemList':
      drawOptionList(battle, getItemOptions(battle));
      break;
    case 'fight':
    case 'fightResult':
      drawFightBar(battle);
      break;
  }
}

function drawOptionList(battle, options) {
  const box = TEXT_BOX;
  const columnWidth = (box.w - TEXT_PADDING * 2) / LIST_COLUMNS;

  ctx.save();
  ctx.font = TEXT_FONT;

  options.forEach((option, i) => {
    const x = box.x + TEXT_PADDING + (i % LIST_COLUMNS) * columnWidth;
    const y = box.y + 36 + Math.floor(i / LIST_COLUMNS) * 30;
    const textColor = option.disabled ? '#666' : '#fff';

    if (i === battle.listIndex) {
      drawSoulIcon(x + 6, y - 6, 14);
    } else {
      ctx.fillStyle = textColor;
      ctx.fillText('*', x, y);
    }

    ctx.fillStyle = textColor;
    ctx.fillText(option.name, x + 20, y);

    if (option.note) {
      ctx.textAlign = 'right';
      ctx.fillStyle = option.disabled ? '#666' : '#ff8c1a';
      ctx.fillText(option.note, x + columnWidth - 14, y);
      ctx.textAlign = 'left';
    }
  });

  const selected = options[battle.listIndex];
  if (selected && selected.description) {
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#9c9c9c';
    ctx.fillText(selected.description, box.x + TEXT_PADDING, box.y + box.h - 14);
  }

  ctx.restore();
}

function drawFightBar(battle) {
  const box = TEXT_BOX;
  const fight = battle.fight;
  const left = box.x + 24;
  const width = box.w - 48;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;

  ctx.save();
  // terč ze soustředných elips, uprostřed zelená čára = nejsilnější zásah
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, width / 2 - i * 62, 52 - i * 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#3bd16f';
  ctx.fillRect(cx - 3, cy - 50, 6, 100);

  const pos = fight.stoppedAt === null ? Math.min(fight.pos, 1) : fight.stoppedAt;
  const cursorX = left + pos * width;
  const blink = battle.phase === 'fightResult' && Math.floor(battle.phaseTime * 12) % 2 === 0;
  ctx.fillStyle = blink ? '#ffd34d' : '#ffffff';
  ctx.fillRect(cursorX - 5, cy - 58, 10, 116);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(cursorX - 5, cy - 58, 10, 116);

  if (battle.phase === 'fightResult' && fight.perfect) {
    ctx.font = TEXT_FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.fillText('PERFEKTNÍ!', cx, box.y - 12);
  }
  ctx.restore();
}

function drawSpeechBubble(battle) {
  if (!battle.bubble) return;
  const b = BUBBLE;

  ctx.save();
  ctx.fillStyle = '#fff';
  fillRoundRect(b.x, b.y, b.w, b.h, 10);
  // ocásek bubliny míří k bossovi
  ctx.beginPath();
  ctx.moveTo(b.x + b.w - 2, b.y + 30);
  ctx.lineTo(b.x + b.w + 16, b.y + 44);
  ctx.lineTo(b.x + b.w - 2, b.y + 54);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawTyper(battle.bubble, b.x + 12, b.y + 22, 18, '#000');
}

function drawBattleUi(battle) {
  drawTpGauge(battle);
  drawBossStatus(battle);
  drawCommandButtons(battle);
  drawBattleBoxContents(battle);
  drawSpeechBubble(battle);
}

function drawSurvivalHud() {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px "Courier New", Courier, monospace';
  ctx.fillText(`TIME ${state.timer.toFixed(1)}s`, 272, 380);
  ctx.textAlign = 'right';
  ctx.fillText(state.currentBoss.name, canvas.width - 18, 380);
  ctx.restore();
}

function drawOverlays() {
  const box = state.box;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;

  ctx.save();
  ctx.textAlign = 'center';

  if (!state.running && !state.gameOver && !state.battle) {
    ctx.fillStyle = '#fff';
    ctx.font = BIG_FONT;
    ctx.fillText('STISKNI START', cx, cy);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#9c9c9c';
    ctx.fillText(
      state.gameMode === 'battle' ? 'Z / Enter · tahová bitva' : 'Z / Enter · přežij co nejdéle',
      cx,
      cy + 28
    );
  }

  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBrokenSoul(canvas.width / 2, 120);

    ctx.fillStyle = '#fff';
    ctx.font = HUGE_FONT;
    ctx.fillText('GAME OVER', canvas.width / 2, 215);
    ctx.font = TEXT_FONT;
    ctx.fillText(
      state.gameMode === 'battle'
        ? 'Susie, zůstaň odhodlaná!'
        : `Přežila jsi ${state.timer.toFixed(1)} s.`,
      canvas.width / 2,
      262
    );
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#9c9c9c';
    ctx.fillText(
      state.gameMode === 'battle' ? 'Z / Enter = znovu · X = zpět' : 'Z / Enter = znovu',
      canvas.width / 2,
      300
    );
  }

  if (state.paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = HUGE_FONT;
    ctx.fillText('PAUZA', canvas.width / 2, canvas.height / 2);
    ctx.font = SMALL_FONT;
    ctx.fillText('Esc / P = pokračovat', canvas.width / 2, canvas.height / 2 + 34);
  }

  ctx.restore();
}

function drawBrokenSoul(cx, cy) {
  ctx.save();
  drawSoulIcon(cx, cy, 48);
  // prasklina přes srdce
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 18);
  ctx.lineTo(cx + 5, cy - 8);
  ctx.lineTo(cx - 5, cy + 2);
  ctx.lineTo(cx + 4, cy + 12);
  ctx.lineTo(cx, cy + 22);
  ctx.stroke();
  ctx.restore();
}
