// The player's SOUL and its modes. Each mode changes how the SOUL is controlled:
//   red     free movement (default)
//   blue    gravity: falls towards a wall, jumps with the key pointing away from it,
//           lands on platforms; attacks can "slam" it into a wall (Sans, Papyrus)
//   green   fixed in the centre, blocks incoming spears with a shield (Undyne)
//   yellow  free movement and shoots with Z; Deltarune version charges a BIG SHOT (Mettaton, Spamton NEO)
//   purple  stuck on horizontal strings, up/down jumps between them (Muffet)
//   split   two halves, each on three slots: A/D moves the red half, ←/→ the blue half (Mad Mew Mew)
//   plus    five spots of a plus-shaped board, arrows jump between them (Mad Mew Mew)
// Attacks pick the mode with attack.soul / setSoulMode().

const SOUL_COLORS = {
  red: '#ff1a1a',
  blue: '#1f4dff',
  green: '#16c916',
  yellow: '#ffe11a',
  purple: '#d52fd9',
  split: '#ff1a1a',
  plus: '#ff1a1a',
  cyan: '#2ad8ff',
  orange: '#ff9a1a'
};

const SOUL_SPEED = 190;
const BLUE_PHYSICS = { gravity: 1500, jump: 470, jumpCut: 150, maxFall: 620, slamSpeed: 1100 };
const SHIELD_RADIUS = 26;
const SHOT_SPEED = 520;
const BIG_SHOT_CHARGE = 0.55;   // seconds Z has to be held for a BIG SHOT
const LANE_SWITCH_SPEED = 900;

// Unit vectors of the four gravity directions and the key that jumps "up" against them.
const GRAVITY = {
  down: { x: 0, y: 1, jumpKeys: UP_KEYS },
  up: { x: 0, y: -1, jumpKeys: DOWN_KEYS },
  left: { x: -1, y: 0, jumpKeys: RIGHT_KEYS },
  right: { x: 1, y: 0, jumpKeys: LEFT_KEYS }
};

function makePlayer(stats = {}) {
  const maxHp = stats.maxHp || 20;
  return {
    x: arena.x + arena.w / 2,
    y: arena.y + arena.h / 2,
    r: 8,
    speed: SOUL_SPEED,
    hp: maxHp,
    maxHp,
    hurtCooldown: 0,
    mode: 'red',
    moving: false,
    // blue
    gravity: 'down',
    fall: 0,
    grounded: false,
    slamming: false,
    platform: null,
    // green
    shield: 'up',
    // yellow
    facing: 'up',
    bigShot: false,
    charge: 0,
    chargeHeld: false,
    shotCooldown: 0,
    // purple
    lanes: 3,
    lane: 1,
    // Sans' KARMA
    karma: 0,
    karmaTimer: 0
  };
}

function isHeld(list) {
  return list.some(k => keys[k]);
}

function inputVector() {
  let dx = 0;
  let dy = 0;
  if (isHeld(LEFT_KEYS)) dx -= 1;
  if (isHeld(RIGHT_KEYS)) dx += 1;
  if (isHeld(UP_KEYS)) dy -= 1;
  if (isHeld(DOWN_KEYS)) dy += 1;
  return { dx, dy };
}

function confirmHeld() {
  return isHeld(CONFIRM_KEYS);
}

// Switch the SOUL's mode. Options depend on the mode:
//   blue: { gravity: 'down' }   yellow: { facing: 'up' | 'right', bigShot: bool }   purple: { lanes: 3 }
function setSoulMode(mode, options = {}) {
  const p = state.player;
  p.mode = mode;
  p.fall = 0;
  p.grounded = false;
  p.slamming = false;
  p.platform = null;
  p.charge = 0;
  p.chargeHeld = false;

  if (mode === 'blue') p.gravity = options.gravity || 'down';
  if (mode === 'yellow') {
    p.facing = options.facing || 'up';
    p.bigShot = Boolean(options.bigShot);
  }
  if (mode === 'green') {
    const c = arenaCenter();
    p.x = c.x;
    p.y = c.y;
    p.shield = options.shield || 'up';
  }
  p.laneList = null;
  if (mode === 'purple') {
    p.lanes = options.lanes || 3;
    p.lane = Math.floor(p.lanes / 2);
    p.y = laneY(p.lane);
  }
  if (mode === 'split') {
    p.halves = [
      { color: 'red', slot: 1, left: ['a'], right: ['d'] },
      { color: 'blue', slot: 1, left: ['arrowleft'], right: ['arrowright'] }
    ];
    placeHalves(p);
  }
  if (mode === 'plus') {
    p.spot = 'center';
    placePlus(p);
  }
}

