// Battle interface for both games, speech bubbles and the end / pause screens.
const UT_ORANGE = '#ff8a1f';
const UT_YELLOW = '#ffff00';
const KR_PURPLE = '#ff3cf0';

// -------------- Shared pieces --------------
function textBoxRect(battle) {
  return battle.style === 'undertale' ? UT.textBox : DR.textBox;
}

function textBoxReady(battle) {
  if (battle.style === 'deltarune') return true;
  return board.visible && Math.abs(board.w - UT.textBox.w) < 2 && Math.abs(board.h - UT.textBox.h) < 2;
}

function drawBoxText(battle) {
  if (!battle.typer || !textBoxReady(battle)) return;
  const box = textBoxRect(battle);
  drawTyper(battle.typer, box.x + TEXT_PAD, box.y + 36, 30);
}

function drawOptionList(battle) {
  const box = textBoxRect(battle);
  const options = menuOptions(battle);
  const columns = menuColumns(battle.menu.mode);
  const colW = (box.w - TEXT_PAD * 2) / columns;
  const rowH = battle.style === 'undertale' ? 32 : 28;

  ctx.save();
  ctx.font = TEXT_FONT;
  options.forEach((opt, i) => {
    const x = box.x + TEXT_PAD + (i % columns) * colW;
    const y = box.y + 36 + Math.floor(i / columns) * rowH;
    const selected = i === battle.menu.index;
    let color = opt.disabled ? '#808080' : opt.yellow ? UT_YELLOW : '#fff';

    if (selected) drawHeart(x + 8, y - 7, 15, '#ff0000');
    else {
      ctx.fillStyle = color;
      ctx.fillText('*', x + 2, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(opt.label, x + 28, y);

    if (opt.note) {
      ctx.fillStyle = opt.disabled ? '#808080' : '#ff9f30';
      ctx.textAlign = 'right';
      ctx.fillText(opt.note, x + colW - 16, y);
      ctx.textAlign = 'left';
    }

    if (opt.hpBar) drawTargetBars(battle, x + 28 + ctx.measureText(opt.label).width + 24, y - 16);
    if (opt.hpOf) drawMiniHp(opt.hpOf, x + 200, y - 15);
  });

  const selected = options[battle.menu.index];
  if (selected && selected.description) {
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#9c9c9c';
    ctx.textAlign = 'right';
    ctx.fillText(selected.description, box.x + box.w - 16, box.y + box.h - 12);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawTargetBars(battle, x, y) {
  const enemy = battle.enemy;
  ctx.save();
  if (battle.style === 'undertale') {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x, y, 100, 17);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(x, y, 100 * enemy.hp / enemy.maxHp, 17);
  } else {
    ctx.font = font(12);
    ctx.fillStyle = '#fff';
    ctx.fillText('HP', x, y - 2);
    ctx.fillStyle = '#800000';
    ctx.fillRect(x, y + 2, 80, 14);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(x, y + 2, 80 * enemy.hp / enemy.maxHp, 14);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.ceil(enemy.hp / enemy.maxHp * 100)}%`, x + 84, y + 14);
    ctx.fillText('MERCY', x + 140, y - 2);
    ctx.fillStyle = '#804000';
    ctx.fillRect(x + 140, y + 2, 80, 14);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(x + 140, y + 2, 80 * enemy.mercy / 100, 14);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${enemy.mercy}%`, x + 224, y + 14);
    if (enemy.tired) {
      ctx.fillStyle = '#40a0ff';
      ctx.fillText('(Tired)', x + 270, y + 14);
    }
  }
  ctx.restore();
}

function drawMiniHp(member, x, y) {
  ctx.save();
  ctx.fillStyle = '#800000';
  ctx.fillRect(x, y, 90, 14);
  ctx.fillStyle = member.down ? '#ff0000' : '#00ff00';
  ctx.fillRect(x, y, 90 * Math.max(0, member.hp) / member.maxHp, 14);
  ctx.font = font(12);
  ctx.fillStyle = '#fff';
  ctx.fillText(`${member.hp}/${member.maxHp}`, x + 96, y + 12);
  ctx.restore();
}

// Undertale shows the enemy HP bar briefly after a hit.
function drawEnemyHpAfterHit(battle) {
  const enemy = battle.enemy;
  if (enemy.barTimer <= 0 || battle.outcome === 'killed') return;
  const pos = enemyPosition(battle);
  ctx.save();
  ctx.fillStyle = '#404040';
  ctx.fillRect(pos.x - 60, pos.y - 22, 120, 12);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(pos.x - 60, pos.y - 22, 120 * enemy.hp / enemy.maxHp, 12);
  ctx.restore();
}

function drawBubble(battle) {
  if (!battle.bubble) return;
  const layout = bubbleLayout(battle);
  const lines = battle.bubble.lines.length;
  const h = Math.max(54, 20 + lines * 19);
  ctx.save();
  ctx.fillStyle = '#fff';
  fillRoundRect(layout.x, layout.y, layout.w, h, 8);
  const midY = layout.y + Math.min(30, h / 2);
  if (layout.side === 'left') fillPoly([layout.x + 2, midY - 8, layout.x - 16, midY, layout.x + 2, midY + 8]);
  else fillPoly([layout.x + layout.w - 2, midY - 8, layout.x + layout.w + 16, midY, layout.x + layout.w - 2, midY + 8]);
  ctx.restore();
  drawTyper(battle.bubble, layout.x + 12, layout.y + 24, 19, '#000');
}

function currentStep(battle) {
  return battle.phase === 'steps' ? battle.step : null;
}

// -------------- Undertale interface --------------
function drawUtStats(battle) {
  const m = battle.party[0];
  const y = UT.statsY;
  ctx.save();
  ctx.font = font(20);
  ctx.fillStyle = '#fff';
  ctx.fillText(m.name, 32, y + 14);
  ctx.fillText(`LV ${m.lv}`, 132, y + 14);
  ctx.font = font(13);
  ctx.fillText('HP', 236, y + 12);

  const barW = Math.max(30, m.maxHp * 1.25);
  const bx = 262;
  ctx.fillStyle = '#c00000';
  ctx.fillRect(bx, y, barW, 20);
  const hp = Math.max(0, m.hp);
  const kr = battle.karma ? Math.min(battle.kr, hp) : 0;
  ctx.fillStyle = UT_YELLOW;
  ctx.fillRect(bx, y, barW * (hp - kr) / m.maxHp, 20);
  if (kr > 0) {
    ctx.fillStyle = KR_PURPLE;
    ctx.fillRect(bx + barW * (hp - kr) / m.maxHp, y, barW * kr / m.maxHp, 20);
  }

  let tx = bx + barW + 14;
  if (battle.karma) {
    ctx.font = font(13);
    ctx.fillStyle = '#fff';
    ctx.fillText('KR', tx, y + 14);
    tx += 30;
  }
  ctx.font = font(20);
  ctx.fillStyle = kr > 0 ? KR_PURPLE : '#fff';
  ctx.fillText(`${hp} / ${m.maxHp}`, tx, y + 16);
  ctx.restore();
}

function drawUtButtons(battle) {
  const choosing = battle.phase === 'menu';
  ctx.save();
  ctx.font = font(22);
  ctx.textAlign = 'center';
  UT_COMMANDS.forEach((cmd, i) => {
    const x = UT.buttonX[i];
    const y = UT.buttonY;
    const selected = choosing && battle.menu.button === i;
    const color = selected ? UT_YELLOW : UT_ORANGE;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, UT.buttonW - 3, UT.buttonH - 3);
    ctx.fillStyle = color;
    ctx.fillText(UT_COMMAND_LABELS[cmd], x + UT.buttonW / 2 + 12, y + 29);
    if (selected && battle.menu.mode === 'buttons') drawHeart(x + 20, y + UT.buttonH / 2, 16, '#ff0000');
    else drawUtButtonIcon(cmd, x + 20, y + UT.buttonH / 2, color);
  });
  ctx.restore();
}

