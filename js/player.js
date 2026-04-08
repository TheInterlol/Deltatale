function updatePlayer(dt) {
  const p = state.player;
  let dx = 0;
  let dy = 0;

  if (keys['arrowleft'] || keys['a']) dx -= 1;
  if (keys['arrowright'] || keys['d']) dx += 1;
  if (keys['arrowup'] || keys['w']) dy -= 1;
  if (keys['arrowdown'] || keys['s']) dy += 1;

  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;

  p.x += dx * p.speed * dt;
  p.y += dy * p.speed * dt;

  p.x = Math.max(arena.x + p.r, Math.min(arena.x + arena.w - p.r, p.x));
  p.y = Math.max(arena.y + p.r, Math.min(arena.y + arena.h - p.r, p.y));

  if (p.hurtCooldown > 0) p.hurtCooldown -= dt;
}