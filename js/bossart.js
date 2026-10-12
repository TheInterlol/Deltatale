// Boss visuals: a sprite from assets/bosses/manifest.js when one is provided,
// otherwise a neutral placeholder card (name + a small emblem of the boss' weapon).

const loadedBossArt = {};

function getBossArt(id) {
  if (id in loadedBossArt) return loadedBossArt[id];
  const entry = typeof BOSS_ASSETS !== 'undefined' ? BOSS_ASSETS[id] : null;
  let art = null;
  if (entry && entry.sprite) {
    const image = new Image();
    image.src = `assets/bosses/${id}/${entry.sprite}`;
    art = { image, frames: entry.frames || 1, fps: entry.fps || 8, scale: entry.scale || 2 };
  }
  loadedBossArt[id] = art;
  return art;
}

function getBossMusic(boss) {
  if (boss.music) return boss.music;
  const entry = typeof BOSS_ASSETS !== 'undefined' ? BOSS_ASSETS[boss.id] : null;
  if (!entry || !entry.music) return null;
  if (!boss._musicTrack) {
    boss._musicTrack = new Audio(`assets/bosses/${boss.id}/${entry.music}`);
    boss._musicTrack.loop = true;
    boss._musicTrack.volume = 0.6;
  }
  return boss._musicTrack;
}

function drawBossFigure(boss, x, y, t) {
  if (boss.draw) {
    boss.draw(x, y, t);
    return;
  }
  const art = getBossArt(boss.id);
  if (art && imageReady(art.image)) {
    const frameW = art.image.naturalWidth / art.frames;
    const frameH = art.image.naturalHeight;
    const frame = Math.floor(t * art.fps) % art.frames;
    const w = frameW * art.scale;
    const h = frameH * art.scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art.image, frame * frameW, 0, frameW, frameH, x - w / 2, y - h / 2, w, h);
    ctx.restore();
    return;
  }
  drawBossPlaceholder(boss, x, y, t);
}

function drawBossPlaceholder(boss, x, y, t) {
  const w = 104;
  const h = 128;
  const bob = Math.sin(t * 2) * 3;
  const color = boss.color || '#ffffff';

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(0, -18);
  drawEmblem(boss.emblem || 'star', color, t);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.font = TINY_FONT;
  ctx.textAlign = 'center';
  const lines = wrapText(boss.shortName || boss.name, w - 12, TINY_FONT);
  lines.slice(0, 3).forEach((line, i) => ctx.fillText(line, 0, 34 + i * 13));
  ctx.restore();
}