function drawUtButtonIcon(cmd, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (cmd === 'fight') {
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-2, -9, 4, 14);
    ctx.fillRect(-6, 4, 12, 3);
  } else if (cmd === 'act') {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.stroke();
    fillCircle(x - 2, y - 1, 1.5);
    fillCircle(x + 2, y - 1, 1.5);
  } else if (cmd === 'item') {
    ctx.strokeRect(x - 7, y - 6, 14, 13);
    ctx.fillRect(x - 3, y - 9, 6, 3);
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 7);
    ctx.lineTo(x + 7, y + 7);
    ctx.moveTo(x + 7, y - 7);
    ctx.lineTo(x - 7, y + 7);
    ctx.stroke();
  }
  ctx.restore();
}

function drawUtInterface(battle) {
  drawUtStats(battle);
  drawUtButtons(battle);
  drawEnemyHpAfterHit(battle);

  const step = currentStep(battle);
  if (battle.phase === 'menu') {
    if (battle.menu.mode === 'buttons') drawBoxText(battle);
    else if (textBoxReady(battle)) drawOptionList(battle);
  } else if (step && step.type === 'fight' && textBoxReady(battle)) {
    drawUtFightBar(step);
  } else {
    drawBoxText(battle);
  }
  drawBubble(battle);
}

