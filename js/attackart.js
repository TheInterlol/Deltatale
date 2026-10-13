// Sprites for projectiles and effects (see js/attack_art.js and tools/build_attacks.py).
// Every drawer that uses them keeps a code-drawn fallback, so a missing file never breaks a fight.

const attackImages = {};
const tintedArt = {};

function attackImage(name) {
  if (typeof ATTACK_ART === 'undefined' || !ATTACK_ART[name]) return null;
  let img = attackImages[name];
  if (!img) {
    img = attackImages[name] = new Image();
    img.src = `assets/attacks/${name}.png`;
  }
  return imageReady(img) ? img : null;
}

// Load everything up front, so sprites are there the first time an attack uses them.
function preloadAttackArt() {
  if (typeof ATTACK_ART === 'undefined') return;
  for (const name of Object.keys(ATTACK_ART)) attackImage(name);
}

// A recoloured copy of a sprite (white bones -> cyan / orange), cached per colour.
function tintedAttackImage(name, color) {
  const img = attackImage(name);
  if (!img) return null;
  const key = `${name}|${color}`;
  if (!tintedArt[key]) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tintedArt[key] = c;
  }
  return tintedArt[key];
}

// Draw frame `frame` of sprite `name` centred on (x, y), w x h on screen (h defaults to keeping the
// aspect ratio). Returns false when the sprite isn't available (the caller then draws its fallback).
function drawArt(name, x, y, w, h, { frame = 0, angle = 0, tint = null, flipX = false } = {}) {
  const info = typeof ATTACK_ART !== 'undefined' && ATTACK_ART[name];
  const img = tint ? tintedAttackImage(name, tint) : attackImage(name);
  if (!info || !img) return false;
  const f = ((Math.floor(frame) % info.frames) + info.frames) % info.frames;
  if (h === undefined || h === null) h = w * info.h / info.w;
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  if (flipX) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, f * info.w, 0, info.w, info.h, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

// White sprites take the bullet's colour when it is cyan / orange (or another tint).
function artTint(fill) {
  return fill && fill.toLowerCase() !== '#ffffff' && fill.toLowerCase() !== '#fff' && fill !== 'white' ? fill : null;
}
