function spawnBullet(x, y, vx, vy, r = 8, kind = 'normal') {
  state.bullets.push({ x, y, vx, vy, r, kind, life: 0 });
}

function updateBullets(dt) {
  const p = state.player;

  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life += dt;
  }

  state.bullets = state.bullets.filter(b => {
    return (
      b.x > arena.x - 80 &&
      b.x < arena.x + arena.w + 80 &&
      b.y > arena.y - 80 &&
      b.y < arena.y + arena.h + 80
    );
  });

  for (const b of state.bullets) {
    const dist = Math.hypot(p.x - b.x, p.y - b.y);

    if (dist < p.r + b.r && p.hurtCooldown <= 0) {
      p.hp -= 1;
      p.hurtCooldown = 0.45;
      statusText.textContent = 'Zásah!';

      if (p.hp <= 0) {
        p.hp = 0;
        endGame();
        break;
      }
    }
  }
}