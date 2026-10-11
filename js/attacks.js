// Reusable attack pieces shared by several bosses: bones, Gaster Blasters and green-SOUL spears.
const BONE_WIDTH = 12;

// -------------- Bones --------------
function spawnBone(x, y, w, h, vx = 0, vy = 0, props = {}) {
  return spawn(Object.assign({ kind: 'bone', shape: 'rect', x, y, w, h, vx, vy }, props));
}

// A vertical bone sticking up from the board floor (its foot hides below the floor).
function floorBone(x, height, vx = 0, props = {}) {
  const bottom = board.target.y + board.target.h - BOARD_BORDER;
  return spawnBone(x, bottom - height / 2 + 8, BONE_WIDTH, height + 16, vx, 0, props);
}

// A vertical bone hanging from the board ceiling.
function ceilingBone(x, height, vx = 0, props = {}) {
  const top = board.target.y + BOARD_BORDER;
  return spawnBone(x, top + height / 2 - 8, BONE_WIDTH, height + 16, vx, 0, props);
}

// A horizontal bone sticking out of the left or right wall.
function wallBone(side, y, length, vy = 0, props = {}) {
  const t = board.target;
  const x = side === 'left' ? t.x + BOARD_BORDER + length / 2 - 8 : t.x + t.w - BOARD_BORDER - length / 2 + 8;
  return spawnBone(x, y, length + 16, BONE_WIDTH, 0, vy, props);
}

// Bones that start hidden inside a wall and then stab out of it (Sans' slam attacks).
// side: which wall ('down' = floor). A short warning outline shows first.
function boneStab(side, { length = 40, delay = 0.35, stay = 0.4, gap = 16, color = 'white' } = {}) {
  const t = board.target;
  const b = BOARD_BORDER;
  const horizontal = side === 'left' || side === 'right';
  const span = horizontal ? t.h - b * 2 : t.w - b * 2;
  const count = Math.ceil(span / gap);
  const bones = [];

  const warn = horizontal
    ? spawn({ kind: 'warning', shape: 'none', x: side === 'left' ? t.x + b + length / 2 : t.x + t.w - b - length / 2, y: t.y + t.h / 2, w: length, h: span, maxLife: delay })
    : spawn({ kind: 'warning', shape: 'none', x: t.x + t.w / 2, y: side === 'up' ? t.y + b + length / 2 : t.y + t.h - b - length / 2, w: span, h: length, maxLife: delay });
  warn.fill = '#ff3030';

  for (let i = 0; i < count; i++) {
    const pos = (horizontal ? t.y + b : t.x + b) + gap / 2 + i * gap;
    const bone = spawn({
      kind: 'bone', shape: 'rect', color, minLife: 99, maxLife: delay + 0.15 + stay + 0.2,
      w: horizontal ? length + 16 : BONE_WIDTH, h: horizontal ? BONE_WIDTH : length + 16,
      manual: true, harmless: true,
      update(bone) {
        // 0 = hidden in the wall, 1 = fully out
        const life = bone.life;
        let k = 0;
        if (life > delay) k = Math.min(1, (life - delay) / 0.12);
        if (life > delay + 0.12 + stay) k = Math.max(0, 1 - (life - delay - 0.12 - stay) / 0.2);
        bone.harmless = k < 0.3;
        const out = (length + 8) * k - 8;
        if (side === 'down') { bone.x = pos; bone.y = t.y + t.h - b - out + (length + 16) / 2 - 8; }
        if (side === 'up') { bone.x = pos; bone.y = t.y + b + out - (length + 16) / 2 + 8; }
        if (side === 'left') { bone.y = pos; bone.x = t.x + b + out - (length + 16) / 2 + 8; }
        if (side === 'right') { bone.y = pos; bone.x = t.x + t.w - b - out + (length + 16) / 2 - 8; }
      }
    });
    bone.update(bone);
    bones.push(bone);
  }
  if (delay > 0) sfx.warn();
  return bones;
}

