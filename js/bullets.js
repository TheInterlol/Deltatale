// Bullets: everything in the bullet board that can hurt (or carry) the SOUL.
//
// spawnBullet(x, y, vx, vy, r, kind) returns the bullet so a pattern can add options:
//   hw, hh          rectangular hitbox (half width / height) instead of the circle r
//   angle, spin     rotation of a rectangular hitbox (radians, radians/s)
//   ax, ay          acceleration
//   warn            seconds of telegraph before it becomes dangerous (drawn as a warning)
//   activeFor       seconds it stays dangerous after the warning, then it disappears
//   maxLife         remove after this many seconds
//   minLife / noCull  don't remove it while it is still outside the board
//   color           'cyan' = only hurts a moving SOUL, 'orange' = only hurts a still SOUL
//   damage, karma   damage per hit (default: the boss' attack), KR added per hit
//   harmless        never hurts (decoration, platforms)
//   platform        blue SOUL can stand on it (needs hw/hh)
//   dir             green SOUL: the side the spear comes from ('up', 'left'...)
//   shootHp, bigOnly, onDestroyed   yellow SOUL can shoot it
//   avoidSoul       steers away from the SOUL instead of hitting it (Toriel)
//   update(b, dt)   fully custom movement
//   clip = false    may be drawn outside the board

const GRAZE_DISTANCE = 14;
const GRAZE_TP_PER_SECOND = 14;
const GRAZE_TP_BONUS = 2;
const CULL_MARGIN = 80;

function spawnBullet(x, y, vx, vy, r = 8, kind = 'normal') {
  const bullet = { x, y, vx, vy, r, kind, life: 0 };
  state.bullets.push(bullet);
  return bullet;
}

// Same as spawnBullet but with all options in one object.
function spawn(options) {
  const b = spawnBullet(options.x, options.y, options.vx || 0, options.vy || 0, options.r || 8, options.kind || 'normal');
  return Object.assign(b, options);
}

function bulletActive(b) {
  if (b.harmless || b.platform || b.solid) return false;
  if (b.warn && b.life < b.warn) return false;
  if (b.activeFor !== undefined && b.life > (b.warn || 0) + b.activeFor) return false;
  return true;
}

// Distance from (x, y) to the edge of the bullet (<= 0 means inside).
function distanceToBullet(b, x, y) {
  if (b.hw) {
    let lx = x - b.x;
    let ly = y - b.y;
    if (b.angle) {
      const c = Math.cos(-b.angle);
      const s = Math.sin(-b.angle);
      const rx = lx * c - ly * s;
      ly = lx * s + ly * c;
      lx = rx;
    }
    const dx = Math.max(Math.abs(lx) - b.hw, 0);
    const dy = Math.max(Math.abs(ly) - b.hh, 0);
    return Math.hypot(dx, dy);
  }
  return Math.hypot(x - b.x, y - b.y) - b.r;
}

function isBulletAlive(b) {
  if (b.dead) return false;
  if (b.maxLife !== undefined && b.life >= b.maxLife) return false;
  if (b.activeFor !== undefined && b.life > (b.warn || 0) + b.activeFor + (b.fadeOut || 0.12)) return false;
  if (b.noCull || b.life < (b.minLife || 0)) return true;
  return (
    b.x > arena.x - CULL_MARGIN &&
    b.x < arena.x + arena.w + CULL_MARGIN &&
    b.y > arena.y - CULL_MARGIN &&
    b.y < arena.y + arena.h + CULL_MARGIN
  );
}

function getHitDamage(b) {
  if (state.gameMode !== 'battle' || !state.battle) return 1;
  const battle = state.battle;
  if (battle.noDamage || b.damage === 0) return 0;
  let damage = b.damage !== undefined ? b.damage : battle.boss.attack;
  if (battle.attackMult) damage = Math.max(1, Math.round(damage * battle.attackMult));
  return battle.defending ? Math.ceil(damage / 2) : damage;
}

// Cyan bullets only hurt a moving SOUL, orange only a still one.
function colorAllowsHit(b) {
  if (b.color === 'cyan') return state.player.moving;
  if (b.color === 'orange') return !state.player.moving;
  return true;
}

