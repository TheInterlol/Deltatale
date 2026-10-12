// Boss "presence": an original animated stand-in for a boss until real art is dropped into
// assets/bosses/ - an aura, a rotating halo, the boss' emblem (its weapon or theme, never the
// character itself) and particles in the boss' style. It reacts to hits and to the fight
// heating up. Everything is drawn in code and deterministic in time (no per-frame state).

const BOSS_THEMES = {
  // aura: particle style · frame: halo shape · accent: second colour
  dummy: { aura: 'dust', frame: 'ring', accent: '#8a6b3d' },
  napstablook: { aura: 'mist', frame: 'none', accent: '#7f8cff' },
  toriel: { aura: 'flame', frame: 'ring', accent: '#ff8c1a' },
  doggo: { aura: 'snow', frame: 'shield', accent: '#ffffff' },
  dogamy_dogaressa: { aura: 'snow', frame: 'shield', accent: '#ff7ab8' },
  greater_dog: { aura: 'snow', frame: 'shield', accent: '#9cdcff' },
  papyrus: { aura: 'sparks', frame: 'diamond', accent: '#ff3b3b' },
  shyren: { aura: 'notes', frame: 'none', accent: '#4dc3ff' },
  mad_dummy: { aura: 'shards', frame: 'ring', accent: '#ffffff' },
  undyne: { aura: 'water', frame: 'diamond', accent: '#ffe14d' },
  royal_guards: { aura: 'sparks', frame: 'shield', accent: '#ff8c1a' },
  muffet: { aura: 'spiders', frame: 'web', accent: '#ff7ab8' },
  mettaton_ex: { aura: 'confetti', frame: 'tv', accent: '#ffe14d' },
  asgore: { aura: 'flame', frame: 'crest', accent: '#ff5030' },
  omega_flowey: { aura: 'glitch', frame: 'tv', accent: '#3ddc5a' },
  asriel: { aura: 'rainbow', frame: 'star', accent: '#ffe14d' },
  glad_dummy: { aura: 'dust', frame: 'ring', accent: '#ffffff' },
  mettaton_neo: { aura: 'electric', frame: 'diamond', accent: '#ffe14d' },
  undyne_undying: { aura: 'water', frame: 'crest', accent: '#ffffff' },
  sans: { aura: 'void', frame: 'ring', accent: '#ffe14d' },
  so_sorry: { aura: 'confetti', frame: 'card', accent: '#ffe14d' },
  glyde: { aura: 'stars', frame: 'none', accent: '#ffe14d' },
  mad_mew_mew: { aura: 'hearts', frame: 'ring', accent: '#ffffff' },
  lancer: { aura: 'sparks', frame: 'card', accent: '#ffe14d' },
  k_round: { aura: 'stars', frame: 'crest', accent: '#ffe14d' },
  king: { aura: 'shards', frame: 'card', accent: '#ffe14d' },
  sweet_cap_cakes: { aura: 'notes', frame: 'tv', accent: '#5ec8ff' },
  berdly: { aura: 'wind', frame: 'diamond', accent: '#ffffff' },
  spamton: { aura: 'glitch', frame: 'card', accent: '#ff6be2' },
  rouxls_kaard: { aura: 'shards', frame: 'card', accent: '#ffe14d' },
  queen: { aura: 'electric', frame: 'crest', accent: '#ffe14d' },
  giga_queen: { aura: 'electric', frame: 'tv', accent: '#ffe14d' },
  lanino_elnina: { aura: 'weather', frame: 'tv', accent: '#7fd4ff' },
  shuttah: { aura: 'flash', frame: 'tv', accent: '#ffffff' },
  tenna: { aura: 'confetti', frame: 'tv', accent: '#ffe14d' },
  knight: { aura: 'void', frame: 'star', accent: '#ffffff' },
  jackenstein: { aura: 'embers', frame: 'ring', accent: '#7a3dff' },
  gerson: { aura: 'dust', frame: 'shield', accent: '#3ddc5a' },
  sound_of_justice: { aura: 'notes', frame: 'crest', accent: '#ffffff' },
  titan: { aura: 'void', frame: 'star', accent: '#ffffff' },
  jevil: { aura: 'chaos', frame: 'card', accent: '#ffe14d' },
  spamton_neo: { aura: 'glitch', frame: 'tv', accent: '#ff6be2' }
};

function bossTheme(boss) {
  return BOSS_THEMES[boss.id] || { aura: 'sparks', frame: 'ring', accent: '#ffffff' };
}

