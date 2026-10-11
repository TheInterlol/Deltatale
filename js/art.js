// Drawing helpers shared by the HUD, bullets and the fan-made boss art.
// All boss art in this project is drawn procedurally (original approximations),
// so no game sprites have to be redistributed. A boss can still use an image:
// see `boss.sprite` in js/bosses.js.

function fillRoundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function strokeRoundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();
}

function fillCircle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function fillEllipse(x, y, rx, ry, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
  ctx.fill();
}

function fillPoly(points) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// -------------- SOUL heart --------------
// The red SOUL sprite is tinted per colour once and cached.
const tintedSouls = {};

function getSoulImage(color) {
  if (!imageReady(ASSETS.soul)) return null;
  if (tintedSouls[color]) return tintedSouls[color];
  const c = document.createElement('canvas');
  c.width = ASSETS.soul.naturalWidth;
  c.height = ASSETS.soul.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(ASSETS.soul, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  tintedSouls[color] = c;
  return c;
}

function drawHeart(x, y, size, color = '#ff0000', rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const img = getSoulImage(color);
  if (img) {
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = color;
    const s = size / 2;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.9);
    ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.6, -s * 1.1, 0, -s * 0.4);
    ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.2, -s * 0.1, 0, s * 0.9);
    ctx.fill();
  }
  ctx.restore();
}

// -------------- Deltarune party members (fan-made, small) --------------
function drawKris(x, y, t, pose = 'idle') {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3) * 1.5);
  const lunge = pose === 'attack' ? 14 : 0;
  ctx.translate(lunge, 0);
  // cape
  ctx.fillStyle = '#d43a6a';
  fillPoly([-14, -18, -24, 30, 4, 30, 2, -16]);
  // body armour
  ctx.fillStyle = '#2b3a8f';
  fillRoundRect(-12, -20, 24, 34, 5);
  ctx.fillStyle = '#5c74e0';
  ctx.fillRect(-12, -2, 24, 4);
  // legs
  ctx.fillStyle = '#1b2459';
  ctx.fillRect(-10, 14, 8, 18);
  ctx.fillRect(2, 14, 8, 18);
  // head + hair
  ctx.fillStyle = '#e8c9a8';
  fillCircle(0, -30, 11);
  ctx.fillStyle = '#4a2a1c';
  fillPoly([-13, -30, -12, -43, 12, -43, 14, -28, 6, -34, -2, -26, -6, -33]);
  // sword
  ctx.strokeStyle = '#cfd7ff';
  ctx.lineWidth = 3;
  line(14, -6, 30, -26);
  ctx.restore();
}

function drawSusie(x, y, t, pose = 'idle') {
  const img = ASSETS.susie;
  const lunge = pose === 'attack' ? 16 : 0;
  if (imageReady(img)) {
    const scale = 0.62;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, x - w / 2 + lunge, y - h / 2 + Math.sin(t * 3 + 1) * 1.5, w, h);
    return;
  }
  ctx.fillStyle = '#7a4fd1';
  fillRoundRect(x - 18 + lunge, y - 40, 36, 80, 8);
}

function drawRalsei(x, y, t, pose = 'idle') {
  ctx.save();
  ctx.translate(x + (pose === 'attack' ? 12 : 0), y + Math.sin(t * 3 + 2) * 1.5);
  // robe
  ctx.fillStyle = '#1d6b3a';
  fillPoly([-16, -14, 16, -14, 20, 30, -20, 30]);
  ctx.fillStyle = '#e8467a';
  ctx.fillRect(-16, 0, 32, 4);
  // face
  ctx.fillStyle = '#ffffff';
  fillCircle(0, -24, 10);
  ctx.fillStyle = '#000';
  ctx.fillRect(-5, -26, 2, 4);
  ctx.fillRect(3, -26, 2, 4);
  // big green hat
  ctx.fillStyle = '#2f9e4f';
  fillPoly([-22, -28, 22, -28, 6, -40, 2, -62, -8, -40]);
  ctx.restore();
}

const PARTY_ART = { kris: drawKris, susie: drawSusie, ralsei: drawRalsei };
