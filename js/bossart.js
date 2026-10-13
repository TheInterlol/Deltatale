// Boss visuals: a sprite from assets/bosses/manifest.js when one is provided,
// otherwise a neutral placeholder card (name + a small emblem of the boss' weapon).

const loadedBossArt = {};

function bossAssetPath(id, file) {
  return file.startsWith('assets/') ? file : `assets/bosses/${id}/${file}`;
}

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function getBossArt(id) {
  if (id in loadedBossArt) return loadedBossArt[id];
  const entry = typeof BOSS_ASSETS !== 'undefined' ? BOSS_ASSETS[id] : null;
  let art = null;
  if (entry && entry.sprite) {
    art = {
      image: loadImage(bossAssetPath(id, entry.sprite)),
      hurt: entry.hurt ? loadImage(bossAssetPath(id, entry.hurt)) : null,
      frames: entry.frames || 1,
      fps: entry.fps || 8,
      scale: entry.scale || 2
    };
  }
  loadedBossArt[id] = art;
  return art;
}

// Music for a fight: the boss' own audio, a file from the manifest, or its original chiptune song.
function getBossMusic(boss) {
  if (boss.music) return boss.music;
  const entry = typeof BOSS_ASSETS !== 'undefined' ? BOSS_ASSETS[boss.id] : null;
  if (!entry || !entry.music) return songMusic(boss.song || boss.id);
  if (!boss._musicTrack) {
    boss._musicTrack = new Audio(bossAssetPath(boss.id, entry.music));
    boss._musicTrack.loop = true;
  }
  return boss._musicTrack;
}

// The tallest a boss sprite may be drawn, and where its feet stand relative to its position.
const BOSS_SPRITE_MAX_H = 172;
const BOSS_SPRITE_FOOT = 70;