function hurtPlayer(damage, b = {}) {
  const p = state.player;
  const battle = state.battle;
  const boss = battle && battle.boss;

  // Asgore: with more than 1 HP left, a hit that would kill leaves you at 1 HP instead
  if (boss && boss.hitsLeaveOne && p.hp > 1 && p.hp - damage <= 0) damage = p.hp - 1;

  p.hp -= damage;
  if (boss && boss.karma) p.karma = Math.min(40, p.karma + (b.karma !== undefined ? b.karma : 1));
  p.hurtCooldown = getIframes();
  setHint('Ouch!');

  sfx.hurt();
  effects.susieHurt = SUSIE_HURT_TIME;
  // Sans hits every frame - a full flash each time would paint the screen red
  addShake(boss && boss.karma ? 1.5 : 5);
  if (!(boss && boss.karma)) addFlash(1);
  if (battle && !boss.karma) addPopup(damage, partyPopupPos().x, partyPopupPos().y, '#ff4d4d');
  if (battle && boss.onPlayerHurt) boss.onPlayerHurt(battle, damage);
}

function getIframes() {
  if (state.gameMode !== 'battle' || !state.battle) return HURT_COOLDOWN.survival;
  const boss = state.battle.boss;
  return boss.iframes !== undefined ? boss.iframes : HURT_COOLDOWN.battle;
}

function grazeBullet(battle, b, dt) {
  battle.tp = Math.min(100, battle.tp + GRAZE_TP_PER_SECOND * dt);
  if (!b.grazed) {
    b.grazed = true;
    if (battle.boss.onGraze) battle.boss.onGraze(battle, b);
    battle.tp = Math.min(100, battle.tp + GRAZE_TP_BONUS);
    addRing(state.player.x, state.player.y);
    sfx.graze();
  }
}

function moveBullet(b, dt) {
  if (b.update) {
    b.update(b, dt);
  } else {
    if (b.ax) b.vx += b.ax * dt;
    if (b.ay) b.vy += b.ay * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  if (b.spin) b.angle = (b.angle || 0) + b.spin * dt;
  if (b.flash) b.flash = Math.max(0, b.flash - dt);
  b.life += dt;
}

// Toriel's faltering fireballs swerve around the SOUL.
function steerAway(b, dt) {
  const p = state.player;
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist < 46) {
    const push = (46 - dist) * 14 * dt;
    b.x += (dx / dist) * push;
    b.y += (dy / dist) * push * 0.3;
  }
}

// Green SOUL: a spear that reaches the shield ring while the shield faces it is blocked.
function updateSpearBlock(b) {
  const p = state.player;
  if (p.mode !== 'green' || !b.dir || b.blocked) return false;
  const dist = Math.hypot(b.x - p.x, b.y - p.y);
  if (dist > SHIELD_RADIUS + 6) return false;
  if (p.shield === b.dir) {
    b.blocked = true;
    b.dead = true;
    addRing(b.x, b.y);
    sfx.block();
    if (state.battle && state.battle.boss.onBlock) state.battle.boss.onBlock(state.battle, b);
    return true;
  }
  return false;
}

function updateBullets(dt) {
  const p = state.player;

  for (const b of state.bullets) {
    moveBullet(b, dt);
    if (b.avoidSoul) steerAway(b, dt);
  }
  state.bullets = state.bullets.filter(isBulletAlive);

  const battle = state.gameMode === 'battle' ? state.battle : null;
  const graze = battle && battle.boss.game === 'deltarune';

  for (const b of state.bullets) {
    // healing bullets (Omega Flowey's saved SOULs) heal instead of hurting
    if (b.heal && !b.dead && distanceToBullet(b, p.x, p.y) < p.r) {
      b.dead = true;
      p.hp = Math.min(p.maxHp, p.hp + b.heal);
      addPopup(`+${b.heal}`, p.x, p.y - 12, '#7dff7d');
      sfx.heal();
      continue;
    }
    if (!bulletActive(b)) continue;
    if (updateSpearBlock(b)) continue;

    // a split SOUL has two hit points; a bullet with passColor lets that half through
    let dist = Infinity;
    for (const point of soulHitPoints()) {
      if (b.passColor && point.color === b.passColor) continue;
      dist = Math.min(dist, distanceToBullet(b, point.x, point.y));
    }
    if (dist < p.r && p.hurtCooldown <= 0 && colorAllowsHit(b)) {
      hurtPlayer(getHitDamage(b), b);
      if (b.onHit) b.onHit(b);
      if (b.dieOnHit) b.dead = true;

      if (p.hp <= 0) {
        handleLethalHit();
        return;
      }
    } else if (graze && dist < p.r + GRAZE_DISTANCE && dist >= p.r && p.hurtCooldown <= 0) {
      grazeBullet(battle, b, dt);
    }
  }
}

// A boss can catch a lethal hit (Papyrus "captures" you instead of killing you).
function handleLethalHit() {
  const p = state.player;
  const battle = state.battle;
  if (battle && battle.boss.onLethal && battle.boss.onLethal(battle) === true) {
    p.hp = Math.max(1, p.hp);
    return;
  }
  p.hp = 0;
  endGame();
}