// -------------- Deltarune interface --------------
const DR_ICON = {
  fight: (x, y) => { ctx.translate(x, y); ctx.rotate(-Math.PI / 4); ctx.fillRect(-2, -10, 4, 15); ctx.fillRect(-6, 4, 12, 3); },
  act: (x, y) => { ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke(); fillCircle(x - 3, y - 1, 1.6); fillCircle(x + 3, y - 1, 1.6); },
  magic: (x, y) => { fillPoly([x, y - 10, x + 3, y - 3, x + 10, y, x + 3, y + 3, x, y + 10, x - 3, y + 3, x - 10, y, x - 3, y - 3]); },
  item: (x, y) => { ctx.strokeRect(x - 8, y - 6, 16, 14); ctx.fillRect(x - 3, y - 10, 6, 4); },
  spare: (x, y) => { ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8); ctx.stroke(); },
  defend: (x, y) => { fillPoly([x - 8, y - 9, x + 8, y - 9, x + 8, y + 1, x, y + 10, x - 8, y + 1]); }
};

function drawDrPanels(battle) {
  const n = battle.party.length;
  const panelW = W / n;
  const y = DR.panelY;
  const choosing = battle.phase === 'menu';

  battle.party.forEach((m, i) => {
    const x = i * panelW;
    const active = choosing && battle.menu.member === i;
    const chosen = choosing && battle.actions.some(a => a.member === m || (a.uses && a.uses.includes(m.id)));
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y - (active ? 34 : 0), panelW, DR.panelH + (active ? 34 : 0));
    ctx.strokeStyle = active ? m.color : '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1 - (active ? 34 : 0), panelW - 2, DR.panelH - 2 + (active ? 34 : 0));

    ctx.font = font(15);
    ctx.fillStyle = m.down ? '#ff4040' : m.color;
    ctx.fillText(m.name.toUpperCase(), x + 10, y + 26);
    if (m.defending) {
      ctx.fillStyle = '#7fd4ff';
      ctx.font = font(11);
      ctx.fillText('DEF', x + 10, y + 38);
    }
    if (chosen) {
      ctx.fillStyle = '#9c9c9c';
      ctx.font = font(11);
      ctx.fillText('ready', x + 10, y + 12);
    }

    ctx.font = font(12);
    ctx.fillStyle = '#fff';
    ctx.fillText('HP', x + 82, y + 18);
    ctx.fillStyle = '#800000';
    ctx.fillRect(x + 104, y + 8, 98, 12);
    ctx.fillStyle = m.down ? '#ff0000' : m.color;
    ctx.fillRect(x + 104, y + 8, 98 * Math.max(0, m.hp) / m.maxHp, 12);
    ctx.fillStyle = m.down ? '#ff4040' : '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(`${m.hp}/${m.maxHp}`, x + 202, y + 34);
    ctx.textAlign = 'left';

    if (active) drawDrCommands(battle, m, x, y - 32, panelW);
    ctx.restore();
  });
}

function drawDrCommands(battle, member, x, y, panelW) {
  const cmds = member.commands;
  const slot = (panelW - 10) / cmds.length;
  cmds.forEach((cmd, i) => {
    const cx = x + 5 + slot * i + slot / 2;
    const selected = battle.menu.button === i;
    const color = selected ? UT_YELLOW : UT_ORANGE;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - slot / 2 + 2, y + 2, slot - 4, 28);
    if (selected && battle.menu.mode === 'buttons') drawHeart(cx, y + 16, 12, '#ff0000');
    else DR_ICON[cmd](cx, y + 16);
    ctx.restore();
  });
  const label = DR_COMMAND_LABELS[cmds[battle.menu.button]] || '';
  ctx.save();
  ctx.font = font(12);
  ctx.fillStyle = UT_YELLOW;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + panelW / 2, y - 4);
  ctx.restore();
}

function drawTpGauge(battle) {
  const g = DR.tp;
  const fill = g.h * battle.tp / 100;
  ctx.save();
  ctx.font = font(14);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('TP', g.x + g.w / 2, g.y - 8);
  ctx.fillStyle = '#80002a';
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = battle.tp >= 100 ? '#ffd34d' : '#ff8c1a';
  ctx.fillRect(g.x, g.y + g.h - fill, g.w, fill);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(g.x, g.y, g.w, g.h);
  ctx.fillText(battle.tp >= 100 ? 'MAX' : `${Math.floor(battle.tp)}%`, g.x + g.w / 2, g.y + g.h + 18);
  ctx.restore();
}

