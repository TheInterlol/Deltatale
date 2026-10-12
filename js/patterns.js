// Shared building blocks for attacks. Boss files combine these into their own patterns.

// Run fn every `interval` seconds of an attack. The timer lives in run.timers[key],
// so one attack can mix several independent rhythms.
function every(run, key, interval, fn, firstDelay = interval) {
  if (!(key in run.timers)) run.timers[key] = interval - firstDelay;
  run.timers[key] += run.dt;
  while (run.timers[key] >= interval) {
    run.timers[key] -= interval;
    fn();
  }
}

// A scripted timeline: events = [[time, fn], ...] sorted by time. Each fn runs once,
// in order, as soon as the attack clock passes its time. Call it every frame.
function timeline(run, events, key = 'timeline') {
  let index = run.data[key] || 0;
  while (index < events.length && run.t >= events[index][0]) {
    events[index][1]();
    index++;
  }
  run.data[key] = index;
}

// Run fn once, the first frame the attack clock passes `time`.
function once(run, key, time, fn) {
  const done = run.data.once || (run.data.once = {});
  if (!done[key] && run.t >= time) {
    done[key] = true;
    fn();
  }
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function chance(p) {
  return Math.random() < p;
}

// Velocity of `speed` pointing from (x, y) at the SOUL.
function aimAt(x, y, speed, spread = 0) {
  const p = state.player;
  const angle = Math.atan2(p.y - y, p.x - x) + spread;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle };
}

// ---------------- Bones ----------------
function spawnBone(x, y, vx, vy) {
  const bone = spawnBullet(x, y, vx, vy, 10, 'bone');
  bone.hw = 6;
  bone.hh = 18;
  return bone;
}

// A vertical bone of a given height standing on the floor (or hanging from the ceiling).
function floorBone(x, height, vx, options = {}) {
  return spawn({
    kind: 'bone', x, y: arena.y + arena.h - height / 2, vx, hw: 5, hh: height / 2, noCull: true,
    maxLife: options.maxLife || 12, ...options
  });
}

function ceilingBone(x, height, vx, options = {}) {
  return spawn({
    kind: 'bone', x, y: arena.y + height / 2, vx, hw: 5, hh: height / 2, noCull: true,
    maxLife: options.maxLife || 12, ...options
  });
}

// A horizontal bone (lying down), used for walls sliding up/down.
function lyingBone(x, y, length, vx, vy, options = {}) {
  return spawn({ kind: 'bone', x, y, vx, vy, hw: length / 2, hh: 5, noCull: true, maxLife: 12, ...options });
}

// ---------------- Telegraphed hazards ----------------
// A rectangle that flashes as a warning for `warn` s, then hurts for `activeFor` s.
function warnZone(x, y, w, h, warn, activeFor, options = {}) {
  sfx.warn();
  return spawn({
    kind: options.kind || 'zone', x: x + w / 2, y: y + h / 2, hw: w / 2, hh: h / 2,
    warn, activeFor, noCull: true, ...options
  });
}

// A straight beam from (x, y) in direction `angle`. Warns first (thin line), then fires.
function spawnBeam(x, y, angle, width, warn, activeFor, options = {}) {
  const length = 1600;
  sfx.warn();
  return spawn({
    kind: 'beam', x: x + Math.cos(angle) * length / 2, y: y + Math.sin(angle) * length / 2,
    originX: x, originY: y, angle, hw: length / 2, hh: width / 2,
    warn, activeFor, noCull: true, clip: false, ...options
  });
}

// ---------------- Rings and bursts ----------------
function spawnRing(cx, cy, count, speed, r, kind, offset = 0, options = {}) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const angle = offset + (Math.PI * 2 * i) / count;
    list.push(spawn({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, kind, angle, ...options }));
  }
  return list;
}

// A point in the board at least `minDist` from the SOUL.
function pickPointAwayFromPlayer(minDist, margin = 30) {
  const p = state.player;
  let best = null;
  let bestDist = -1;

  for (let i = 0; i < 12; i++) {
    const x = arena.x + margin + Math.random() * (arena.w - margin * 2);
    const y = arena.y + margin + Math.random() * (arena.h - margin * 2);
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist >= minDist) return { x, y };
    if (dist > bestDist) {
      bestDist = dist;
      best = { x, y };
    }
  }
  return best;
}

// ---------------- Survival-mode patterns of the original demo ----------------
function spawnBoneRain(speedMult = 1) {
  for (let i = 0; i < 5; i++) {
    const x = arena.x + 20 + Math.random() * (arena.w - 40);
    const speed = (120 + Math.random() * 90) * speedMult;
    spawnBone(x, arena.y - 20 - Math.random() * 60, 0, speed);
  }
}

function spawnDummy(speedMult = 1) {
  const side = Math.floor(Math.random() * 4);
  const speed = 140 * speedMult;

  if (side === 0) spawnBullet(arena.x - 15, arena.y + Math.random() * arena.h, speed, 0, 9);
  if (side === 1) spawnBullet(arena.x + arena.w + 15, arena.y + Math.random() * arena.h, -speed, 0, 9);
  if (side === 2) spawnBullet(arena.x + Math.random() * arena.w, arena.y - 15, 0, speed, 9);
  if (side === 3) spawnBullet(arena.x + Math.random() * arena.w, arena.y + arena.h + 15, 0, -speed, 9);
}