// Cheap deterministic noise for particles: same (i, salt) -> same value.
function hash01(i, salt = 0) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// opts: { hurt (0..1), heat (0..1), scale }
function drawBossPresence(boss, x, y, t, opts = {}) {
  const theme = bossTheme(boss);
  const color = boss.color || '#ffffff';
  const accent = theme.accent;
  const hurt = opts.hurt || 0;
  const heat = opts.heat || 0;
  const scale = opts.scale || 1;
  const bob = Math.sin(t * 1.8) * 3;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(scale, scale);

  // ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 62 - bob, 38, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // aura glow - bigger and redder when the fight heats up
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  const glowR = 58 + pulse * 6 + heat * 14;
  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, glowR);
  grad.addColorStop(0, withAlpha(color, 0.38 + heat * 0.15));
  grad.addColorStop(0.55, withAlpha(heat > 0.5 ? '#ff3b3b' : color, 0.12 + heat * 0.1));
  grad.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  drawPresenceParticles(theme.aura, color, accent, t, heat, false);
  drawPresenceFrame(theme.frame, color, accent, t, heat);

  // the emblem, glowing; it flashes white and jolts when hit
  ctx.save();
  const jolt = hurt > 0 ? Math.sin(hurt * 70) * 6 * hurt : 0;
  ctx.translate(jolt, Math.sin(t * 2.6) * 2);
  ctx.scale(1.45, 1.45);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 + pulse * 8;
  drawEmblem(boss.emblem || 'star', hurt > 0.15 ? '#ffffff' : color, t);
  ctx.restore();

  drawPresenceParticles(theme.aura, color, accent, t, heat, true);
  ctx.restore();
}

