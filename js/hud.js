// Battle UI: the player panel, command buttons, TP gauge, boss status, the text box contents,
// speech bubble and overlays (start, game over, pause). Undertale and Deltarune bosses get
// the UI of their own game.
const BUBBLE_DR = { x: 318, y: 16, w: 186, h: 92 };
const BUBBLE_FONT = SMALL_FONT;
const PARTY_PANEL = { x: 14, y: 350, w: 236, h: 48 };
const COMMAND_BUTTON_DR = { x: 262, y: 354, w: 82, h: 40, gap: 6 };
const COMMAND_BUTTON_UT = { x: 40, y: 366, w: 146, h: 34, gap: 14 };
const TP_GAUGE = { x: 22, y: 166, w: 18, h: 146 };
const SUSIE_COLOR = '#d462d9';
const UT_ORANGE = '#ff8c1a';
const UT_YELLOW = '#ffe14d';
const BIG_FONT = `bold 28px ${TITLE_FAMILY}`;
const HUGE_FONT = `bold 52px ${TITLE_FAMILY}`;

function isUndertale() {
  return state.currentBoss && state.currentBoss.game === 'undertale';
}

function bubbleRect(battle) {
  if (battle.boss.game !== 'undertale') return BUBBLE_DR;
  const at = bossPosition(battle.boss);
  return { x: at.x + 70, y: 14, w: 190, h: 92 };
}

// Where heal / damage numbers for the player appear.
function partyPopupPos() {
  if (isUndertale()) return { x: 250, y: 346 };
  return { x: SUSIE_POS.x + 36, y: SUSIE_POS.y + 40 };
}

function drawSoulIcon(cx, cy, size) {
  drawSoulShape(cx, cy, size, SOUL_COLORS.red);
}

// ---------------- Deltarune: Susie's panel ----------------
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
    ctx.fillText('DEFENDING', panel.x + 80, panel.y + 19);
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

// ---------------- Undertale: name, LV, HP (and KR) ----------------
function drawUtStats() {
  const p = state.player;
  const stats = playerStats(state.currentBoss);
  const hp = Math.max(0, p.hp);
  const y = 357;

  ctx.save();
  ctx.font = SMALL_FONT;
  ctx.fillStyle = '#fff';
  ctx.fillText(stats.name, 40, y);
  ctx.fillText(`LV ${stats.lv}`, 130, y);
  ctx.fillText('HP', 210, y);

  // bar width grows with max HP like in Undertale (capped to fit)
  const barW = Math.min(180, 30 + p.maxHp * 1.2);
  const bar = { x: 240, y: y - 12, w: barW, h: 14 };
  ctx.fillStyle = '#c00000';
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  ctx.fillStyle = '#ffe600';
  ctx.fillRect(bar.x, bar.y, (bar.w * hp) / p.maxHp, bar.h);
  let textX = bar.x + bar.w + 12;
  if (state.currentBoss.karma) {
    // KR eats into the HP bar from the right
    const kr = Math.min(p.karma, hp);
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(bar.x + (bar.w * (hp - kr)) / p.maxHp, bar.y, (bar.w * kr) / p.maxHp, bar.h);
    ctx.fillStyle = p.karma > 0 ? '#ff00ff' : '#fff';
    ctx.fillText('KR', textX, y);
    textX += 30;
  }
  ctx.fillStyle = p.karma > 0 ? '#ff00ff' : hp <= p.maxHp * 0.2 ? '#ff5e5e' : '#fff';
  ctx.fillText(`${hp} / ${p.maxHp}`, textX, y);
  ctx.restore();
}

