// Sprite versions of the bullet drawers. Loaded after every boss file: each entry wraps the
// existing code-drawn drawer and only replaces it while the sprite is available.

function spriteDrawer(kind, draw) {
  const fallback = BULLET_DRAWERS[kind];
  BULLET_DRAWERS[kind] = (b, fill) => {
    if (draw(b, fill)) return;
    if (fallback) fallback(b, fill);
  };
}

const isUtBoss = () => state.currentBoss && state.currentBoss.game === 'undertale';
const isDrBoss = () => state.currentBoss && state.currentBoss.game === 'deltarune';
const artReady = name => Boolean(attackImage(name));

// ---------------- Undertale ----------------

// Bones: the game's own end caps with a white (or cyan / orange) shaft between them.
function drawUtBone(b, fill) {
  const sans = state.currentBoss && ['sans', 'asriel'].includes(state.currentBoss.id);
  const top = sans ? 'sans_bone_top' : 'pap_bone_top';
  const bottom = sans ? 'sans_bone_bottom' : 'pap_bone_bottom';
  if (!artReady(top) || !artReady(bottom)) return false;
  const tint = artTint(fill);
  const hw = b.hw || 6;
  const hh = b.hh || 18;
  ctx.translate(b.x, b.y);
  if (b.angle) ctx.rotate(b.angle);
  if (hw > hh) ctx.rotate(Math.PI / 2);
  const thick = Math.max(6, Math.min(hw, hh) * 2);
  const long = Math.max(hw, hh) * 2;
  const capW = thick * 1.25;
  const capH = capW * ATTACK_ART[top].h / ATTACK_ART[top].w;
  ctx.fillStyle = tint || '#ffffff';
  ctx.fillRect(-thick * 0.32, -long / 2 + capH * 0.6, thick * 0.64, Math.max(0, long - capH * 1.2));
  drawArt(top, 0, -long / 2 + capH / 2, capW, capH, { tint });
  drawArt(bottom, 0, long / 2 - capH / 2, capW, capH, { tint });
  return true;
}

spriteDrawer('bone', (b, fill) => isUtBoss() && drawUtBone(b, fill));

spriteDrawer('fire', (b, fill) => {
  if (!isUtBoss() || !artReady('ut_fire')) return false;
  const size = b.r * 2.9;
  return drawArt('ut_fire', b.x, b.y, size, size, { frame: state.clock * 8 + b.x * 0.05, tint: artTint(fill) });
});

spriteDrawer('paw', b => {
  if (!artReady('toriel_hand')) return false;
  return drawArt('toriel_hand', b.x, b.y, 54, null, { frame: state.clock * 6, flipX: b.mirrored });
});

// Undyne's spears (pointing along their velocity / angle) and the green SOUL's arrows.
spriteDrawer('spear', (b, fill) => {
  if (!isUtBoss() || !artReady('undyne_spear')) return false;
  const len = (b.hw || 20) * 2;
  const angle = (b.angle !== undefined ? b.angle : Math.atan2(b.vy, b.vx)) - Math.PI / 2;
  return drawArt('undyne_spear', b.x, b.y, len * 0.25, len, { angle, tint: artTint(fill) && fill !== '#4dc3ff' ? fill : null });
});

spriteDrawer('arrow', b => {
  const name = b.reverse && !b.reversed ? 'undyne_arrow' : 'undyne_arrow_blue';
  if (!artReady(name)) return false;
  return drawArt(name, b.x, b.y, 30, null, { angle: Math.atan2(b.vy, b.vx) });
});

spriteDrawer('risingSpear', b => {
  if (!artReady('undyne_risespear') || b.life < b.warn) return false;
  const bottom = b.y + b.hh;
  const k = Math.min(1, (b.life - b.warn) / 0.08);
  const height = b.hh * 2 * k;
  for (let x = b.x - b.hw + 8; x <= b.x + b.hw - 6; x += 14) {
    drawArt('undyne_risespear', x, bottom - height / 2, 14, height);
  }
  return true;
});

// Muffet's spiders and pastries (white, like in the fight; only the strings are purple).
spriteDrawer('spider', b => drawArt('muffet_spider', b.x, b.y, 22, null));
spriteDrawer('croissant', b => drawArt('muffet_croissant', b.x, b.y, 22, null, { angle: b.angle || 0 }));
spriteDrawer('donut', b => drawArt('muffet_donut', b.x, b.y, 18, null));

// (Asriel's stars are drawn in bosses/asriel.js.)

// ---------------- Deltarune ----------------

const SUIT_ART = { spade: 'dr_spade', club: 'dr_club', diamond: 'dr_diamond', heart: 'dr_heart' };