// ---------------- Split SOUL ----------------
function halfPosition(index, slot) {
  const third = arena.w / 2;
  const x = arena.x + (index === 0 ? 0 : third) + (third * (slot + 0.5)) / 3;
  return { x, y: arena.y + arena.h - 16 };
}

function placeHalves(p) {
  p.halves.forEach((h, i) => Object.assign(h, halfPosition(i, h.slot)));
  p.x = (p.halves[0].x + p.halves[1].x) / 2;
  p.y = p.halves[0].y;
}

function updateSplitSoul(p) {
  for (const h of p.halves) {
    if (consumePress(h.left) && h.slot > 0) h.slot -= 1;
    if (consumePress(h.right) && h.slot < 2) h.slot += 1;
  }
  placeHalves(p);
}

// ---------------- Plus-shaped board ----------------
const PLUS_SPOTS = { center: [0, 0], up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function placePlus(p) {
  const c = arenaCenter();
  const [dx, dy] = PLUS_SPOTS[p.spot];
  p.x = c.x + dx * arena.w * 0.33;
  p.y = c.y + dy * arena.h * 0.33;
}

function updatePlusSoul(p) {
  // from the centre an arrow jumps to that arm; from an arm any arrow goes back to the centre
  const { dx, dy } = directionPressed();
  if (dx || dy) {
    if (p.spot === 'center') p.spot = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
    else p.spot = 'center';
  }
  placePlus(p);
}

// Points that can be hit: the two halves of a split SOUL, otherwise the SOUL itself.
function soulHitPoints() {
  const p = state.player;
  if (p.mode === 'split' && p.halves) return p.halves.map(h => ({ x: h.x, y: h.y, color: h.color }));
  return [{ x: p.x, y: p.y, color: null }];
}

function soulColor() {
  return SOUL_COLORS[state.player.mode] || SOUL_COLORS.red;
}

// Strings are evenly spaced, unless an attack manages its own list (p.laneList, Muffet's pet).
function laneY(lane) {
  const p = state.player;
  if (p.laneList) return p.laneList[Math.max(0, Math.min(p.laneList.length - 1, lane))];
  return arena.y + (arena.h * (lane + 1)) / (p.lanes + 1);
}

function laneCount() {
  const p = state.player;
  return p.laneList ? p.laneList.length : p.lanes;
}

function clampToArena(p) {
  p.x = Math.max(arena.x + p.r, Math.min(arena.x + arena.w - p.r, p.x));
  p.y = Math.max(arena.y + p.r, Math.min(arena.y + arena.h - p.r, p.y));
}

function updateSoul(dt) {
  const p = state.player;

  switch (p.mode) {
    case 'blue': updateBlueSoul(p, dt); break;
    case 'green': updateGreenSoul(p); break;
    case 'yellow': updateFreeSoul(p, dt); updateShooting(p, dt); break;
    case 'purple': updatePurpleSoul(p, dt); break;
    case 'split': updateSplitSoul(p); break;
    case 'plus': updatePlusSoul(p); break;
    default: updateFreeSoul(p, dt);
  }

  // Blue/orange attacks care about whether the player is *trying* to move.
  // (Falling on its own doesn't count, holding a direction key does - like in Undertale.)
  const { dx, dy } = inputVector();
  p.moving = !['green', 'split', 'plus'].includes(p.mode) && (dx !== 0 || dy !== 0);

  if (p.hurtCooldown > 0) p.hurtCooldown -= dt;
}

function updateFreeSoul(p, dt) {
  let { dx, dy } = inputVector();
  const length = Math.hypot(dx, dy) || 1;
  // move one axis at a time so the SOUL can slide along maze walls
  p.x += (dx / length) * p.speed * dt;
  pushOutOfWalls(p, 'x');
  p.y += (dy / length) * p.speed * dt;
  pushOutOfWalls(p, 'y');
  clampToArena(p);
}

// Solid walls (bullets with `solid: true`, e.g. Jackenstein's mazes) block the SOUL.
function pushOutOfWalls(p, axis) {
  for (const b of state.bullets) {
    if (!b.solid || b.dead) continue;
    const overlapX = p.r + b.hw - Math.abs(p.x - b.x);
    const overlapY = p.r + b.hh - Math.abs(p.y - b.y);
    if (overlapX <= 0 || overlapY <= 0) continue;
    if (axis === 'x') p.x += overlapX * Math.sign(p.x - b.x || 1);
    else p.y += overlapY * Math.sign(p.y - b.y || 1);
  }
}

// ---------------- Blue SOUL ----------------
function updateBlueSoul(p, dt) {
  const g = GRAVITY[p.gravity];
  const vertical = g.y !== 0;

  // sideways movement (perpendicular to gravity)
  const { dx, dy } = inputVector();
  const side = vertical ? dx : dy;
  if (vertical) p.x += side * p.speed * dt;
  else p.y += side * p.speed * dt;

  // ride a moving platform
  if (p.platform && p.grounded) {
    if (p.platform.dead || !isOnPlatform(p, p.platform)) {
      p.platform = null;
      p.grounded = false;
    } else {
      p.x += p.platform.vx * dt;
      p.y = p.platform.y - p.platform.hh - p.r;
    }
  }

  const jumpHeld = isHeld(g.jumpKeys);
  if (p.grounded && jumpHeld && !p.slamming) {
    p.fall = -BLUE_PHYSICS.jump;
    p.grounded = false;
    p.platform = null;
  }
  // releasing the key early cuts the jump short
  if (!jumpHeld && p.fall < -BLUE_PHYSICS.jumpCut) p.fall = -BLUE_PHYSICS.jumpCut;

  if (!p.grounded) {
    const maxFall = p.slamming ? BLUE_PHYSICS.slamSpeed : BLUE_PHYSICS.maxFall;
    p.fall = Math.min(maxFall, p.fall + BLUE_PHYSICS.gravity * dt);
    p.x += g.x * p.fall * dt;
    p.y += g.y * p.fall * dt;
  }

  // platforms only exist for normal (downward) gravity
  if (p.gravity === 'down' && p.fall >= 0 && !p.grounded) landOnPlatforms(p);

  // walls: the one gravity pulls towards is the floor
  const floorHit =
    (g.y > 0 && p.y >= arena.y + arena.h - p.r) ||
    (g.y < 0 && p.y <= arena.y + p.r) ||
    (g.x > 0 && p.x >= arena.x + arena.w - p.r) ||
    (g.x < 0 && p.x <= arena.x + p.r);
  const ceilingHit =
    (g.y > 0 && p.y <= arena.y + p.r) ||
    (g.y < 0 && p.y >= arena.y + arena.h - p.r) ||
    (g.x > 0 && p.x <= arena.x + p.r) ||
    (g.x < 0 && p.x >= arena.x + arena.w - p.r);

  clampToArena(p);

  if (floorHit && p.fall >= 0) {
    if (p.slamming) {
      p.slamming = false;
      addShake(6);
      sfx.slam();
    }
    p.fall = 0;
    p.grounded = true;
  } else if (!p.platform && !floorHit) {
    p.grounded = false;
  }
  if (ceilingHit && p.fall < 0) p.fall = 0;
}

function isOnPlatform(p, plat) {
  return Math.abs(p.x - plat.x) <= plat.hw + p.r * 0.5;
}

function landOnPlatforms(p) {
  for (const b of state.bullets) {
    if (!b.platform) continue;
    const top = b.y - b.hh;
    const feet = p.y + p.r;
    if (isOnPlatform(p, b) && feet >= top && feet <= top + Math.max(10, p.fall / 40)) {
      p.y = top - p.r;
      p.fall = 0;
      p.grounded = true;
      p.platform = b;
      return;
    }
  }
}

// Throw the blue SOUL into a wall (Sans' slams). Gravity then stays in that direction.
function slamSoul(direction) {
  const p = state.player;
  if (p.mode !== 'blue') setSoulMode('blue');
  p.gravity = direction;
  p.fall = BLUE_PHYSICS.slamSpeed;
  p.grounded = false;
  p.platform = null;
  p.slamming = true;
}

// ---------------- Green SOUL ----------------
function updateGreenSoul(p) {
  const c = arenaCenter();
  p.x = c.x;
  p.y = c.y;
  // the most recently pressed direction wins, holding keeps it
  if (isHeld(UP_KEYS)) p.shield = 'up';
  else if (isHeld(DOWN_KEYS)) p.shield = 'down';
  else if (isHeld(LEFT_KEYS)) p.shield = 'left';
  else if (isHeld(RIGHT_KEYS)) p.shield = 'right';
}

// ---------------- Purple SOUL ----------------
function updatePurpleSoul(p, dt) {
  const { dx } = inputVector();
  p.x += dx * p.speed * dt;
  if (consumePress(UP_KEYS) && p.lane > 0) p.lane -= 1;
  if (consumePress(DOWN_KEYS) && p.lane < laneCount() - 1) p.lane += 1;

  const target = laneY(p.lane);
  const step = LANE_SWITCH_SPEED * dt;
  p.y = Math.abs(target - p.y) <= step ? target : p.y + Math.sign(target - p.y) * step;
  p.x = Math.max(arena.x + p.r, Math.min(arena.x + arena.w - p.r, p.x));
}

// ---------------- Yellow SOUL ----------------
function updateShooting(p, dt) {
  p.shotCooldown = Math.max(0, p.shotCooldown - dt);
  const pressed = consumePress(CONFIRM_KEYS);
  const held = confirmHeld();

  if (!p.bigShot) {
    if (pressed && p.shotCooldown <= 0) fireShot(p, false);
    return;
  }

  // Deltarune: tap = small shot, hold and release = BIG SHOT
  if (pressed) {
    p.chargeHeld = true;
    p.charge = 0;
  }
  if (p.chargeHeld && held) p.charge += dt;
  if (p.chargeHeld && !held) {
    fireShot(p, p.charge >= BIG_SHOT_CHARGE);
    p.chargeHeld = false;
    p.charge = 0;
  }
}

function fireShot(p, big) {
  const dir = p.facing === 'right' ? { x: 1, y: 0 } : { x: 0, y: -1 };
  state.shots.push({ x: p.x, y: p.y, vx: dir.x * SHOT_SPEED, vy: dir.y * SHOT_SPEED, big, r: big ? 11 : 4, life: 0 });
  p.shotCooldown = 0.14;
  if (big) sfx.bigShot();
  else sfx.shot();
}

// Player shots hit bullets that have `shootHp`. BIG SHOTs do 4 damage and go through
// whatever they destroy; armoured targets (`bigOnly`) ignore small shots.
function updateShots(dt) {
  for (const s of state.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life += dt;

    for (const b of state.bullets) {
      // harmless targets (Spamton's face) can still be shot; only not-yet-appeared ones can't
      if (!b.shootHp || b.dead || (b.warn && b.life < b.warn)) continue;
      if (distanceToBullet(b, s.x, s.y) > s.r) continue;

      if (b.bigOnly && !s.big) {
        s.dead = true;
        break;
      }
      b.shootHp -= s.big ? 4 : 1;
      b.flash = 0.08;
      if (!s.big) s.dead = true;
      if (b.shootHp <= 0) {
        b.dead = true;
        addBurst(b.x, b.y, b.color || '#ffe11a');
        sfx.pop();
        if (b.onDestroyed) b.onDestroyed(b, s);
      }
      if (s.dead) break;
    }
  }
  state.shots = state.shots.filter(s => !s.dead && s.x > -40 && s.x < VIEW_W + 40 && s.y > -40 && s.y < VIEW_H + 40);
}

// ---------------- KARMA ----------------
// Sans' hits add KR. KR keeps draining 1 HP at a time, faster the more KR there is,
// but it can never take the last HP - only a direct hit can.
function karmaInterval(karma) {
  if (karma >= 40) return 1 / 30;
  if (karma >= 30) return 2 / 30;
  if (karma >= 20) return 5 / 30;
  if (karma >= 10) return 15 / 30;
  return 1;
}

function updateKarma(dt) {
  const p = state.player;
  if (p.karma <= 0) return;
  p.karmaTimer += dt;
  while (p.karma > 0 && p.karmaTimer >= karmaInterval(p.karma)) {
    p.karmaTimer -= karmaInterval(p.karma);
    p.karma -= 1;
    if (p.hp > 1) p.hp -= 1;
  }
  if (p.karma <= 0) p.karmaTimer = 0;
}

// ---------------- Drawing ----------------
function drawSoulShape(x, y, size, color) {
  // the heart sprite is red; other modes are drawn as a tinted vector heart
  if (color === SOUL_COLORS.red && imageReady(soulRedSprite)) {
    ctx.drawImage(soulRedSprite, x - size / 2, y - size / 2, size, size);
    return;
  }
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-14, 0, -13, -11, -6, -11);
  ctx.bezierCurveTo(-2, -11, 0, -8, 0, -5);
  ctx.bezierCurveTo(0, -8, 2, -11, 6, -11);
  ctx.bezierCurveTo(13, -11, 14, 0, 0, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const p = state.player;
  // board guides (strings, plus spots) stay visible while the SOUL blinks after a hit
  if (p.mode === 'purple') drawLanes(p);
  if (p.mode === 'plus') drawPlusSpots(p);
  if (p.mode === 'green') drawShield(p);
  if (p.hurtCooldown > 0.05 && Math.floor(p.hurtCooldown * 16) % 2 === 0) return;

  if (p.mode === 'split' && p.halves) {
    drawSplitSoul(p);
    return;
  }

  ctx.save();

  // The yellow SOUL points where it shoots; blue rotates with gravity.
  let angle = 0;
  if (p.mode === 'yellow') angle = p.facing === 'right' ? -Math.PI / 2 : Math.PI;
  if (p.mode === 'blue') angle = { down: 0, up: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[p.gravity];
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  drawSoulShape(0, 0, 22, soulColor());
  ctx.restore();

  if (p.mode === 'yellow' && p.chargeHeld && p.charge > 0.1) {
    const k = Math.min(1, p.charge / BIG_SHOT_CHARGE);
    ctx.save();
    ctx.strokeStyle = k >= 1 ? '#fff' : '#ffe11a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16 - k * 4, 0, Math.PI * 2 * k);
    ctx.stroke();
    ctx.restore();
  }
}

// The green SOUL's shield: a straight bar that swings around the SOUL to the chosen side,
// inside a green ring (the area spears are blocked at).
function drawShield(p) {
  const target = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[p.shield];
  if (p.shieldAngle === undefined) p.shieldAngle = target;
  let diff = target - p.shieldAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  p.shieldAngle += diff * 0.45;
  ctx.save();
  ctx.strokeStyle = 'rgba(22, 201, 22, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, SHIELD_RADIUS + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.shieldAngle);
  const half = SHIELD_RADIUS * 0.95;
  ctx.fillStyle = '#1f4fd8';
  ctx.fillRect(SHIELD_RADIUS - 3, -half, 6, half * 2);
  ctx.fillStyle = '#7fa8ff';
  ctx.fillRect(SHIELD_RADIUS - 3, -half, 2, half * 2);
  ctx.restore();
}

function drawLanes(p) {
  ctx.save();
  ctx.strokeStyle = '#a23aa6';
  ctx.lineWidth = 2;
  for (let i = 0; i < laneCount(); i++) {
    const y = Math.round(laneY(i)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(arena.x, y);
    ctx.lineTo(arena.x + arena.w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShots() {
  ctx.save();
  for (const s of state.shots) {
    ctx.fillStyle = s.big ? '#fff59a' : '#ffe11a';
    if (s.big) {
      fillCircle(s.x, s.y, s.r);
    } else if (s.vx) {
      ctx.fillRect(s.x - 7, s.y - 2, 14, 4);
    } else {
      ctx.fillRect(s.x - 2, s.y - 7, 4, 14);
    }
  }
  ctx.restore();
}

function drawSplitSoul(p) {
  ctx.save();
  // slot markers
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let i = 0; i < 2; i++) {
    for (let slot = 0; slot < 3; slot++) {
      const pos = halfPosition(i, slot);
      ctx.fillRect(pos.x - 10, pos.y + 10, 20, 2);
    }
  }
  p.halves.forEach((h, i) => {
    ctx.save();
    ctx.beginPath();
    // each half is the left or right half of a heart
    ctx.rect(i === 0 ? h.x - 12 : h.x, h.y - 12, 12, 24);
    ctx.clip();
    drawSoulShape(i === 0 ? h.x + 0 : h.x, h.y, 22, h.color === 'red' ? SOUL_COLORS.red : SOUL_COLORS.blue);
    ctx.restore();
  });
  ctx.restore();
}

function drawPlusSpots(p) {
  const c = arenaCenter();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (const [dx, dy] of Object.values(PLUS_SPOTS)) {
    ctx.fillRect(c.x + dx * arena.w * 0.33 - 12, c.y + dy * arena.h * 0.33 - 12, 24, 24);
  }
}