function drawDrInterface(battle) {
  drawTpGauge(battle);
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(DR.textBox.x, DR.textBox.y, DR.textBox.w, DR.textBox.h);
  ctx.strokeStyle = '#333';
  ctx.strokeRect(DR.textBox.x + 1, DR.textBox.y + 1, DR.textBox.w - 2, DR.textBox.h - 2);
  ctx.restore();
  drawDrPanels(battle);
  drawEnemyHpAfterHit(battle);

  const step = currentStep(battle);
  if (battle.phase === 'menu') {
    if (battle.menu.mode === 'buttons') drawBoxText(battle);
    else drawOptionList(battle);
  } else if (step && step.type === 'fight') {
    drawDrFightBars(battle, step);
  } else {
    drawBoxText(battle);
  }
  drawBubble(battle);
}

// -------------- End screens and pause --------------
function drawOptionsRow(options, index, y) {
  ctx.save();
  ctx.font = font(22);
  ctx.textAlign = 'center';
  const gap = 180;
  const start = W / 2 - ((options.length - 1) * gap) / 2;
  options.forEach((opt, i) => {
    const x = start + i * gap;
    const selected = i === index;
    ctx.fillStyle = selected ? UT_YELLOW : '#fff';
    ctx.fillText(opt, x + 10, y);
    if (selected) drawHeart(x - ctx.measureText(opt).width / 2 - 8, y - 7, 15, '#ff0000');
  });
  ctx.restore();
}

function drawResults(battle) {
  const outcomeText = {
    spared: 'SPARED', pacified: 'PACIFIED', killed: 'DEFEATED', fled: 'ESCAPED', survived: 'SURVIVED'
  }[battle.outcome] || 'CLEARED';
  const record = battle.record || getBossRecord(battle.boss.id);
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = UT_YELLOW;
  ctx.font = font(40);
  ctx.fillText(`${battle.boss.name.toUpperCase()}`, W / 2, 150);
  ctx.fillStyle = '#fff';
  ctx.font = font(28);
  ctx.fillText(outcomeText, W / 2, 196);
  ctx.font = font(18);
  ctx.fillText(`Time ${formatTime(battle.results.time)}   ·   Best ${formatTime(record.bestTime)}   ·   Wins ${record.wins}   ·   Deaths ${record.deaths}`, W / 2, 246);
  ctx.restore();
  drawOptionsRow(resultOptions(battle), battle.menu.index, 330);
}

function drawGameOver(battle) {
  const t = battle.phaseTime;
  const pos = battle.deathPos || { x: W / 2, y: H / 2, color: '#ff0000' };
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.globalAlpha = Math.min(1, t * 1.5);
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  if (t < 0.5) {
    // the SOUL cracks...
    drawHeart(pos.x, pos.y, 18, pos.color);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    line(pos.x - 1, pos.y - 8, pos.x + 2, pos.y - 2);
    line(pos.x + 2, pos.y - 2, pos.x - 2, pos.y + 3);
    line(pos.x - 2, pos.y + 3, pos.x + 1, pos.y + 8);
  } else if (t < 1.4) {
    // ...and shatters into shards
    const k = t - 0.5;
    ctx.fillStyle = pos.color;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.5;
      ctx.fillRect(pos.x + Math.cos(a) * k * 120 - 3, pos.y + Math.sin(a) * k * 120 + k * k * 300 - 3, 6, 6);
    }
  }

  if (t > 0.9) {
    ctx.globalAlpha = Math.min(1, (t - 0.9) * 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = font(64);
    ctx.fillText('GAME', W / 2, 150);
    ctx.fillText('OVER', W / 2, 220);
    ctx.font = font(20);
    const msg = battle.boss.gameOverText || (battle.style === 'undertale' ? 'You cannot give up just yet... Stay determined!' : 'Don\'t give up! The fountain is still waiting.');
    ctx.fillText(msg, W / 2, 290);
    ctx.globalAlpha = 1;
    ctx.restore();
    drawOptionsRow(resultOptions(battle), battle.menu.index, 370);
    return;
  }
  ctx.restore();
}

const PAUSE_OPTIONS = ['Resume', 'Retry', 'Boss select'];
let pauseIndex = 0;

function drawPause() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = font(48);
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, 190);
  ctx.restore();
  drawOptionsRow(PAUSE_OPTIONS, pauseIndex, 280);
}