// -------------- Gaster Blaster --------------
// Flies in, aims, charges, fires a beam along `angle`, then recoils away.
function spawnBlaster({ x, y, angle, from = null, delay = 0, charge = 0.32, fire = 0.42, width = 36, size = 1, karma = 1, damage = null }) {
  const enter = 0.3;
  const start = from || { x: x - Math.cos(angle) * 220, y: y - Math.sin(angle) * 220 };
  const startAngle = angle + Math.PI * 0.6;
  let beam = null;

  return spawn({
    kind: 'blaster', shape: 'none', noClip: true, manual: true, margin: 9999,
    x: start.x, y: start.y, angle: startAngle, alpha: 0,
    maxLife: delay + enter + charge + fire + 0.7,
    size,
    mouth: 0,
    update(b, dt) {
      const t = b.life - delay;
      if (t < 0) return;
      b.alpha = 1;
      if (t < enter) {
        const k = 1 - Math.pow(1 - t / enter, 3);
        b.x = start.x + (x - start.x) * k;
        b.y = start.y + (y - start.y) * k;
        b.angle = startAngle + (angle - startAngle) * k;
      } else if (t < enter + charge) {
        b.x = x;
        b.y = y;
        b.angle = angle;
        b.mouth = (t - enter) / charge;
      } else if (t < enter + charge + fire) {
        b.mouth = 1;
        if (!beam) {
          sfx.blaster();
          addShake(3);
          beam = spawn({
            kind: 'beam', shape: 'beam', noClip: true, manual: true, margin: 9999,
            x: x + Math.cos(angle) * 30 * size, y: y + Math.sin(angle) * 30 * size,
            angle, w: width * size, fullWidth: width * size, maxLife: fire + 0.2, karma, damage,
            update(beamB) {
              const k = beamB.life / (fire + 0.2);
              const grow = Math.min(1, beamB.life / 0.06);
              const shrink = k > 0.75 ? Math.max(0, 1 - (k - 0.75) / 0.25) : 1;
              beamB.w = beamB.fullWidth * grow * shrink * (0.92 + Math.sin(beamB.life * 60) * 0.08);
              beamB.harmless = grow < 0.5 || shrink < 0.4;
            },
            draw(beamB) {
              ctx.translate(beamB.x, beamB.y);
              ctx.rotate(beamB.angle);
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, -beamB.w / 2, beamB.length, beamB.w);
            }
          });
        }
      } else {
        // recoil backwards out of the screen
        const k = t - (enter + charge + fire);
        b.x -= Math.cos(angle) * (200 + k * 1200) * dt;
        b.y -= Math.sin(angle) * (200 + k * 1200) * dt;
        b.alpha = Math.max(0, 1 - k * 1.4);
      }
    },
    draw: drawBlaster
  });
}

function drawBlaster(b) {
  if (b.life < 0) return;
  const s = (b.size || 1) * 1.1;
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle - Math.PI / 2);
  ctx.scale(s, s);
  const open = (b.mouth || 0) * 8;
  ctx.fillStyle = '#fff';
  // skull
  fillPoly([-22, -30, 22, -30, 26, -6, 18, 8, -18, 8, -26, -6]);
  // snout / upper jaw
  fillPoly([-14, 6, 14, 6, 10, 20 - open * 0.2, -10, 20 - open * 0.2]);
  // lower jaw drops when charging
  fillPoly([-12, 22 + open, 12, 22 + open, 8, 32 + open, -8, 32 + open]);
  // eye sockets
  ctx.fillStyle = '#000';
  fillPoly([-18, -16, -6, -16, -8, -4, -16, -4]);
  fillPoly([6, -16, 18, -16, 16, -4, 8, -4]);
  if (b.mouth > 0.3) {
    ctx.fillStyle = '#fff';
    fillCircle(-12, -10, 2.5);
    fillCircle(12, -10, 2.5);
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(-8, 10, 16, 2);
}

// -------------- Green SOUL spears --------------
// A spear flying straight at the SOUL from one side, arriving `arrive` seconds after spawning.
// reverse = Undyne's yellow spear: it swings round and hits from the opposite side.
function spawnArrow(from, arrive, { speed = 200, reverse = false, damage = null } = {}) {
  const dir = DIRS[from];
  const c = { x: board.target.x + board.target.w / 2, y: board.target.y + board.target.h / 2 };
  const dist = speed * arrive;
  return spawn({
    kind: 'arrow', shape: 'circle', r: 5, margin: 9999, minLife: 99, noClip: true,
    from, speed, reverse, damage,
    x: c.x + dir.x * dist, y: c.y + dir.y * dist,
    vx: -dir.x * speed, vy: -dir.y * speed,
    angle: Math.atan2(-dir.y, -dir.x),
    swing: 0,
    update(b, dt) {
      if (!b.reverse || b.swung) return;
      const d = Math.hypot(b.x - soul.x, b.y - soul.y);
      if (b.swing === 0 && d < 70) {
        b.swing = 0.0001;
        b.manual = true;
        b.harmless = true;
        b.swingStart = Math.atan2(b.y - soul.y, b.x - soul.x);
        b.swingDist = d;
      }
      if (b.swing > 0) {
        b.swing += dt;
        const k = Math.min(1, b.swing / 0.22);
        const a = b.swingStart + Math.PI * k;
        b.x = soul.x + Math.cos(a) * b.swingDist;
        b.y = soul.y + Math.sin(a) * b.swingDist;
        b.angle = a + Math.PI;
        if (k >= 1) {
          b.swung = true;
          b.manual = false;
          b.harmless = false;
          b.vx = -Math.cos(a) * b.speed;
          b.vy = -Math.sin(a) * b.speed;
        }
      }
    },
    draw(b) {
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = b.reverse && !b.swung ? '#ffff40' : '#3cd8ff';
      ctx.fillRect(-26, -2.5, 22, 5);
      fillPoly([-6, -8, 10, 0, -6, 8, 0, 0]);
    }
  });
}