function drawCommandButtons(battle) {
  const boss = state.currentBoss;
  const commands = battle ? getCommands(battle) : COMMAND_SETS[boss.game] || COMMAND_SETS.deltarune;
  const choosing = battle && ['menu', 'actList', 'itemList', 'mercyList'].includes(battle.phase);
  const ut = boss.game === 'undertale';
  const b = { ...(ut ? COMMAND_BUTTON_UT : COMMAND_BUTTON_DR) };
  // fewer buttons get wider (Asriel's final form has a single one)
  const fullWidth = commands.length * b.w + (commands.length - 1) * b.gap;
  const normalWidth = (ut ? 4 : 5) * b.w + ((ut ? 4 : 5) - 1) * b.gap;
  if (commands.length < (ut ? 4 : 5)) b.x += (normalWidth - fullWidth) / 2;

  ctx.save();
  ctx.font = ut ? `17px ${FONT_FAMILY}` : `13px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 2;

  commands.forEach((command, i) => {
    const x = b.x + i * (b.w + b.gap);
    const selected = choosing && i === battle.command;
    const color = ut ? (selected ? UT_YELLOW : UT_ORANGE) : (selected ? '#ffd34d' : '#d17f1f');

    ctx.globalAlpha = choosing || !battle ? 1 : 0.45;
    ctx.fillStyle = selected && !ut ? '#2a1c00' : '#000';
    ctx.fillRect(x, b.y, b.w, b.h);
    ctx.strokeStyle = color;
    ctx.strokeRect(x + 1, b.y + 1, b.w - 2, b.h - 2);

    ctx.fillStyle = color;
    if (selected) {
      drawSoulIcon(x + 14, b.y + b.h / 2, 13);
      ctx.fillStyle = color;
      ctx.fillText(command.label, x + b.w / 2 + 10, b.y + b.h / 2 + 6);
    } else {
      ctx.fillText(command.label, x + b.w / 2, b.y + b.h / 2 + 6);
    }
    if (command.disabled) {
      // a broken button: crossed out
      ctx.strokeStyle = '#ff3030';
      ctx.beginPath();
      ctx.moveTo(x + 6, b.y + 6);
      ctx.lineTo(x + b.w - 6, b.y + b.h - 6);
      ctx.moveTo(x + b.w - 6, b.y + 6);
      ctx.lineTo(x + 6, b.y + b.h - 6);
      ctx.stroke();
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

  // mark from which Rude Buster can be cast
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
  const ut = boss.game === 'undertale';
  const x = ut ? 60 : 196;
  const y = ut ? 166 : 122;
  const barW = 120;

  // Undertale only shows the enemy HP bar between attacks.
  if (ut && !['menu', 'actList', 'itemList', 'mercyList', 'fight', 'fightResult', 'result'].includes(battle.phase)) return;
  // a board that fills the screen (Jevil's FINAL CHAOS) would be covered by the status
  if (state.box.y < y + 30) return;

  ctx.save();
  ctx.font = SMALL_FONT;
  ctx.fillStyle = isSpareable(battle) ? '#ffe14d' : '#fff';
  ctx.fillText(boss.name, x, y);

  if (!boss.hideHp) {
    const barX = x + ctx.measureText(boss.name).width + 12;
    ctx.fillStyle = ut ? '#5a0000' : '#5a0000';
    ctx.fillRect(barX, y - 9, barW, 10);
    ctx.fillStyle = ut ? '#3bd16f' : '#3bd16f';
    ctx.fillRect(barX, y - 9, (barW * battle.bossHp) / boss.maxHp, 10);
    if (!ut || boss.showMercy) {
      ctx.fillStyle = '#ffe14d';
      ctx.fillText(`MERCY ${battle.mercy}%`, barX + barW + 12, y);
    }
  }
  if (boss.statusText) {
    const extra = boss.statusText(battle);
    if (extra) {
      ctx.fillStyle = '#9fd8ff';
      ctx.fillText(extra, x, y + 18);
    }
  }
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
    case 'mercyList':
      drawOptionList(battle, getMercyOptions(battle));
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
    const textColor = option.disabled ? '#666' : option.spareable ? '#ffe14d' : '#fff';

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
  // target of concentric ellipses, the green line in the middle is the strongest hit
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

  if (battle.phase === 'fightResult' && fight.perfect && !fight.missed) {
    ctx.font = TEXT_FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.fillText('PERFECT!', cx, box.y - 12);
  }
  ctx.restore();
}

function drawSpeechBubble(battle) {
  if (!battle.bubble) return;
  const b = { ...bubbleRect(battle) };
  // long lines make the bubble taller
  b.h = Math.max(b.h, 16 + battle.bubble.lines.length * 18);
  const ut = battle.boss.game === 'undertale';

  ctx.save();
  ctx.fillStyle = '#fff';
  fillRoundRect(b.x, b.y, b.w, b.h, 10);
  // the tail points at the boss
  ctx.beginPath();
  if (ut) {
    ctx.moveTo(b.x + 2, b.y + 30);
    ctx.lineTo(b.x - 16, b.y + 44);
    ctx.lineTo(b.x + 2, b.y + 54);
  } else {
    ctx.moveTo(b.x + b.w - 2, b.y + 30);
    ctx.lineTo(b.x + b.w + 16, b.y + 44);
    ctx.lineTo(b.x + b.w - 2, b.y + 54);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawTyper(battle.bubble, b.x + 12, b.y + 22, 18, '#000');
}

function drawBattleUi(battle) {
  if (battle.boss.game !== 'undertale') drawTpGauge(battle);
  drawBossStatus(battle);
  drawCommandButtons(battle);
  drawBattleBoxContents(battle);
  drawSpeechBubble(battle);
  if (battle.boss.drawMenuHazards) battle.boss.drawMenuHazards(battle);
}

function drawSurvivalHud() {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = `18px ${FONT_FAMILY}`;
  ctx.fillText(`TIME ${state.timer.toFixed(1)}s`, 272, 380);
  ctx.textAlign = 'right';
  ctx.fillText(state.currentBoss.name, VIEW_W - 18, 380);
  if (state.survival && state.survival.run) {
    ctx.font = TINY_FONT;
    ctx.fillStyle = '#9c9c9c';
    ctx.fillText(state.survival.run.attack.name, VIEW_W - 18, 396);
  }
  ctx.restore();
}

function drawOverlays() {
  const box = state.box;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;

  ctx.save();
  ctx.textAlign = 'center';

  if (state.screen === 'fight' && !state.running && !state.gameOver && !state.battle) {
    ctx.fillStyle = '#fff';
    ctx.font = BIG_FONT;
    ctx.fillText('PRESS START', cx, cy);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#9c9c9c';
    ctx.fillText(
      state.gameMode === 'battle' ? 'Z / Enter · fight   X · boss select' : 'Z / Enter · survive as long as you can',
      cx,
      cy + 28
    );
  }

  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawBrokenSoul(VIEW_W / 2, 120);

    ctx.fillStyle = '#fff';
    ctx.font = HUGE_FONT;
    ctx.fillText('GAME OVER', VIEW_W / 2, 215);
    ctx.font = TEXT_FONT;
    const line = state.gameMode === 'battle'
      ? (state.currentBoss.gameOverText || (isUndertale() ? 'Stay determined...' : 'Susie, get back up!'))
      : `You survived ${state.timer.toFixed(1)} s.`;
    ctx.fillText(line, VIEW_W / 2, 262);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#9c9c9c';
    ctx.fillText(
      state.gameMode === 'battle' ? 'Z / Enter = retry · X = boss select' : 'Z / Enter = again',
      VIEW_W / 2,
      300
    );
  }

  ctx.restore();
}

function drawBrokenSoul(cx, cy) {
  ctx.save();
  drawSoulIcon(cx, cy, 48);
  // a crack through the heart
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
