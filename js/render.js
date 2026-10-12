// Scene drawing: background, bullet board, bullets, characters, HUD and the boss select screen.

// Deltarune battles have a slowly scrolling grid, Undertale ones are plain black.
function drawBackground() {
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
  if (state.screen === 'fight' && isUndertale()) return;

  const size = 40;
  const offset = (state.clock * 12) % size;
  ctx.strokeStyle = 'rgba(110, 50, 160, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = offset - size; x < VIEW_W + size; x += size) {
    ctx.moveTo(Math.round(x) + 0.5, -20);
    ctx.lineTo(Math.round(x) + 0.5, VIEW_H + 20);
  }
  for (let y = offset - size; y < VIEW_H + size; y += size) {
    ctx.moveTo(-20, Math.round(y) + 0.5);
    ctx.lineTo(VIEW_W + 20, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

// The box animates between the bullet board (attacks) and the wide text box (menu).
function getBoxTarget() {
  if (state.battle) return getBattleBoxTarget(state.battle);
  return state.gameMode === 'battle' ? TEXT_BOX : arena;
}

function updateBox(dt) {
  const target = getBoxTarget();
  const k = Math.min(1, dt * 14);
  for (const prop of ['x', 'y', 'w', 'h']) {
    state.box[prop] += (target[prop] - state.box[prop]) * k;
    if (Math.abs(target[prop] - state.box[prop]) < 0.5) state.box[prop] = target[prop];
  }
}

function drawArena() {
  const box = state.box;
  const boss = state.currentBoss;

  ctx.fillStyle = isUndertale() ? '#000' : '#0d0d0d';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  if (boss && boss.drawArenaBackground && isSoulVisible()) boss.drawArenaBackground(box);

  // the frame goes on top, otherwise the fill would cover its inner half
  ctx.strokeStyle = state.player && state.player.mode === 'green' && isSoulVisible() ? '#16c916' : '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
}

function isSoulVisible() {
  if (!state.battle) return state.gameMode === 'survival' && state.screen === 'fight';
  return state.battle.phase === 'enemyTalk' || state.battle.phase === 'attack';
}

// ---------------- Bullets ----------------
const BULLET_COLORS = {
  normal: '#ffffff',
  bone: '#f5f5f5',
  card: '#d96cff',
  blaster: '#5ed0ff',
  fire: '#ffffff',
  spear: '#4dc3ff',
  arrow: '#4dc3ff'
};

const SEMANTIC_COLORS = { cyan: SOUL_COLORS.cyan, orange: SOUL_COLORS.orange };

function bulletFill(b) {
  if (SEMANTIC_COLORS[b.color]) return SEMANTIC_COLORS[b.color];
  return b.color || BULLET_COLORS[b.kind] || BULLET_COLORS.normal;
}

// Drawers for each bullet kind. Bosses can register their own (BULLET_DRAWERS.myKind = b => ...).
const BULLET_DRAWERS = {
  normal(b, fill) {
    ctx.fillStyle = fill;
    if (b.hw) {
      ctx.translate(b.x, b.y);
      if (b.angle) ctx.rotate(b.angle);
      ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
    } else {
      fillCircle(b.x, b.y, b.r);
    }
  },
  axe01(b) {
    if (!imageReady(axe01Sprite)) {
      ctx.fillStyle = '#ccc';
      fillCircle(b.x, b.y, b.r);
      return;
    }
    const h = 42;
    const w = h * axe01Sprite.naturalWidth / axe01Sprite.naturalHeight;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.life * 5);
    ctx.drawImage(axe01Sprite, -w / 2, -h / 2, w, h);
  },
  bone(b, fill) {
    ctx.translate(b.x, b.y);
    if (b.angle) ctx.rotate(b.angle);
    const hw = b.hw || 6;
    const hh = b.hh || 18;
    if (hw > hh) {
      ctx.rotate(Math.PI / 2);
      drawBoneShape(0, 0, hh * 2, hw * 2, fill);
    } else {
      drawBoneShape(0, 0, hw * 2, hh * 2, fill);
    }
  },
  card(b, fill) {
    ctx.translate(b.x, b.y);
    if (b.suit) {
      ctx.rotate(b.spinVisual === false ? 0 : (b.angle || 0));
      drawSuit(b.suit, 0, 0, b.r * 2.6, fill);
    } else {
      ctx.rotate(b.life * 6);
      ctx.fillStyle = fill;
      ctx.fillRect(-6, -10, 12, 20);
    }
  },
  suit(b, fill) {
    ctx.translate(b.x, b.y);
    if (b.angle !== undefined && b.faceVelocity !== false) ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
    drawSuit(b.suit || 'spade', 0, 0, b.r * 2.6, fill);
  },
  fire(b, fill) {
    ctx.fillStyle = fill;
    drawFlame(b.x, b.y + b.r * 0.2, b.r * 1.35, state.clock);
  },
  spear(b, fill) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle !== undefined ? b.angle : Math.atan2(b.vy, b.vx));
    drawSpearShape(0, 0, (b.hw || 20) * 2, fill);
  },
  arrow(b) {
    // green SOUL spear flying at the centre; yellow ones will switch sides
    const fill = b.reverse && !b.reversed ? '#ffe14d' : '#4dc3ff';
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    drawSpearShape(0, 0, 34, fill);
  },
  beam(b) {
    const charging = b.life < b.warn;
    ctx.translate(b.originX, b.originY);
    ctx.rotate(b.angle);
    if (charging) {
      const k = b.life / b.warn;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + 0.35 * k})`;
      ctx.fillRect(0, -1 - k * 2, 1600, 2 + k * 4);
    } else {
      const left = b.warn + b.activeFor - b.life;
      const width = b.hh * 2 * Math.min(1, Math.max(0.15, left * 6));
      ctx.fillStyle = b.beamColor || '#fff';
      ctx.fillRect(0, -width / 2, 1600, width);
    }
    if (b.drawEmitter !== false) drawEmitter(b, charging);
  },
  zone(b, fill) {
    const x = b.x - b.hw;
    const y = b.y - b.hh;
    if (b.life < b.warn) {
      const blink = Math.floor(b.life * 14) % 2 === 0;
      ctx.strokeStyle = blink ? '#ff3030' : '#7a1010';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, b.hw * 2 - 2, b.hh * 2 - 2);
      ctx.fillStyle = 'rgba(255, 40, 40, 0.12)';
      ctx.fillRect(x, y, b.hw * 2, b.hh * 2);
    } else {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, b.hw * 2, b.hh * 2);
    }
  },
  web(b, fill) {
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2;
    ctx.translate(b.x, b.y);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(-b.r, 0);
      ctx.lineTo(b.r, 0);
      ctx.stroke();
    }
  }
};

// The emitter at the start of a beam: a generic charging cannon.
function drawEmitter(b, charging) {
  const pulse = charging ? 1 + Math.sin(b.life * 40) * 0.08 : 1.1;
  ctx.save();
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.moveTo(-34, -b.hh - 10);
  ctx.lineTo(4, -b.hh - 4);
  ctx.lineTo(4, b.hh + 4);
  ctx.lineTo(-34, b.hh + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = charging ? '#55ddff' : '#fff';
  fillCircle(-10, 0, Math.max(4, b.hh * 0.7));
  ctx.restore();
}

function drawWarningOverlay(b) {
  // generic telegraph for bullets that are not dangerous yet: blink at half opacity
  return Math.floor(b.life * 12) % 2 === 0 ? 0.55 : 0.25;
}

function drawBullet(b) {
  const drawer = BULLET_DRAWERS[b.kind] || BULLET_DRAWERS.normal;
  const fill = bulletFill(b);
  ctx.save();
  if (b.warn && b.life < b.warn && b.kind !== 'zone' && b.kind !== 'beam') ctx.globalAlpha = drawWarningOverlay(b);
  if (b.alpha !== undefined) ctx.globalAlpha *= b.alpha;
  if (b.flash) ctx.globalAlpha *= 0.5;
  drawer(b, fill);
  ctx.restore();
}

function drawBullets() {
  const box = state.box;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
  ctx.clip();
  for (const b of state.bullets) if (b.clip !== false) drawBullet(b);
  ctx.restore();
  for (const b of state.bullets) if (b.clip === false) drawBullet(b);
}

// ---------------- Characters ----------------
function drawCharacters() {
  const boss = state.currentBoss;
  const battle = state.battle;

  if (boss) {
    const at = bossPosition(boss);
    let x = at.x;
    ctx.save();
    if (battle) {
      ctx.globalAlpha = battle.bossAlpha;
      // the boss shakes after a hit
      if (battle.bossHurt > 0) x += Math.sin(battle.bossHurt * 60) * 12 * battle.bossHurt;
    }
    const look = battle ? { hurt: Math.min(1, battle.bossHurt * 2), heat: battleMusicIntensity(battle) } : {};
    drawBossFigure(boss, x, at.y, state.clock, look);
    ctx.restore();
  }

  // Susie only fights Deltarune bosses; in Undertale the player is just the SOUL
  if (isUndertale()) return;
  const susieX = SUSIE_POS.x + getSusieOffset();
  ctx.save();
  if (effects.susieHurt > 0 && Math.floor(effects.susieHurt * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  if (imageReady(susieSprite)) {
    ctx.drawImage(susieSprite, susieX, SUSIE_POS.y, susieSprite.naturalWidth, susieSprite.naturalHeight);
  } else {
    ctx.fillStyle = '#7a4fd1';
    ctx.fillRect(susieX, SUSIE_POS.y, 73, 139);
  }
  ctx.restore();
}

function drawHud() {
  if (isUndertale()) drawUtStats();
  else drawPartyPanel();

  if (state.battle) drawBattleUi(state.battle);
  else if (state.gameMode === 'battle') drawCommandButtons(null);
  else drawSurvivalHud();
}

function render() {
  beginFrame();
  if (state.screen === 'title') {
    drawTitle();
    return;
  }
  if (state.screen === 'settings') {
    if (screens.settingsReturn === 'pause') renderFight();
    else drawTitle();
    drawSettings();
    return;
  }
  renderFight();
  if (state.paused) drawPauseMenu();
}

function renderFight() {
  if (state.screen === 'select') {
    drawBackground();
    drawBossSelect();
    drawOverlays();
    return;
  }

  const shake = getShakeOffset();

  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawBackground();
  drawCharacters();
  drawArena();
  if (isSoulVisible()) {
    drawBullets();
    drawShots();
    drawPlayer();
    // some bosses darken or cover parts of the board on top of everything (Tenna)
    const boss = state.currentBoss;
    if (boss && boss.drawArenaOverlay) boss.drawArenaOverlay(state.box);
  }
  drawEffects();
  ctx.restore();

  drawHud();
  drawOverlays();
  drawFlash();
}
