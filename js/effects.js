// Visual feedback: screen shake, hit flash, floating numbers, graze rings, slashes,
// SOUL shards and spare dust.
const effects = {
  shake: 0,
  flash: 0,
  flashColor: '#ff0000',
  popups: [],
  rings: [],
  slashes: [],
  particles: []
};

function resetEffects() {
  effects.shake = 0;
  effects.flash = 0;
  effects.popups = [];
  effects.rings = [];
  effects.slashes = [];
  effects.particles = [];
}

function addShake(amount) {
  effects.shake = Math.max(effects.shake, amount);
}

function addFlash(amount = 1, color = '#ff0000') {
  effects.flash = Math.max(effects.flash, amount);
  effects.flashColor = color;
}

function addPopup(text, x, y, color = '#fff', size = 26) {
  effects.popups.push({ text: String(text), x, y, color, size, life: 0, maxLife: 1.2 });
}

function addRing(x, y, color = '#fff') {
  effects.rings.push({ x, y, color, life: 0, maxLife: 0.3 });
}

function addSlash(x, y, color = '#ff3030') {
  effects.slashes.push({ x, y, color, life: 0, maxLife: 0.4 });
}

function addParticles(x, y, count, { color = '#fff', speed = 160, size = 4, life = 0.9, gravity = 300 } = {}) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    effects.particles.push({
      x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - speed * 0.4,
      color, size, life: 0, maxLife: life * (0.7 + Math.random() * 0.6), gravity
    });
  }
}

function updateEffects(dt) {
  effects.shake = Math.max(0, effects.shake - dt * 30);
  effects.flash = Math.max(0, effects.flash - dt * 3);

  for (const list of [effects.popups, effects.rings, effects.slashes, effects.particles]) {
    for (const fx of list) fx.life += dt;
  }
  for (const p of effects.particles) {
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  effects.popups = effects.popups.filter(p => p.life < p.maxLife);
  effects.rings = effects.rings.filter(r => r.life < r.maxLife);
  effects.slashes = effects.slashes.filter(s => s.life < s.maxLife);
  effects.particles = effects.particles.filter(p => p.life < p.maxLife);
}

function getShakeOffset() {
  if (effects.shake <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() * 2 - 1) * effects.shake,
    y: (Math.random() * 2 - 1) * effects.shake
  };
}

function drawEffects() {
  ctx.save();

  for (const r of effects.rings) {
    const k = r.life / r.maxLife;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 10 + k * 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const s of effects.slashes) {
    const k = Math.min(1, s.life / (s.maxLife * 0.5));
    ctx.globalAlpha = 1 - Math.max(0, (s.life / s.maxLife - 0.5) / 0.5);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(s.x - 45, s.y - 45);
    ctx.lineTo(s.x - 45 + 90 * k, s.y - 45 + 90 * k);
    ctx.stroke();
  }

  for (const p of effects.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }

  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  for (const p of effects.popups) {
    const k = p.life / p.maxLife;
    const rise = Math.min(p.life * 90, 22);
    ctx.font = font(p.size);
    ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    ctx.strokeStyle = '#000';
    ctx.strokeText(p.text, p.x, p.y - rise);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - rise);
  }

  ctx.restore();
}

function drawFlash() {
  if (effects.flash <= 0) return;
  ctx.save();
  ctx.globalAlpha = effects.flash * 0.22;
  ctx.fillStyle = effects.flashColor;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
