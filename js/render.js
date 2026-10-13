// Scene drawing: background, bullet board, bullets, characters, HUD and the boss select screen.

// Deltarune battles have a slowly scrolling grid, Undertale ones are plain black.
function drawBackground() {
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
  // a boss with its own backdrop (Asriel's shifting colours)
  const boss = state.screen === 'fight' && state.currentBoss;
  if (boss && boss.drawBackdrop && boss.drawBackdrop(state.battle)) return;
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
  // an invisible board: the SOUL just moves around the lower part of the screen
  if (boss && boss.hideBoard && isSoulVisible()) return;

  ctx.fillStyle = isUndertale() ? '#000' : '#0d0d0d';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  if (boss && boss.drawArenaBackground && isSoulVisible()) boss.drawArenaBackground(box);

  // the frame goes on top, otherwise the fill would cover its inner half
  if (!isUndertale() && isSoulVisible()) {
    // Deltarune's bullet board: a green frame with a darker inner line
    ctx.strokeStyle = '#0b5d12';
    ctx.lineWidth = 6;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = '#25d43a';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);
  } else {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
  }
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
    if (b.hw) {
      ctx.translate(b.x, b.y);
      if (b.angle) ctx.rotate(b.angle);
      ctx.fillStyle = fill;
      ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
      // a lighter top edge gives blocks some volume
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(-b.hw, -b.hh, b.hw * 2, Math.min(3, b.hh));
      return;
    }
    // a pellet: soft halo, solid body, bright core
    ctx.fillStyle = withAlpha(fill.startsWith('#') ? fill : '#ffffff', 0.18);
    fillCircle(b.x, b.y, b.r + 3);
    ctx.fillStyle = fill;
    fillCircle(b.x, b.y, b.r);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    fillCircle(b.x - b.r * 0.3, b.y - b.r * 0.3, Math.max(1, b.r * 0.35));
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
    if (hw > hh) ctx.rotate(Math.PI / 2);
    const thick = Math.min(hw, hh) * 2;
    const long = Math.max(hw, hh) * 2;
    drawBoneSprite(0, 0, thick, long, fill);
  },
  card(b, fill) {
    ctx.translate(b.x, b.y);
    if (b.suit) {
      ctx.rotate(b.spinVisual === false ? 0 : (b.angle || 0));
      drawSuitBullet(b.suit, b.r * 2.6, fill);
    } else {
      ctx.rotate(b.life * 6);
      ctx.fillStyle = '#1a0a2a';
      ctx.fillRect(-7, -11, 14, 22);
      ctx.fillStyle = fill;
      ctx.fillRect(-6, -10, 12, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(-4, -8, 8, 2);
    }
  },
  suit(b, fill) {
    ctx.translate(b.x, b.y);
    if (b.angle !== undefined && b.faceVelocity !== false) ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
    drawSuitBullet(b.suit || 'spade', b.r * 2.6, fill);
  },
  fire(b, fill) {
    const size = b.r * 1.35;
    const y = b.y + b.r * 0.2;
    ctx.fillStyle = withAlpha(fill.startsWith('#') ? fill : '#ffffff', 0.22);
    drawFlame(b.x, y + 1, size * 1.3, state.clock + b.x * 0.1);
    ctx.fillStyle = fill;
    drawFlame(b.x, y, size, state.clock + b.x * 0.1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    drawFlame(b.x, y + size * 0.3, size * 0.45, state.clock * 1.3 + b.y * 0.1);
  },
  spear(b, fill) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle !== undefined ? b.angle : Math.atan2(b.vy, b.vx));
    drawSpearSprite((b.hw || 20) * 2, fill);
  },
  arrow(b) {
    // green SOUL spear flying at the centre; yellow ones will switch sides
    const fill = b.reverse && !b.reversed ? '#ffe14d' : '#4dc3ff';
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    drawSpearSprite(36, fill);
  },
  beam(b) {
    const charging = b.life < b.warn;
    ctx.translate(b.originX, b.originY);
    ctx.rotate(b.angle);
    const color = b.beamColor || '#ffffff';
    if (charging) {
      // a thin aiming line that tightens as the shot charges
      const k = b.life / b.warn;
      ctx.fillStyle = withAlpha(color.startsWith('#') ? color : '#ffffff', 0.15 + 0.35 * k);
      const w = 2 + (1 - k) * 10;
      ctx.fillRect(0, -w / 2, 1600, w);
      ctx.fillStyle = withAlpha('#ffffff', 0.3 + 0.5 * k);
      ctx.fillRect(0, -0.5, 1600, 1);
    } else {
      const left = b.warn + b.activeFor - b.life;
      const grow = Math.min(1, (b.life - b.warn) * 14);
      const fadeOut = Math.min(1, Math.max(0.12, left * 6));
      const width = b.hh * 2 * grow * fadeOut * (1 + Math.sin(b.life * 60) * 0.05);
      ctx.fillStyle = withAlpha(color.startsWith('#') ? color : '#ffffff', 0.3);
      ctx.fillRect(0, -width * 0.75, 1600, width * 1.5);
      ctx.fillStyle = color;
      ctx.fillRect(0, -width / 2, 1600, width);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, -width / 5, 1600, width / 2.5);
    }
    if (b.drawEmitter !== false && !(b.emitter === 'blaster' && drawGasterBlaster(b, charging))) drawEmitter(b, charging);
  },
  zone(b, fill) {
    const x = b.x - b.hw;
    const y = b.y - b.hh;
    const w = b.hw * 2;
    const h = b.hh * 2;
    if (b.life < b.warn) {
      // hazard stripes that speed up and brighten just before the hit
      const k = b.life / b.warn;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = `rgba(255, 40, 40, ${0.08 + 0.14 * k})`;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = `rgba(255, 60, 60, ${0.12 + 0.2 * k})`;
      const shift = (state.clock * (40 + k * 120)) % 16;
      for (let sx = x - h - 16 + shift; sx < x + w; sx += 16) {
        ctx.beginPath();
        ctx.moveTo(sx, y + h);
        ctx.lineTo(sx + 7, y + h);
        ctx.lineTo(sx + 7 + h, y);
        ctx.lineTo(sx + h, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      const blink = Math.floor(b.life * (10 + k * 14)) % 2 === 0;
      ctx.strokeStyle = blink ? '#ff3030' : '#8a1414';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      if (w > 30 && h > 30) {
        ctx.fillStyle = blink ? '#ff5050' : '#a01818';
        ctx.font = `bold 20px ${TITLE_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('!', x + w / 2, y + h / 2 + 7);
      }
    } else {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(x, y, w, Math.min(4, h));
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
    ctx.beginPath();
    ctx.arc(0, 0, b.r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
};

// A bone the way the games draw them: a shaft with two round knobs at each end and a dark
// outline, so white bones read on any background.
function drawBoneSprite(x, y, thickness, length, color = '#fff') {
  const hw = thickness / 2;
  const hh = length / 2;
  const knob = Math.max(3, thickness * 0.62);
  const shape = (grow) => {
    ctx.fillRect(x - hw - grow, y - hh, thickness + grow * 2, length);
    for (const sy of [-1, 1]) {
      fillCircle(x - hw * 0.62, y + sy * hh, knob + grow);
      fillCircle(x + hw * 0.62, y + sy * hh, knob + grow);
    }
  };
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  shape(1.2);
  ctx.fillStyle = color;
  shape(0);
  // a slight shade along one side
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(x + hw * 0.3, y - hh, hw * 0.7, length);
}

// A spear pointing right (+x), centred on (0, 0): shaft, binding and a barbed head.
function drawSpearSprite(length, color = '#4dc3ff') {
  const half = length / 2;
  ctx.fillStyle = withAlpha(color.startsWith('#') ? color : '#4dc3ff', 0.25);
  ctx.fillRect(-half, -3, length * 0.78, 6);
  ctx.fillStyle = color;
  ctx.fillRect(-half, -1.5, length * 0.78, 3);
  ctx.fillRect(-half, -3, 4, 6);
  ctx.fillRect(half * 0.35, -3, 3, 6);
  ctx.beginPath();
  ctx.moveTo(half + 2, 0);
  ctx.lineTo(half * 0.5, -8);
  ctx.lineTo(half * 0.58, 0);
  ctx.lineTo(half * 0.5, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half * 0.62, -4);
  ctx.lineTo(half * 0.66, 0);
  ctx.closePath();
  ctx.fill();
}

// Card-suit bullets with a dark outline and a highlight (Deltarune style).
function drawSuitBullet(suit, size, fill) {
  drawSuit(suit, 0, 1.5, size * 1.18, 'rgba(10, 0, 20, 0.85)');
  drawSuit(suit, 0, 0, size, fill);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  fillCircle(-size * 0.14, -size * 0.12, Math.max(1, size * 0.08));
}

// The emitter at the start of a beam: a mechanical cannon whose jaws open when it fires.
function drawEmitter(b, charging) {
  const k = charging ? b.life / b.warn : 1;
  const open = charging ? k * 0.35 : 0.5 + Math.sin(b.life * 50) * 0.04;
  const size = Math.max(10, b.hh + 6);
  const core = b.beamColor || '#5ed0ff';
  ctx.save();
  ctx.translate(-6, 0);
  // recoil when firing
  if (!charging) ctx.translate(-Math.min(6, (b.life - b.warn) * 40), 0);
  ctx.fillStyle = '#d8dce6';
  ctx.strokeStyle = '#3a3f4f';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * open);
    ctx.beginPath();
    ctx.moveTo(-size * 2.2, side * size * 0.2);
    ctx.lineTo(-size * 1.6, side * size * 1.15);
    ctx.lineTo(size * 0.4, side * size * 0.75);
    ctx.lineTo(size * 0.7, side * size * 0.15);
    ctx.lineTo(-size * 0.2, side * size * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // the glowing core
  ctx.fillStyle = withAlpha(core.startsWith('#') ? core : '#5ed0ff', 0.35 + 0.4 * k);
  fillCircle(-size * 0.4, 0, size * (0.5 + 0.25 * k));
  ctx.fillStyle = charging ? '#ffffff' : core;
  fillCircle(-size * 0.4, 0, size * 0.28 * (0.6 + k * 0.4));
  ctx.restore();
}

function drawWarningOverlay(b) {
  // generic telegraph for bullets that are not dangerous yet: blink at half opacity
  return Math.floor(b.life * 12) % 2 === 0 ? 0.55 : 0.25;
}

// Kinds that are big, static or draw their own telegraph: no pop-in and no motion trail.
const NO_FX_KINDS = new Set(['beam', 'zone', 'wall', 'key', 'treasure', 'exit', 'lightPillar', 'boneField', 'risingSpear', 'crack', 'slashLine', 'knightStar', 'knightSword', 'tunnelSword']);

function drawBullet(b, fx = true) {
  const drawer = BULLET_DRAWERS[b.kind] || BULLET_DRAWERS.normal;
  const fill = bulletFill(b);
  ctx.save();
  if (b.warn && b.life < b.warn && b.kind !== 'zone' && b.kind !== 'beam' && !b.ownWarn) ctx.globalAlpha = drawWarningOverlay(b);
  if (b.alpha !== undefined) ctx.globalAlpha *= b.alpha;
  if (b.flash) ctx.globalAlpha *= 0.5;
  const plain = NO_FX_KINDS.has(b.kind) || b.noFx;
  // pop in: bullets grow from 40 % to full size in their first 0.08 s
  if (fx && !plain && b.life < 0.08 && b.x !== undefined) {
    const k = 0.4 + 0.6 * (b.life / 0.08);
    ctx.translate(b.x, b.y);
    ctx.scale(k, k);
    ctx.translate(-b.x, -b.y);
  }
  drawer(b, fill);
  ctx.restore();
}

// Fast bullets leave a short fading trail.
function drawBulletTrail(b) {
  if (NO_FX_KINDS.has(b.kind) || b.noFx || b.noTrail || b.harmless) return;
  const vx = b.vx || 0;
  const vy = b.vy || 0;
  const speed = Math.hypot(vx, vy);
  if (speed < 230 || (b.hw && b.hw > 30) || (b.hh && b.hh > 30)) return;
  const x0 = b.x;
  const y0 = b.y;
  for (let i = 3; i >= 1; i--) {
    b.x = x0 - vx * 0.012 * i;
    b.y = y0 - vy * 0.012 * i;
    ctx.save();
    ctx.globalAlpha = 0.09 * (4 - i);
    drawBullet(b, false);
    ctx.restore();
  }
  b.x = x0;
  b.y = y0;
}

function drawBullets() {
  const box = state.box;
  // Deltarune shows bullets everywhere (the board only limits the SOUL); Undertale clips them
  if (!isUndertale() || (state.currentBoss && state.currentBoss.freeBullets)) {
    const trails = state.bullets.length < 140;
    for (const b of state.bullets) {
      if (trails) drawBulletTrail(b);
      drawBullet(b);
    }
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
  ctx.clip();
  const trails = state.bullets.length < 140;
  for (const b of state.bullets) {
    if (b.clip === false) continue;
    if (trails) drawBulletTrail(b);
    drawBullet(b);
  }
  ctx.restore();
  for (const b of state.bullets) if (b.clip === false) drawBullet(b);
}

// ---------------- Characters ----------------
function drawCharacters() {
  const boss = state.currentBoss;
  const battle = state.battle;

  // a boss that fills the whole screen draws itself (Omega Flowey)
  if (boss && boss.drawScene) {
    ctx.save();
    if (battle) ctx.globalAlpha = battle.bossAlpha;
    boss.drawScene(battle);
    ctx.restore();
  } else if (boss) {
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

  if (state.battle) {
    drawBattleUi(state.battle);
    // extra HUD a boss brings along (Mettaton EX's ratings graph)
    if (state.battle.boss.drawHud) state.battle.boss.drawHud(state.battle);
  } else if (state.gameMode === 'battle') drawCommandButtons(null);
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
    // props around the board that bullets fly over (Sweet Cap'n Cakes' speakers and dancers)
    const decorBoss = state.currentBoss;
    if (decorBoss && decorBoss.drawArenaDecor) decorBoss.drawArenaDecor(state.box);
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