// opts: { hurt, heat } - how the boss reacts; { maxH } - fit into a smaller space (menus)
function drawBossFigure(boss, x, y, t, opts = {}) {
  const art = getBossArt(boss.id);
  if (art && imageReady(art.image)) {
    const useHurt = opts.hurt > 0.15 && art.hurt && imageReady(art.hurt);
    const image = useHurt ? art.hurt : art.image;
    const frames = useHurt ? 1 : art.frames;
    const frameW = image.naturalWidth / frames;
    const frameH = image.naturalHeight;
    const frame = Math.floor(t * art.fps) % frames;
    const maxH = opts.maxH || BOSS_SPRITE_MAX_H;
    const scale = opts.scale ? Math.min(opts.scale, maxH / frameH) : Math.min(art.scale, maxH / frameH);
    const w = frameW * scale;
    const h = frameH * scale;
    const foot = opts.maxH ? h / 2 : Math.min(BOSS_SPRITE_FOOT, h / 2 + 10);
    ctx.save();
    // pixel art stays crisp when enlarged; shrunk sprites are smoothed so no pixels drop out
    ctx.imageSmoothingEnabled = scale < 1;
    ctx.drawImage(image, frame * frameW, 0, frameW, frameH, x - w / 2, y + foot - h, w, h);
    if (opts.hurt > 0.15 && !useHurt) {
      // no hurt sprite: flash it white instead
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(image, frame * frameW, 0, frameW, frameH, x - w / 2, y + foot - h, w, h);
    }
    ctx.restore();
    return;
  }
  if (boss.draw) {
    boss.draw(x, y, t);
    return;
  }
  drawBossPresence(boss, x, y, t, opts);
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
      ctx.font = `bold 46px ${TITLE_FAMILY}`;
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
    case 'camera':
      fillRoundRect(-24, -14, 48, 32, 5);
      ctx.fillRect(-10, -20, 16, 8);
      ctx.fillStyle = '#000';
      fillCircle(0, 2, 11);
      ctx.fillStyle = color;
      fillCircle(0, 2, 6);
      ctx.fillStyle = '#000';
      fillCircle(-2, 0, 2);
      break;
    case 'pumpkin':
      for (const dx of [-11, 0, 11]) {
        ctx.beginPath();
        ctx.ellipse(dx, 4, 11, 17, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillRect(-2, -20, 5, 9);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(-12, -2); ctx.lineTo(-5, -2); ctx.lineTo(-8.5, -9); ctx.closePath();
      ctx.moveTo(12, -2); ctx.lineTo(5, -2); ctx.lineTo(8.5, -9); ctx.closePath();
      ctx.fill();
      ctx.fillRect(-11, 8, 22, 4);
      break;
    case 'tv':
      fillRoundRect(-24, -16, 48, 34, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(-19, -11, 32, 24);
      ctx.fillStyle = color;
      fillCircle(18, -4, 2);
      fillCircle(18, 6, 2);
      ctx.beginPath();
      ctx.moveTo(-6, -16); ctx.lineTo(-14, -28);
      ctx.moveTo(6, -16); ctx.lineTo(14, -28);
      ctx.stroke();
      ctx.fillRect(-14, -4 + Math.sin(t * 9) * 4, 22, 2);
      break;
    case 'hammer':
      ctx.rotate(-0.5);
      ctx.fillRect(-3, -8, 6, 36);
      fillRoundRect(-18, -24, 36, 18, 3);
      break;
    case 'eye': {
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.quadraticCurveTo(0, -24, 28, 0);
      ctx.quadraticCurveTo(0, 24, -28, 0);
      ctx.fill();
      ctx.fillStyle = '#000';
      fillCircle(Math.sin(t * 1.3) * 5, 0, 9);
      ctx.fillStyle = color;
      fillCircle(Math.sin(t * 1.3) * 5 + 3, -3, 2.5);
      break;
    }
    case 'bolt':
      ctx.beginPath();
      ctx.moveTo(6, -28); ctx.lineTo(-14, 4); ctx.lineTo(-1, 4);
      ctx.lineTo(-8, 28); ctx.lineTo(14, -6); ctx.lineTo(1, -6);
      ctx.closePath();
      ctx.fill();
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 + t * 0.3;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 14, Math.sin(a) * 14, 10, 7, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      fillCircle(0, 0, 8);
      break;
    case 'scythe':
      ctx.rotate(-0.4);
      ctx.fillRect(-2, -26, 4, 54);
      ctx.beginPath();
      ctx.moveTo(2, -26);
      ctx.quadraticCurveTo(30, -26, 30, -2);
      ctx.quadraticCurveTo(22, -18, 2, -18);
      ctx.closePath();
      ctx.fill();
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
// A flame: a round base with three flickering tongues (the middle one tallest).
function drawFlame(x, y, size, t = 0) {
  const f1 = Math.sin(t * 19 + x * 0.7) * size * 0.12;
  const f2 = Math.sin(t * 23 + y * 0.5) * size * 0.1;
  const f3 = Math.sin(t * 17 + x * 0.3 + y * 0.2) * size * 0.1;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.62, y + size * 0.15);
  ctx.quadraticCurveTo(x - size * 0.7, y - size * 0.45, x - size * 0.42 + f3, y - size * 0.72);
  ctx.quadraticCurveTo(x - size * 0.3, y - size * 0.42, x - size * 0.18, y - size * 0.5);
  ctx.quadraticCurveTo(x - size * 0.12, y - size * 0.9, x + f1, y - size * 1.15);
  ctx.quadraticCurveTo(x + size * 0.18, y - size * 0.75, x + size * 0.22, y - size * 0.5);
  ctx.quadraticCurveTo(x + size * 0.34, y - size * 0.5, x + size * 0.46 + f2, y - size * 0.78);
  ctx.quadraticCurveTo(x + size * 0.72, y - size * 0.4, x + size * 0.62, y + size * 0.15);
  ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.7, x, y + size * 0.72);
  ctx.quadraticCurveTo(x - size * 0.5, y + size * 0.7, x - size * 0.62, y + size * 0.15);
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
