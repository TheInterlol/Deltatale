// The player's SOUL and its modes. Each mode changes how the SOUL is controlled:
//   red    - free movement (default)
//   blue   - gravity + jumping; gravity can point any way and the SOUL can be slammed (Papyrus, Sans)
//   green  - fixed in place, block spears with a shield (Undyne)
//   yellow - free movement + shooting; Deltarune adds a charged BIG SHOT (Mettaton, Spamton NEO)
//   purple - stuck to horizontal strings (Muffet)
const SOUL_SPEED = 130;
const SOUL_COLORS = {
  red: '#ff0000',
  blue: '#1d4dff',
  green: '#00c000',
  yellow: '#ffff00',
  purple: '#d535d9'
};

const BLUE_JUMP = 330;      // initial jump speed (px/s)
const BLUE_GRAVITY = 820;   // px/s^2
const BLUE_JUMP_CUT = 60;   // releasing the jump key early caps the upward speed to this
const BLUE_MAX_FALL = 540;
const BLUE_SLAM = 1100;

const SHIELD_RADIUS = 24;
const BIG_SHOT_CHARGE = 0.7;

const DIRS = {
  up: { x: 0, y: -1, angle: -Math.PI / 2 },
  down: { x: 0, y: 1, angle: Math.PI / 2 },
  left: { x: -1, y: 0, angle: Math.PI },
  right: { x: 1, y: 0, angle: 0 }
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DIR_KEYS = { up: UP_KEYS, down: DOWN_KEYS, left: LEFT_KEYS, right: RIGHT_KEYS };

const soul = {
  x: W / 2,
  y: 300,
  r: 6,
  size: 16,
  mode: 'red',
  color: SOUL_COLORS.red,
  visible: false,
  frozen: false,
  moving: false,
  invuln: 0,
  speed: SOUL_SPEED,
  // blue
  gravity: 'down',
  fall: 0,
  grounded: false,
  jumping: false,
  slamming: false,
  onSlam: null,
  // green
  shieldDir: 'up',
  shieldAngle: -Math.PI / 2,
  // yellow
  shootDir: 'up',
  charge: 0,
  cooldown: 0,
  canBigShot: false,
  // purple
  lineCount: 3,
  lineIndex: 1
};

function placeSoul(x, y) {
  soul.x = x;
  soul.y = y;
}

function centerSoul() {
  const c = boardCenter();
  const t = board.target;
  // use the target box so the SOUL appears in the right place while the box is still tweening
  placeSoul(t.x + t.w / 2, t.y + t.h / 2);
  return c;
}

function setSoulMode(mode, opts = {}) {
  const changed = soul.mode !== mode;
  soul.mode = mode;
  soul.color = opts.color || SOUL_COLORS[mode];
  soul.speed = opts.speed || SOUL_SPEED;
  soul.fall = 0;
  soul.slamming = false;
  soul.jumping = false;
  soul.grounded = false;
  soul.charge = 0;

  if (mode === 'blue') {
    soul.gravity = opts.gravity || 'down';
    if (opts.slam) slamSoul(soul.gravity, opts.onSlam);
  }
  if (mode === 'green') {
    soul.shieldDir = opts.shieldDir || 'up';
    soul.shieldAngle = DIRS[soul.shieldDir].angle;
  }
  if (mode === 'yellow') {
    soul.shootDir = opts.shootDir || (currentStyle() === 'deltarune' ? 'right' : 'up');
    soul.canBigShot = opts.bigShot !== undefined ? opts.bigShot : currentStyle() === 'deltarune';
  }
  if (mode === 'purple') {
    soul.lineCount = opts.lines || 3;
    soul.lineIndex = opts.lineIndex !== undefined ? opts.lineIndex : Math.floor(soul.lineCount / 2);
  }
  if (changed && opts.announce !== false) sfx.soulChange();
}

// Blue SOUL: throw the SOUL against a wall (Sans). onSlam runs on impact.
function slamSoul(dir, onSlam = null) {
  soul.gravity = dir;
  soul.slamming = true;
  soul.fall = BLUE_SLAM;
  soul.onSlam = onSlam;
}

function purpleLineY(index) {
  const b = boardBounds(0);
  return b.top + ((index + 1) * (b.bottom - b.top)) / (soul.lineCount + 1);
}

function moveFreely(dt) {
  let dx = 0;
  let dy = 0;
  if (isHeld(LEFT_KEYS)) dx -= 1;
  if (isHeld(RIGHT_KEYS)) dx += 1;
  if (isHeld(UP_KEYS)) dy -= 1;
  if (isHeld(DOWN_KEYS)) dy += 1;
  soul.x += dx * soul.speed * dt;
  soul.y += dy * soul.speed * dt;
}

function updateBlueSoul(dt) {
  const g = DIRS[soul.gravity];
  const vertical = g.x === 0;
  const jumpKeys = DIR_KEYS[OPPOSITE[soul.gravity]];

  // sideways movement
  let lat = 0;
  if (vertical) {
    if (isHeld(LEFT_KEYS)) lat -= 1;
    if (isHeld(RIGHT_KEYS)) lat += 1;
    soul.x += lat * soul.speed * dt;
  } else {
    if (isHeld(UP_KEYS)) lat -= 1;
    if (isHeld(DOWN_KEYS)) lat += 1;
    soul.y += lat * soul.speed * dt;
  }

  // ride a moving platform
  if (soul.platform && !soul.platform.dead) {
    soul.x += soul.platform.vx * dt;
    soul.y += soul.platform.vy * dt;
  }

  if (soul.slamming) {
    soul.fall = BLUE_SLAM;
  } else {
    if (soul.grounded && isHeld(jumpKeys)) {
      soul.fall = -BLUE_JUMP;
      soul.grounded = false;
      soul.jumping = true;
      soul.platform = null;
    }
    if (soul.jumping && !isHeld(jumpKeys) && soul.fall < -BLUE_JUMP_CUT) soul.fall = -BLUE_JUMP_CUT;
    soul.fall = Math.min(BLUE_MAX_FALL, soul.fall + BLUE_GRAVITY * dt);
  }

  soul.x += g.x * soul.fall * dt;
  soul.y += g.y * soul.fall * dt;

  // floor / ceiling of the board along the gravity axis
  const b = boardBounds(soul.r);
  let landed = false;
  if (soul.gravity === 'down' && soul.y >= b.bottom) { soul.y = b.bottom; landed = true; }
  if (soul.gravity === 'up' && soul.y <= b.top) { soul.y = b.top; landed = true; }
  if (soul.gravity === 'right' && soul.x >= b.right) { soul.x = b.right; landed = true; }
  if (soul.gravity === 'left' && soul.x <= b.left) { soul.x = b.left; landed = true; }

  const hitCeiling =
    (soul.gravity === 'down' && soul.y <= b.top) || (soul.gravity === 'up' && soul.y >= b.bottom) ||
    (soul.gravity === 'right' && soul.x <= b.left) || (soul.gravity === 'left' && soul.x >= b.right);
  if (hitCeiling && soul.fall < 0) soul.fall = 0;

  // platforms only support a downward gravity
  if (!landed && soul.gravity === 'down' && soul.fall >= 0) {
    for (const p of state.bullets) {
      if (!p.platform || p.dead) continue;
      const top = p.y - p.h / 2;
      const withinX = Math.abs(soul.x - p.x) <= p.w / 2 + 2;
      const feet = soul.y + soul.r;
      if (withinX && feet >= top - 2 && feet <= top + 10) {
        soul.y = top - soul.r;
        landed = true;
        soul.platform = p;
        break;
      }
    }
  }
  if (!landed && soul.platform) soul.platform = null;

  if (landed) {
    if (soul.slamming) {
      soul.slamming = false;
      addShake(5);
      sfx.slam();
      const cb = soul.onSlam;
      soul.onSlam = null;
      if (cb) cb();
    }
    soul.fall = 0;
    soul.grounded = true;
    soul.jumping = false;
  } else {
    soul.grounded = false;
  }
}

function updateGreenSoul(dt) {
  const c = boardCenter();
  placeSoul(c.x, c.y);
  for (const dir of ['up', 'down', 'left', 'right']) {
    if (consumePress(DIR_KEYS[dir])) soul.shieldDir = dir;
  }
  // rotate the shield quickly toward the chosen side along the shortest way
  const target = DIRS[soul.shieldDir].angle;
  let diff = target - soul.shieldAngle;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const step = 28 * dt;
  soul.shieldAngle += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
}

function fireShot(big) {
  const d = DIRS[soul.shootDir];
  const speed = big ? 520 : 640;
  state.shots.push({
    x: soul.x + d.x * 10,
    y: soul.y + d.y * 10,
    vx: d.x * speed,
    vy: d.y * speed,
    r: big ? 14 : 4,
    big,
    damage: big ? 4 : 1,
    dead: false
  });
  if (big) sfx.bigShot();
  else sfx.shoot();
}

function updateYellowSoul(dt) {
  moveFreely(dt);
  soul.cooldown = Math.max(0, soul.cooldown - dt);
  if (consumePress(CONFIRM_KEYS) && soul.cooldown <= 0) {
    fireShot(false);
    soul.cooldown = 0.1;
  }
  if (soul.canBigShot) {
    if (isHeld(CONFIRM_KEYS)) soul.charge += dt;
    else {
      if (soul.charge >= BIG_SHOT_CHARGE) fireShot(true);
      soul.charge = 0;
    }
  }
}

function updatePurpleSoul(dt) {
  if (consumePress(UP_KEYS)) soul.lineIndex = Math.max(0, soul.lineIndex - 1);
  if (consumePress(DOWN_KEYS)) soul.lineIndex = Math.min(soul.lineCount - 1, soul.lineIndex + 1);
  let dx = 0;
  if (isHeld(LEFT_KEYS)) dx -= 1;
  if (isHeld(RIGHT_KEYS)) dx += 1;
  soul.x += dx * soul.speed * dt;
  const targetY = purpleLineY(soul.lineIndex);
  soul.y += (targetY - soul.y) * Math.min(1, dt * 25);
}

function updateSoul(dt) {
  if (!soul.visible) return;
  const prevX = soul.x;
  const prevY = soul.y;

  if (!soul.frozen) {
    if (soul.mode === 'blue') updateBlueSoul(dt);
    else if (soul.mode === 'green') updateGreenSoul(dt);
    else if (soul.mode === 'yellow') updateYellowSoul(dt);
    else if (soul.mode === 'purple') updatePurpleSoul(dt);
    else moveFreely(dt);
  }

  if (soul.mode !== 'green') {
    const p = clampToBoard(soul.x, soul.y, soul.r);
    soul.x = p.x;
    soul.y = p.y;
  }

  soul.moving = Math.hypot(soul.x - prevX, soul.y - prevY) > 0.05;
}

function drawSoul() {
  if (!soul.visible) return;
  // blinking during invulnerability frames
  if (soul.invuln > 0 && Math.floor(soul.invuln * 16) % 2 === 0) return;

  let rotation = 0;
  if (soul.mode === 'yellow') rotation = soul.shootDir === 'right' ? -Math.PI / 2 : Math.PI;
  if (soul.mode === 'blue') rotation = DIRS[soul.gravity].angle - Math.PI / 2;

  if (soul.mode === 'purple') {
    const b = boardBounds(0);
    ctx.save();
    ctx.strokeStyle = '#a03ac0';
    ctx.lineWidth = 2;
    for (let i = 0; i < soul.lineCount; i++) line(b.left, purpleLineY(i), b.right, purpleLineY(i));
    ctx.restore();
  }

  if (soul.mode === 'green') {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 200, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(soul.x, soul.y, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#3ab0ff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(soul.x, soul.y, SHIELD_RADIUS, soul.shieldAngle - 0.75, soul.shieldAngle + 0.75);
    ctx.stroke();
    ctx.restore();
  }

  if (soul.mode === 'yellow' && soul.charge > 0.15) {
    const k = Math.min(1, soul.charge / BIG_SHOT_CHARGE);
    ctx.save();
    ctx.strokeStyle = k >= 1 ? '#ffffff' : '#ffff00';
    ctx.globalAlpha = 0.4 + 0.6 * k;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(soul.x, soul.y, 22 - 10 * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawHeart(soul.x, soul.y, soul.size, soul.color, rotation);
}
