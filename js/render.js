// Draws the current scene: boss select, or a battle (background, enemy, party, board,
// bullets, SOUL, interface, overlays).
function drawDeltaruneBackground(t) {
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  const size = 50;
  const offset = (t * 14) % size;
  ctx.strokeStyle = 'rgba(110, 50, 160, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = offset - size; x < W + size; x += size) {
    ctx.moveTo(Math.round(x) + 0.5, -20);
    ctx.lineTo(Math.round(x) + 0.5, H + 20);
  }
  for (let y = offset - size; y < H + size; y += size) {
    ctx.moveTo(-20, Math.round(y) + 0.5);
    ctx.lineTo(W + 20, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

function drawBattleBackground(battle) {
  if (battle.boss.drawBackground) {
    battle.boss.drawBackground(state.clock, battle);
    return;
  }
  if (battle.style === 'deltarune') drawDeltaruneBackground(state.clock);
  else {
    ctx.fillStyle = '#000';
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }
}

function drawEnemy(battle) {
  const enemy = battle.enemy;
  if (!enemy.visible || enemy.alpha <= 0) return;
  const pos = enemyPosition(battle);
  let x = pos.x;
  if (enemy.hurt > 0) x += Math.sin(enemy.hurt * 60) * 14 * enemy.hurt;
  ctx.save();
  ctx.globalAlpha = enemy.alpha;
  battle.boss.draw(x, pos.y, state.clock, battle);
  ctx.restore();
}

function drawParty(battle) {
  battle.party.forEach((m, i) => {
    const pos = DR.party[i];
    const art = PARTY_ART[m.id];
    if (!art) return;
    ctx.save();
    if (m.down) ctx.globalAlpha = 0.4;
    if (m.hurt > 0 && Math.floor(m.hurt * 20) % 2 === 0) ctx.globalAlpha *= 0.4;
    art(pos.x + (m.hurt > 0 ? Math.sin(m.hurt * 70) * 3 : 0), pos.y, state.clock, m.pose);
    ctx.restore();
  });
}

// Undertale hides bullets outside the board; Deltarune shows them. Bullets with noClip
// (Gaster Blasters, big props) are always drawn unclipped.
function drawBulletsLayered(battle) {
  const clip = battle.style === 'undertale' && !(battle.run && battle.run.attack.noClip);
  if (!clip) {
    drawBullets();
    return;
  }
  const clipped = state.bullets.filter(b => !b.noClip);
  const free = state.bullets.filter(b => b.noClip);
  const c = boardCenter();
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(board.angle);
  ctx.beginPath();
  ctx.rect(-board.w / 2 + BOARD_BORDER, -board.h / 2 + BOARD_BORDER, board.w - BOARD_BORDER * 2, board.h - BOARD_BORDER * 2);
  ctx.rotate(-board.angle);
  ctx.translate(-c.x, -c.y);
  ctx.clip();
  const all = state.bullets;
  state.bullets = clipped;
  drawBullets();
  state.bullets = all;
  ctx.restore();
  const keep = state.bullets;
  state.bullets = free;
  drawBullets();
  state.bullets = keep;
}

function render() {
  if (state.scene === 'select') {
    drawSelect();
    return;
  }

  const battle = state.battle;
  const shake = getShakeOffset();

  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawBattleBackground(battle);
  drawEnemy(battle);
  if (battle.style === 'deltarune') drawParty(battle);
  if (battle.boss.drawUnderBoard) battle.boss.drawUnderBoard(state.clock, battle);
  drawBoard();
  drawBulletsLayered(battle);
  drawShots();
  drawSoul();
  if (battle.boss.drawOverlay) battle.boss.drawOverlay(state.clock, battle);
  drawEffects();
  ctx.restore();

  if (battle.style === 'undertale') drawUtInterface(battle);
  else drawDrInterface(battle);

  if (battle.phase === 'results') drawResults(battle);
  if (battle.phase === 'gameover') drawGameOver(battle);
  if (state.paused) drawPause();
  drawFlash();
}
