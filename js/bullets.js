// Jak blízko musí střela proletět, aby se počítala jako graze (nabíjí TP v bitvě).
const GRAZE_DISTANCE = 14;
const GRAZE_TP_PER_SECOND = 14;
const GRAZE_TP_BONUS = 2;

// Vrací střelu, aby si vzor mohl doplnit další vlastnosti
// (zrychlení ax/ay, obdélníkový hitbox hw/hh, minLife...).
function spawnBullet(x, y, vx, vy, r = 8, kind = 'normal') {
  const bullet = { x, y, vx, vy, r, kind, life: 0 };
  state.bullets.push(bullet);
  return bullet;
}

// Vzdálenost středu srdce od okraje střely (<= 0 znamená, že je uvnitř).
// Kosti mají obdélníkový hitbox, aby odpovídal tomu, co je vidět.
function distanceToBullet(b, x, y) {
  if (b.hw) {
    const dx = Math.max(Math.abs(x - b.x) - b.hw, 0);
    const dy = Math.max(Math.abs(y - b.y) - b.hh, 0);
    return Math.hypot(dx, dy);
  }
  return Math.hypot(x - b.x, y - b.y) - b.r;
}

function isBulletAlive(b) {
  if (b.life < (b.minLife || 0)) return true;
  return (
    b.x > arena.x - 80 &&
    b.x < arena.x + arena.w + 80 &&
    b.y > arena.y - 80 &&
    b.y < arena.y + arena.h + 80
  );
}

function getHitDamage() {
  if (state.gameMode !== 'battle' || !state.battle) return 1;
  const damage = state.battle.boss.attack;
  return state.battle.defending ? Math.ceil(damage / 2) : damage;
}

function hurtPlayer(damage) {
  const p = state.player;
  p.hp -= damage;
  p.hurtCooldown = HURT_COOLDOWN[state.gameMode];
  statusText.textContent = 'Zásah!';

  sfx.hurt();
  addShake(5);
  addFlash(1);
  if (state.gameMode === 'battle') addPopup(damage, SUSIE_POS.x + 36, SUSIE_POS.y + 40, '#ff4d4d');
}

function grazeBullet(battle, b, dt) {
  battle.tp = Math.min(100, battle.tp + GRAZE_TP_PER_SECOND * dt);
  if (!b.grazed) {
    b.grazed = true;
    battle.tp = Math.min(100, battle.tp + GRAZE_TP_BONUS);
    addRing(state.player.x, state.player.y);
    sfx.graze();
  }
}

function updateBullets(dt) {
  const p = state.player;

  for (const b of state.bullets) {
    if (b.ax) b.vx += b.ax * dt;
    if (b.ay) b.vy += b.ay * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life += dt;
  }

  state.bullets = state.bullets.filter(isBulletAlive);

  const battle = state.gameMode === 'battle' ? state.battle : null;

  for (const b of state.bullets) {
    const dist = distanceToBullet(b, p.x, p.y);

    if (dist < p.r && p.hurtCooldown <= 0) {
      hurtPlayer(getHitDamage());

      if (p.hp <= 0) {
        p.hp = 0;
        endGame();
        break;
      }
    } else if (battle && dist < p.r + GRAZE_DISTANCE && p.hurtCooldown <= 0) {
      grazeBullet(battle, b, dt);
    }
  }
}
