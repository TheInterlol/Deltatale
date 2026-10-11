// Generic bullets. Every bullet is a plain object with a position, velocity and a hitbox:
//   shape 'circle' (r), 'rect' (w, h, rotated by angle), 'beam' (from x,y along angle, width w)
//   or 'none' (decoration / telegraph).
// color 'white' always hurts, 'blue' hurts only while the SOUL moves, 'orange' only while it stands still.
// Optional per-bullet hooks: update(b, dt), draw(b), onShot(b, shot).
const BULLET_FILL = {
  white: '#ffffff',
  blue: '#14a9ff',
  orange: '#ffa500',
  green: '#40ff40',
  yellow: '#ffff00',
  red: '#ff3030'
};

function spawn(props) {
  const b = Object.assign({
    x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    angle: 0, spin: 0,
    shape: 'circle', r: 6, w: 10, h: 10, length: 1600,
    color: 'white', kind: 'pellet',
    life: 0, maxLife: Infinity, minLife: 0.3, margin: 90,
    damage: null, harmless: false, alpha: 1,
    dead: false
  }, props);
  state.bullets.push(b);
  return b;
}

function isOffscreen(b) {
  return b.x < -b.margin || b.x > W + b.margin || b.y < -b.margin || b.y > H + b.margin;
}

function updateBullets(dt) {
  for (const b of state.bullets) {
    b.life += dt;
    if (b.update) b.update(b, dt);
    if (b.dead) continue;
    if (!b.manual) {
      b.vx += b.ax * dt;
      b.vy += b.ay * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    b.angle += b.spin * dt;
    if (b.life > b.maxLife) b.dead = true;
    else if (b.life > b.minLife && b.shape !== 'beam' && isOffscreen(b)) b.dead = true;
  }
  state.bullets = state.bullets.filter(b => !b.dead);
}

// Distance from point (x, y) to the edge of the bullet's hitbox (<= 0 means inside).
function bulletDistance(b, x, y) {
  if (b.shape === 'circle') return Math.hypot(x - b.x, y - b.y) - b.r;
  if (b.shape === 'rect') {
    const cos = Math.cos(-b.angle);
    const sin = Math.sin(-b.angle);
    const lx = (x - b.x) * cos - (y - b.y) * sin;
    const ly = (x - b.x) * sin + (y - b.y) * cos;
    const dx = Math.max(Math.abs(lx) - b.w / 2, 0);
    const dy = Math.max(Math.abs(ly) - b.h / 2, 0);
    return Math.hypot(dx, dy);
  }
  if (b.shape === 'beam') {
    const dirX = Math.cos(b.angle);
    const dirY = Math.sin(b.angle);
    const t = Math.max(0, Math.min(b.length, (x - b.x) * dirX + (y - b.y) * dirY));
    return Math.hypot(x - (b.x + dirX * t), y - (b.y + dirY * t)) - b.w / 2;
  }
  return Infinity;
}

function bulletHurtsNow(b) {
  if (b.harmless || b.shape === 'none') return false;
  if (b.color === 'blue') return soul.moving;
  if (b.color === 'orange') return !soul.moving;
  return true;
}

// -------------- Yellow SOUL shots --------------
function updateShots(dt) {
  for (const s of state.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) s.dead = true;
    if (s.dead) continue;

    for (const b of state.bullets) {
      if (!b.shootable || b.dead || s.dead) continue;
      if (bulletDistance(b, s.x, s.y) > s.r) continue;
      if (b.reflect) {
        s.dead = true;
        sfx.ding();
        continue;
      }
      b.hp = (b.hp !== undefined ? b.hp : 1) - s.damage;
      b.hitFlash = 0.08;
      if (b.onShot) b.onShot(b, s);
      if (b.hp <= 0 && !b.dead) {
        b.dead = true;
        if (b.onDestroy) b.onDestroy(b);
        addParticles(b.x, b.y, 8, { color: '#ffff60', speed: 120, size: 3, life: 0.4, gravity: 0 });
        sfx.explode();
      }
      if (!s.big) s.dead = true;
    }
  }
  state.shots = state.shots.filter(s => !s.dead);
}

function drawShots() {
  ctx.save();
  for (const s of state.shots) {
    ctx.fillStyle = s.big ? '#ffffff' : '#ffff00';
    if (s.big) {
      ctx.globalAlpha = 0.9;
      fillEllipse(s.x, s.y, s.r * 1.3, s.r * 0.8, Math.atan2(s.vy, s.vx));
      ctx.fillStyle = '#ffff00';
      fillEllipse(s.x, s.y, s.r * 0.8, s.r * 0.45, Math.atan2(s.vy, s.vx));
    } else {
      const vertical = Math.abs(s.vy) > Math.abs(s.vx);
      ctx.fillRect(s.x - (vertical ? 2 : 6), s.y - (vertical ? 6 : 2), vertical ? 4 : 12, vertical ? 12 : 4);
    }
  }
  ctx.restore();
}