function drawDrSuit(b, fill, spin) {
  const name = SUIT_ART[b.suit || 'spade'];
  if (!isDrBoss() || !artReady(name)) return false;
  const size = b.r * 3;
  const tint = fill === SOUL_COLORS.cyan || fill === SOUL_COLORS.orange ? fill : null;
  return drawArt(name, b.x, b.y, size, null, { angle: spin, tint });
}

spriteDrawer('suit', (b, fill) => {
  // the Roaring Knight's diamonds are long white shards
  if (state.currentBoss && state.currentBoss.id === 'knight' && b.suit === 'diamond' && artReady('knight_diamondm')) {
    return drawArt('knight_diamondm', b.x, b.y, b.r * 5, b.r * 2.4, { angle: Math.atan2(b.vy || 0, b.vx || 1), frame: state.clock * 10 });
  }
  const spin = b.angle !== undefined && b.faceVelocity !== false ? Math.atan2(b.vy, b.vx) + Math.PI / 2 : 0;
  // the sprites point right; our suits point "up" along the velocity
  return drawDrSuit(b, fill, spin - Math.PI / 2);
});

spriteDrawer('card', (b, fill) => b.suit && drawDrSuit(b, fill, (b.spinVisual === false ? 0 : (b.angle || 0)) - Math.PI / 2));

spriteDrawer('bomb', b => {
  const name = `jevil_bomb_${b.suit || 'spade'}`;
  if (!artReady(name)) return false;
  const blink = b.life > (b.fuse || 1) * 0.6 && Math.floor(b.life * 16) % 2 === 0;
  return drawArt(name, b.x, b.y, b.r * 2.8, null, { frame: blink ? 1 : 0 });
});

function drawCarousel(b, frame) {
  if (!artReady('jevil_carousel')) return false;
  ctx.fillStyle = '#d9b36b';
  ctx.fillRect(b.x - 1, b.y - 40, 2, 80);
  return drawArt('jevil_carousel', b.x, b.y, 40, null, { frame, flipX: !b.flip });
}
spriteDrawer('horse', b => drawCarousel(b, 0));
spriteDrawer('duck', b => drawCarousel(b, 1));

spriteDrawer('scythe', b => {
  if (!artReady('jevil_scythe')) return false;
  const tint = b.color && b.color.startsWith('#ff') ? '#ff4040' : null;
  return drawArt('jevil_scythe', b.x, b.y, b.r * 3.4, null, { angle: b.angle || 0, tint });
});

spriteDrawer('neoHead', b => {
  if (!artReady('sneo_head')) return false;
  const w = (b.hw || b.r) * 2.6;
  return drawArt('sneo_head', b.x, b.y, w, null, { frame: state.clock * 8, flipX: true });
});

spriteDrawer('neoHeart', b => {
  if (!artReady('sneo_wireheart')) return false;
  // the chain to his chest
  const anchorX = arena.x + arena.w + 70;
  const anchorY = arena.y + arena.h / 2;
  ctx.strokeStyle = '#9a9aa8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.quadraticCurveTo((anchorX + b.x) / 2, (anchorY + b.y) / 2 + 12, b.x, b.y);
  ctx.stroke();
  return drawArt('sneo_wireheart', b.x, b.y, b.r * 3.6, null, { frame: state.clock * 10 });
});

spriteDrawer('phone', b => {
  if (!artReady('sneo_phonehand')) return false;
  return drawArt('sneo_phonehand', b.x, b.y, 50, null, { angle: b.top ? Math.PI / 2 : -Math.PI / 2 });
});

// ---------------- Sans' blasters ----------------
// Beams fired with emitter: 'blaster' get a real Gaster Blaster that slides in, opens its jaw
// and fires (the sprite's mouth points down, so it is turned to face along the beam).
function drawGasterBlaster(b, charging) {
  if (!artReady('gaster_blaster')) return false;
  const info = ATTACK_ART.gaster_blaster;
  const width = Math.max(40, Math.min(120, b.hh * 2 * 1.9));
  const height = width * info.h / info.w;
  let frame;
  let back = 0;
  let alpha = 1;
  if (charging) {
    const k = b.life / b.warn;
    back = (1 - Math.min(1, k * 2.5)) * 70;
    alpha = Math.min(1, k * 4);
    frame = k > 0.8 ? 1 : 0;
  } else {
    const left = b.warn + b.activeFor - b.life;
    frame = 2 + (Math.floor(b.life * 24) % 2) * 2;
    back = -Math.min(10, (b.life - b.warn) * 60);
    alpha = Math.min(1, Math.max(0, left * 4 + 0.3));
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  drawArt('gaster_blaster', -height / 2 + 6 - back, 0, width, height, { frame, angle: -Math.PI / 2 });
  ctx.restore();
  return true;
}
