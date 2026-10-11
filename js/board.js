// The bullet board ("box"). It tweens between the text box and each attack's box,
// can move, rotate (Jevil) or hide, and keeps the SOUL inside.
const BOARD_BORDER = 5;

const board = {
  x: UT.textBox.x,
  y: UT.textBox.y,
  w: UT.textBox.w,
  h: UT.textBox.h,
  angle: 0,
  spin: 0,
  visible: true,
  alpha: 1,
  target: { ...UT.textBox },
  speed: 12
};

// spec: { w, h } (default anchor depends on the game), or explicit { x, y } / { cx, cy }.
function resolveBoardSpec(spec) {
  const w = spec.w !== undefined ? spec.w : 165;
  const h = spec.h !== undefined ? spec.h : 140;
  let x;
  let y;

  if (spec.x !== undefined) x = spec.x;
  else x = (spec.cx !== undefined ? spec.cx : (currentStyle() === 'deltarune' ? DR.board.cx : W / 2)) - w / 2;

  if (spec.y !== undefined) y = spec.y;
  else if (spec.cy !== undefined) y = spec.cy - h / 2;
  else if (currentStyle() === 'undertale') y = UT.boxBottom - h;
  else y = DR.board.cy - h / 2;

  return { x, y, w, h };
}

function setBoard(spec, { instant = false, speed = 12 } = {}) {
  board.target = resolveBoardSpec(spec);
  board.speed = speed;
  if (spec.angle !== undefined) board.angle = spec.angle;
  if (spec.spin !== undefined) board.spin = spec.spin;
  if (instant) Object.assign(board, board.target);
}

function updateBoard(dt) {
  const k = Math.min(1, dt * board.speed);
  for (const prop of ['x', 'y', 'w', 'h']) {
    board[prop] += (board.target[prop] - board[prop]) * k;
    if (Math.abs(board.target[prop] - board[prop]) < 0.5) board[prop] = board.target[prop];
  }
  board.angle += board.spin * dt;
}

function boardSettled() {
  return ['x', 'y', 'w', 'h'].every(p => Math.abs(board.target[p] - board[p]) < 1);
}

function boardCenter() {
  return { x: board.x + board.w / 2, y: board.y + board.h / 2 };
}

// Inner limits for a point of radius r (ignores rotation).
function boardBounds(r = 0) {
  return {
    left: board.x + BOARD_BORDER + r,
    right: board.x + board.w - BOARD_BORDER - r,
    top: board.y + BOARD_BORDER + r,
    bottom: board.y + board.h - BOARD_BORDER - r
  };
}

// Keeps a point inside the (possibly rotated) board.
function clampToBoard(px, py, r) {
  const c = boardCenter();
  const cos = Math.cos(-board.angle);
  const sin = Math.sin(-board.angle);
  let lx = (px - c.x) * cos - (py - c.y) * sin;
  let ly = (px - c.x) * sin + (py - c.y) * cos;
  const hw = Math.max(0, board.w / 2 - BOARD_BORDER - r);
  const hh = Math.max(0, board.h / 2 - BOARD_BORDER - r);
  lx = Math.max(-hw, Math.min(hw, lx));
  ly = Math.max(-hh, Math.min(hh, ly));
  const cos2 = Math.cos(board.angle);
  const sin2 = Math.sin(board.angle);
  return { x: c.x + lx * cos2 - ly * sin2, y: c.y + lx * sin2 + ly * cos2 };
}

function drawBoard() {
  if (!board.visible || board.alpha <= 0) return;
  const c = boardCenter();
  ctx.save();
  ctx.globalAlpha = board.alpha;
  ctx.translate(c.x, c.y);
  ctx.rotate(board.angle);
  ctx.fillStyle = '#000';
  ctx.fillRect(-board.w / 2, -board.h / 2, board.w, board.h);
  ctx.strokeStyle = currentStyle() === 'deltarune' ? '#00c000' : '#fff';
  ctx.lineWidth = BOARD_BORDER;
  ctx.strokeRect(-board.w / 2 + BOARD_BORDER / 2, -board.h / 2 + BOARD_BORDER / 2, board.w - BOARD_BORDER, board.h - BOARD_BORDER);
  ctx.restore();
}
