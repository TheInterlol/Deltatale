// Vizuální odezva: otřesy, záblesk po zásahu, plovoucí čísla, kroužky při grazu a seky.
const effects = {
  shake: 0,
  flash: 0,
  popups: [],
  rings: [],
  slashes: []
};

function resetEffects() {
  effects.shake = 0;
  effects.flash = 0;
  effects.popups = [];
  effects.rings = [];
  effects.slashes = [];
}

function addShake(amount) {
  effects.shake = Math.max(effects.shake, amount);
}

function addFlash(amount = 1) {
  effects.flash = Math.max(effects.flash, amount);
}

function addPopup(text, x, y, color = '#fff') {
  effects.popups.push({ text: String(text), x, y, color, life: 0, maxLife: 1.2 });
}

function addRing(x, y) {
  effects.rings.push({ x, y, life: 0, maxLife: 0.3 });
}

function addSlash(x, y) {
  effects.slashes.push({ x, y, life: 0, maxLife: 0.35 });
}

function updateEffects(dt) {
  effects.shake = Math.max(0, effects.shake - dt * 30);
  effects.flash = Math.max(0, effects.flash - dt * 3);

  for (const list of [effects.popups, effects.rings, effects.slashes]) {
    for (const fx of list) fx.life += dt;
  }
  effects.popups = effects.popups.filter(p => p.life < p.maxLife);
  effects.rings = effects.rings.filter(r => r.life < r.maxLife);
  effects.slashes = effects.slashes.filter(s => s.life < s.maxLife);
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
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 12 + k * 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const s of effects.slashes) {
    const k = Math.min(1, s.life / (s.maxLife * 0.6));
    ctx.globalAlpha = 1 - Math.max(0, (s.life / s.maxLife - 0.6) / 0.4);
    ctx.strokeStyle = '#ff4fd8';
    ctx.lineWidth = 5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(s.x - 50 + i * 18, s.y - 50);
      ctx.lineTo(s.x - 50 + i * 18 + 100 * k, s.y - 50 + 100 * k);
      ctx.stroke();
    }
  }

  ctx.font = 'bold 24px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  for (const p of effects.popups) {
    const k = p.life / p.maxLife;
    // krátký "vyskok" nahoru, pak zůstane a zmizí
    const rise = Math.min(p.life * 90, 22);
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
  ctx.globalAlpha = effects.flash * 0.25;
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