// ---------------- halo frames ----------------
function drawPresenceFrame(kind, color, accent, t, heat) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(color, 0.75);
  ctx.fillStyle = withAlpha(accent, 0.85);
  const spin = t * (0.35 + heat * 0.8);
  switch (kind) {
    case 'ring': {
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, 53, spin, spin + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 6; i++) {
        const a = spin * -1.4 + (i * Math.PI) / 3;
        ctx.fillRect(Math.cos(a) * 46 - 2, Math.sin(a) * 46 - 2, 4, 4);
      }
      break;
    }
    case 'diamond': {
      ctx.rotate(Math.sin(t * 0.8) * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, -56); ctx.lineTo(50, 0); ctx.lineTo(0, 56); ctx.lineTo(-50, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = withAlpha(accent, 0.6);
      ctx.beginPath();
      ctx.moveTo(0, -46); ctx.lineTo(40, 0); ctx.lineTo(0, 46); ctx.lineTo(-40, 0);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'shield': {
      ctx.beginPath();
      ctx.moveTo(-40, -44);
      ctx.lineTo(40, -44);
      ctx.lineTo(40, 6);
      ctx.quadraticCurveTo(40, 40, 0, 56);
      ctx.quadraticCurveTo(-40, 40, -40, 6);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = withAlpha(accent, 0.8);
      ctx.fillRect(-40, -44, 80, 4);
      break;
    }
    case 'tv': {
      // a little screen with scanlines and rabbit ears
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(-52, -42, 104, 84);
      ctx.strokeRect(-52, -42, 104, 84);
      ctx.strokeStyle = withAlpha(accent, 0.5);
      ctx.beginPath();
      ctx.moveTo(-8, -42); ctx.lineTo(-24, -60);
      ctx.moveTo(8, -42); ctx.lineTo(24, -60);
      ctx.stroke();
      ctx.fillStyle = withAlpha(color, 0.08);
      const roll = (t * 30) % 6;
      for (let yy = -40 + roll; yy < 40; yy += 6) ctx.fillRect(-50, yy, 100, 2);
      ctx.fillStyle = withAlpha(accent, 0.9);
      ctx.fillRect(38, 32, 6, 4);
      break;
    }
    case 'card': {
      ctx.rotate(Math.sin(t * 1.1) * 0.06);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      fillRoundRect(-38, -54, 76, 108, 8);
      ctx.strokeStyle = withAlpha(color, 0.8);
      ctx.strokeRect(-38, -54, 76, 108);
      ctx.strokeStyle = withAlpha(accent, 0.5);
      ctx.strokeRect(-32, -48, 64, 96);
      ctx.fillStyle = withAlpha(accent, 0.9);
      drawSuit('diamond', -26, -40, 9, withAlpha(accent, 0.9));
      drawSuit('diamond', 26, 40, 9, withAlpha(accent, 0.9));
      break;
    }
    case 'crest': {
      // a royal crest: wings of short rays and a crown point
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + 0.25 + (i / 8) * (Math.PI - 0.5);
        const r1 = 44;
        const r2 = 58 + (i % 2) * 6 + Math.sin(t * 2 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 44, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      break;
    }
    case 'star': {
      ctx.rotate(spin * 0.5);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 === 0 ? 60 : 40;
        const a = (i * Math.PI) / 8;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'web': {
      ctx.strokeStyle = withAlpha(color, 0.35);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
        ctx.stroke();
      }
      for (const r of [22, 38, 54]) {
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// ---------------- particles ----------------
// front = particles drawn over the emblem (half of them).
function drawPresenceParticles(kind, color, accent, t, heat, front) {
  const count = 14 + Math.round(heat * 8);
  ctx.save();
  for (let i = 0; i < count; i++) {
    if ((i % 2 === 0) !== front) continue;
    const r1 = hash01(i, 1);
    const r2 = hash01(i, 2);
    const r3 = hash01(i, 3);
    const life = (t * (0.25 + r3 * 0.35) + r1) % 1; // 0..1, loops
    const fade = Math.sin(life * Math.PI);
    switch (kind) {
      case 'flame':
      case 'embers': {
        const px = (r2 - 0.5) * 90 + Math.sin(t * 3 + i) * 4;
        const py = 50 - life * 110;
        ctx.fillStyle = withAlpha(life < 0.5 ? (kind === 'embers' ? accent : color) : '#ff8c1a', 0.8 * fade);
        if (kind === 'flame') drawFlame(px, py, 4 + r3 * 4, t);
        else ctx.fillRect(px, py, 2, 2);
        break;
      }
      case 'mist': {
        const px = (r2 - 0.5) * 110 + Math.sin(t * 0.7 + i) * 10;
        const py = 30 - life * 70;
        ctx.fillStyle = withAlpha(color, 0.12 * fade);
        ctx.beginPath();
        ctx.arc(px, py, 8 + r3 * 10, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'snow': {
        const px = (r2 - 0.5) * 120 + Math.sin(t + i) * 6;
        const py = -60 + life * 120;
        ctx.fillStyle = withAlpha('#ffffff', 0.7 * fade);
        ctx.fillRect(px, py, 2, 2);
        break;
      }
      case 'water': {
        const a = r2 * Math.PI * 2 + t * 0.6;
        const rad = 40 + life * 24;
        ctx.fillStyle = withAlpha(i % 3 ? color : accent, 0.7 * fade);
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * rad, Math.sin(a) * rad, 2, 3.5, a, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'notes': {
        const px = (r2 - 0.5) * 100 + Math.sin(t * 2 + i) * 8;
        const py = 40 - life * 100;
        ctx.fillStyle = withAlpha(i % 2 ? color : accent, 0.8 * fade);
        fillCircle(px, py, 3);
        ctx.fillRect(px + 2, py - 10, 1.5, 10);
        break;
      }
      case 'spiders': {
        const px = (r2 - 0.5) * 100;
        const py = -60 + ((t * 0.3 + r1) % 1) * 120;
        ctx.strokeStyle = withAlpha('#ffffff', 0.25);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, -70);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.fillStyle = withAlpha(color, 0.9);
        fillCircle(px, py, 2.5);
        break;
      }
      case 'confetti': {
        const px = (r2 - 0.5) * 130 + Math.sin(t * 2 + i) * 8;
        const py = -64 + life * 130;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(t * 4 + i);
        ctx.fillStyle = withAlpha([color, accent, '#ffffff', '#5ec8ff'][i % 4], 0.85 * fade);
        ctx.fillRect(-3, -1.5, 6, 3);
        ctx.restore();
        break;
      }
      case 'glitch': {
        if (hash01(i, Math.floor(t * 8)) > 0.55) break;
        const px = (hash01(i, Math.floor(t * 6) + 5) - 0.5) * 120;
        const py = (hash01(i, Math.floor(t * 6) + 9) - 0.5) * 110;
        ctx.fillStyle = withAlpha(i % 2 ? color : accent, 0.6);
        ctx.fillRect(px, py, 6 + r3 * 20, 2 + r1 * 3);
        break;
      }
      case 'rainbow': {
        const a = r2 * Math.PI * 2 + t * (0.8 + heat);
        const rad = 50 + Math.sin(t * 2 + i) * 8;
        ctx.fillStyle = `hsla(${(i * 40 + t * 120) % 360}, 90%, 65%, ${0.8 * fade})`;
        drawStarShape(Math.cos(a) * rad, Math.sin(a) * rad, 4);
        break;
      }
      case 'stars': {
        const a = r2 * Math.PI * 2 + t * 0.5;
        const rad = 44 + r3 * 20;
        ctx.fillStyle = withAlpha(i % 2 ? color : accent, 0.9 * fade);
        drawStarShape(Math.cos(a) * rad, Math.sin(a) * rad * 0.8, 3 + r1 * 3);
        break;
      }
      case 'hearts': {
        const px = (r2 - 0.5) * 110;
        const py = 40 - life * 100;
        drawSuit('heart', px, py, 8 + r3 * 6, withAlpha(i % 2 ? color : accent, 0.8 * fade));
        break;
      }
      case 'electric': {
        if (hash01(i, Math.floor(t * 10)) > 0.4) break;
        const a = hash01(i, Math.floor(t * 10) + 3) * Math.PI * 2;
        ctx.strokeStyle = withAlpha(i % 2 ? color : accent, 0.8);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let px = Math.cos(a) * 30;
        let py = Math.sin(a) * 30;
        ctx.moveTo(px, py);
        for (let k = 0; k < 4; k++) {
          px += Math.cos(a) * 8 + (hash01(i * 7 + k, Math.floor(t * 10)) - 0.5) * 10;
          py += Math.sin(a) * 8 + (hash01(i * 5 + k, Math.floor(t * 10)) - 0.5) * 10;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }
      case 'wind': {
        const py = (r2 - 0.5) * 100;
        const px = -70 + life * 140;
        ctx.strokeStyle = withAlpha('#ffffff', 0.4 * fade);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + 10, py - 6, px + 22, py);
        ctx.stroke();
        break;
      }
      case 'weather': {
        const px = (r2 - 0.5) * 120;
        const py = -60 + life * 120;
        if (i % 2) {
          ctx.fillStyle = withAlpha('#7fd4ff', 0.7 * fade);
          ctx.fillRect(px, py, 1.5, 6);
        } else {
          ctx.fillStyle = withAlpha('#ffd35e', 0.7 * fade);
          fillCircle(px, py, 2.5);
        }
        break;
      }
      case 'flash': {
        const blink = (t * 0.7 + r1) % 1 < 0.06;
        if (!blink) break;
        const px = (r2 - 0.5) * 120;
        const py = (r3 - 0.5) * 100;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        drawStarShape(px, py, 6);
        break;
      }
      case 'void': {
        const a = r2 * Math.PI * 2 - t * (0.4 + heat);
        const rad = 70 - life * 50;
        ctx.fillStyle = withAlpha(i % 3 ? color : accent, 0.7 * fade);
        ctx.fillRect(Math.cos(a) * rad, Math.sin(a) * rad, 2, 2);
        break;
      }
      case 'chaos': {
        const a = r2 * Math.PI * 2 + t * (1.5 + heat * 2) * (i % 2 ? 1 : -1);
        const rad = 48 + Math.sin(t * 3 + i) * 12;
        const suit = ['spade', 'heart', 'club', 'diamond'][i % 4];
        drawSuit(suit, Math.cos(a) * rad, Math.sin(a) * rad, 9, withAlpha(i % 4 === 1 || i % 4 === 3 ? '#ff3b3b' : color, 0.85));
        break;
      }
      case 'shards': {
        const a = r2 * Math.PI * 2 + t * 0.7;
        const rad = 46 + Math.sin(t + i) * 10;
        ctx.save();
        ctx.translate(Math.cos(a) * rad, Math.sin(a) * rad);
        ctx.rotate(t * 2 + i);
        ctx.fillStyle = withAlpha(i % 2 ? color : accent, 0.7);
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(3, 3); ctx.lineTo(-3, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'dust':
      case 'sparks':
      default: {
        const a = r2 * Math.PI * 2;
        const rad = 30 + life * 40;
        ctx.fillStyle = withAlpha(i % 3 ? color : accent, 0.75 * fade);
        ctx.fillRect(Math.cos(a) * rad, Math.sin(a) * rad - life * 10, kind === 'dust' ? 2 : 3, kind === 'dust' ? 2 : 3);
        break;
      }
    }
  }
  ctx.restore();
}

function drawStarShape(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