// -------------- Bullet art --------------
function bulletFill(b) {
  return b.fill || BULLET_FILL[b.color] || '#fff';
}

const BULLET_ART = {
  pellet(b) {
    ctx.fillStyle = bulletFill(b);
    fillCircle(b.x, b.y, b.r);
  },

  // A bone of size w x h (long axis = the longer side), rotated by angle.
  bone(b) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = bulletFill(b);
    const long = Math.max(b.w, b.h);
    const thick = Math.min(b.w, b.h);
    if (b.h >= b.w) {
      ctx.fillRect(-thick / 2, -long / 2 + thick / 2, thick, long - thick);
      for (const e of [-1, 1]) {
        fillCircle(-thick * 0.35, e * (long / 2 - thick / 2), thick * 0.62);
        fillCircle(thick * 0.35, e * (long / 2 - thick / 2), thick * 0.62);
      }
    } else {
      ctx.fillRect(-long / 2 + thick / 2, -thick / 2, long - thick, thick);
      for (const e of [-1, 1]) {
        fillCircle(e * (long / 2 - thick / 2), -thick * 0.35, thick * 0.62);
        fillCircle(e * (long / 2 - thick / 2), thick * 0.35, thick * 0.62);
      }
    }
  },

  // Toriel-style fireball
  fire(b) {
    const flicker = Math.sin(b.life * 30 + b.x) * 1.2;
    ctx.translate(b.x, b.y);
    ctx.fillStyle = b.fill || '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(0, -b.r * 2.1 - flicker);
    ctx.quadraticCurveTo(b.r * 1.3, -b.r * 0.2, 0, b.r * 1.1);
    ctx.quadraticCurveTo(-b.r * 1.3, -b.r * 0.2, 0, -b.r * 2.1 - flicker);
    ctx.fill();
    ctx.fillStyle = '#fff2a8';
    fillCircle(0, b.r * 0.2, b.r * 0.55);
  },

  // Undyne's energy spear: shaft + diamond head, pointing along angle
  spear(b) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    const len = b.w;
    ctx.fillStyle = b.fill || '#3cd8ff';
    ctx.fillRect(-len / 2, -2, len * 0.75, 4);
    fillPoly([len * 0.2, -7, len / 2, 0, len * 0.2, 7, len * 0.3, 0]);
  },

  diamond(b) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = bulletFill(b);
    fillPoly([0, -b.r * 1.4, b.r, 0, 0, b.r * 1.4, -b.r, 0]);
  },

  spade(b) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = bulletFill(b);
    const r = b.r;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.bezierCurveTo(r * 1.5, -r * 0.2, r * 0.9, r * 1.0, 0, r * 0.3);
    ctx.bezierCurveTo(-r * 0.9, r * 1.0, -r * 1.5, -r * 0.2, 0, -r * 1.3);
    ctx.fill();
    fillPoly([0, r * 0.2, r * 0.45, r * 1.25, -r * 0.45, r * 1.25]);
  },

  club(b) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = bulletFill(b);
    const r = b.r * 0.55;
    fillCircle(0, -r * 1.1, r);
    fillCircle(-r * 1.05, r * 0.4, r);
    fillCircle(r * 1.05, r * 0.4, r);
    fillPoly([0, 0, r * 0.7, r * 2.2, -r * 0.7, r * 2.2]);
  },

  heart(b) {
    drawHeart(b.x, b.y, b.r * 2.6, bulletFill(b), b.angle);
  },

  axe(b) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    if (imageReady(ASSETS.axe)) {
      const h = b.size || 42;
      const w = h * ASSETS.axe.naturalWidth / ASSETS.axe.naturalHeight;
      ctx.drawImage(ASSETS.axe, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = '#bbb';
      fillCircle(0, 0, b.r);
    }
  },

  // A line-shaped warning ("!" zone) that does no damage.
  warning(b) {
    const blink = Math.floor(b.life * 14) % 2 === 0;
    ctx.globalAlpha *= blink ? 0.9 : 0.35;
    ctx.strokeStyle = b.fill || '#ff3030';
    ctx.lineWidth = 2;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
  }
};

function drawBullets() {
  for (const b of state.bullets) {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    if (b.hitFlash > 0) {
      b.hitFlash -= 1 / 60;
      ctx.globalAlpha *= 0.5;
    }
    if (b.draw) b.draw(b);
    else (BULLET_ART[b.kind] || BULLET_ART.pellet)(b);
    ctx.restore();
  }
}