// Small generic icons of a boss' weapon or theme, centred on (0, 0), roughly 50px.
function drawEmblem(kind, color, t) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  switch (kind) {
    case 'flame':
      drawFlame(0, 4, 20, t);
      break;
    case 'bone':
      ctx.rotate(-0.6);
      drawBoneShape(0, 0, 8, 46, color);
      break;
    case 'spear':
      ctx.rotate(-0.8);
      drawSpearShape(0, 0, 52, color);
      break;
    case 'beam':
      ctx.fillRect(-26, -4, 52, 8);
      fillCircle(-26, 0, 9);
      break;
    case 'spade':
      drawSuit('spade', 0, 0, 30, color);
      break;
    case 'club':
      drawSuit('club', 0, 0, 30, color);
      break;
    case 'diamond':
      drawSuit('diamond', 0, 0, 30, color);
      break;
    case 'heart':
      drawSuit('heart', 0, 0, 30, color);
      break;
    case 'phone':
      fillRoundRect(-12, -22, 24, 44, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, -16, 16, 22);
      break;
    case 'web':
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos((i * Math.PI) / 3) * 26, Math.sin((i * Math.PI) / 3) * 26);
        ctx.stroke();
      }
      for (const r of [10, 20]) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'trident':
      ctx.fillRect(-2, -10, 4, 36);
      for (const dx of [-12, 0, 12]) ctx.fillRect(dx - 2, -26, 4, 18);
      ctx.fillRect(-14, -10, 28, 4);
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(-22, 14);
      ctx.lineTo(-22, -8);
      ctx.lineTo(-11, 4);
      ctx.lineTo(0, -16);
      ctx.lineTo(11, 4);
      ctx.lineTo(22, -8);
      ctx.lineTo(22, 14);
      ctx.closePath();
      ctx.fill();
      break;
    case 'sword':
      ctx.rotate(-0.8);
      ctx.fillRect(-3, -28, 6, 42);
      ctx.fillRect(-12, 12, 24, 5);
      ctx.fillRect(-2, 17, 4, 10);
      break;
    case 'note':
      fillCircle(-8, 14, 8);
      ctx.fillRect(-2, -20, 4, 34);
      ctx.fillRect(-2, -20, 16, 4);
      break;
    case 'rainbow':
      ['#ff4d4d', '#ffd34d', '#4dff6b', '#4dbaff', '#c44dff'].forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.arc(0, 14, 28 - i * 4, Math.PI, 0);
        ctx.stroke();
      });
      break;
    case 'dummy':
      ctx.fillRect(-3, -2, 6, 26);
      fillRoundRect(-14, -24, 28, 24, 6);
      fillCircle(0, -28, 9);
      break;
    case 'tear':
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.quadraticCurveTo(14, 4, 0, 16);
      ctx.quadraticCurveTo(-14, 4, 0, -20);
      ctx.fill();
      break;
    case 'dollar':
      ctx.font = `bold 46px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 16);
      break;
    case 'house':
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(0, -22);
      ctx.lineTo(22, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-16, 0, 32, 22);
      break;
    case 'wine':
      ctx.beginPath();
      ctx.moveTo(-16, -22);
      ctx.lineTo(16, -22);
      ctx.quadraticCurveTo(16, 2, 0, 4);
      ctx.quadraticCurveTo(-16, 2, -16, -22);
      ctx.fill();
      ctx.fillRect(-2, 4, 4, 16);
      ctx.fillRect(-12, 18, 24, 4);
      break;
    case 'tornado':
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.sin(t * 3 + i) * 3, -18 + i * 9, 22 - i * 4, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'gear':
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + t;
        ctx.fillRect(Math.cos(a) * 20 - 3, Math.sin(a) * 20 - 3, 6, 6);
      }
      break;
    default: {
      // a five-pointed star
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 24 : 10;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ---------------- Shared projectile shapes (also used by drawBullets) ----------------
function drawFlame(x, y, size, t = 0) {
  const flicker = Math.sin(t * 20 + x) * size * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y - size - flicker);
  ctx.quadraticCurveTo(x + size * 0.9, y - size * 0.1, x + size * 0.55, y + size * 0.55);
  ctx.quadraticCurveTo(x, y + size * 0.95, x - size * 0.55, y + size * 0.55);
  ctx.quadraticCurveTo(x - size * 0.9, y - size * 0.1, x, y - size - flicker);
  ctx.fill();
}

function drawBoneShape(x, y, thickness, length, color = '#fff') {
  ctx.fillStyle = color;
  const hw = thickness / 2;
  const hh = length / 2;
  ctx.fillRect(x - hw, y - hh, thickness, length);
  const knob = Math.max(3, thickness * 0.72);
  fillCircle(x - hw * 0.7, y - hh, knob);
  fillCircle(x + hw * 0.7, y - hh, knob);
  fillCircle(x - hw * 0.7, y + hh, knob);
  fillCircle(x + hw * 0.7, y + hh, knob);
}

// A spear pointing right (+x), centred on (x, y).
function drawSpearShape(x, y, length, color = '#4dc3ff') {
  ctx.fillStyle = color;
  ctx.fillRect(x - length / 2, y - 2, length * 0.75, 4);
  ctx.beginPath();
  ctx.moveTo(x + length / 2, y);
  ctx.lineTo(x + length / 4, y - 8);
  ctx.lineTo(x + length / 4 + 4, y);
  ctx.lineTo(x + length / 4, y + 8);
  ctx.closePath();
  ctx.fill();
}

function drawSuit(suit, x, y, size, color) {
  const s = size / 30;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (suit === 'heart') {
    ctx.moveTo(0, 13);
    ctx.bezierCurveTo(-18, 0, -15, -14, -7, -14);
    ctx.bezierCurveTo(-3, -14, 0, -10, 0, -7);
    ctx.bezierCurveTo(0, -10, 3, -14, 7, -14);
    ctx.bezierCurveTo(15, -14, 18, 0, 0, 13);
    ctx.fill();
  } else if (suit === 'diamond') {
    ctx.moveTo(0, -15);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 15);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
  } else if (suit === 'spade') {
    ctx.moveTo(0, -15);
    ctx.bezierCurveTo(18, 0, 14, 12, 4, 8);
    ctx.lineTo(7, 15);
    ctx.lineTo(-7, 15);
    ctx.lineTo(-4, 8);
    ctx.bezierCurveTo(-14, 12, -18, 0, 0, -15);
    ctx.fill();
  } else {
    fillCircle(0, -7, 7);
    fillCircle(-8, 3, 7);
    fillCircle(8, 3, 7);
    ctx.beginPath();
    ctx.moveTo(-2, 2);
    ctx.lineTo(2, 2);
    ctx.lineTo(6, 15);
    ctx.lineTo(-6, 15);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
