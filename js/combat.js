// SOUL vs bullets: hits, invulnerability frames, KARMA (Sans), graze/TP (Deltarune)
// and the green-SOUL shield.
const UT_INVULN = 0.9;
const DR_INVULN = 1.0;
const GRAZE_DISTANCE = 16;
const GRAZE_TP_PER_SECOND = 10;
const GRAZE_TP_BONUS = 2.5;
const KARMA_MAX = 40;
const KARMA_TICK = 1 / 30;

function updateCombat(dt) {
  const battle = state.battle;
  if (!soul.visible || !battle) return;
  soul.invuln = Math.max(0, soul.invuln - dt);
  battle.karmaContact = false;

  if (soul.mode === 'green') updateShieldBlocks();

  for (const b of state.bullets) {
    if (b.dead || b.shape === 'none' || b.harmless) continue;
    const d = bulletDistance(b, soul.x, soul.y);

    if (d < soul.r) {
      if (!bulletHurtsNow(b)) continue;
      if (b.healing) {
        b.dead = true;
        for (const m of aliveMembers(battle)) healMember(battle, m, b.healing);
        sfx.heal();
        continue;
      }
      hitSoul(b);
      if (b.destroyOnHit) b.dead = true;
      if (battle.phase === 'gameover') return;
    } else if (battle.style === 'deltarune' && d < soul.r + GRAZE_DISTANCE && soul.invuln <= 0 && bulletHurtsNow(b)) {
      grazeBullet(battle, b, dt);
    }
  }

  if (battle.karma) updateKarma(dt);
}

function bulletDamage(b) {
  const battle = state.battle;
  if (b && b.damage !== null && b.damage !== undefined) return b.damage;
  const attack = battle.run && battle.run.attack;
  if (attack && attack.damage) return attack.damage;
  return battle.boss.damage || 3;
}

function hitSoul(b) {
  const battle = state.battle;

  // Sans: no invulnerability frames - every frame of contact hurts and adds KARMA.
  if (battle.karma) {
    battle.karmaContact = true;
    battle.karmaHitTimer = (battle.karmaHitTimer || 0);
    if (battle.karmaHitTimer > 0) return;
    battle.karmaHitTimer = KARMA_TICK;
    const member = battle.party[0];
    member.hp -= 1;
    battle.kr = Math.min(KARMA_MAX, battle.kr + (b && b.karma !== undefined ? b.karma : 1));
    if (battle.kr > member.hp - 1) battle.kr = Math.max(0, member.hp - 1);
    sfx.karma();
    addFlash(0.3);
    if (member.hp <= 0) {
      member.hp = 0;
      playerDefeated(battle);
    }
    return;
  }

  if (soul.invuln > 0) return;
  const damage = bulletDamage(b);
  soul.invuln = battle.style === 'deltarune' ? DR_INVULN : (battle.boss.invuln || UT_INVULN);
  damageParty(battle, damage, b && b.target);
}

// Applies damage to the player side. Undertale: the single human. Deltarune: a random
// conscious party member (or the one an attack targets). Downed members go to negative HP.
function damageParty(battle, damage, targetId = null) {
  sfx.hurt();
  addShake(4);
  addFlash(0.8);

  if (battle.style === 'undertale') {
    const member = battle.party[0];
    if (battle.boss.beforePlayerDamage) {
      damage = battle.boss.beforePlayerDamage(battle, damage);
      if (damage <= 0) return;
    }
    member.hp -= damage;
    if (member.hp <= 0) {
      member.hp = 0;
      if (battle.boss.onPlayerZeroHp && battle.boss.onPlayerZeroHp(battle)) return;
      playerDefeated(battle);
    }
    return;
  }

  const alive = aliveMembers(battle);
  if (!alive.length) return;
  const member = (targetId && alive.find(m => m.id === targetId)) || alive[Math.floor(Math.random() * alive.length)];
  const actual = Math.max(1, Math.round(member.defending ? damage * 0.6 : damage));
  member.hp -= actual;
  member.hurt = 0.4;
  const pos = memberPosition(battle, member);
  addPopup(actual, pos.x + 20, pos.y - 10, '#ff4040', 22);

  if (member.hp <= 0) {
    member.down = true;
    member.hp = -Math.floor(member.maxHp / 2);
    addPopup('DOWN', pos.x + 20, pos.y + 14, '#ff4040', 18);
    if (!aliveMembers(battle).length) playerDefeated(battle);
  }
}

function grazeBullet(battle, b, dt) {
  battle.tp = Math.min(100, battle.tp + GRAZE_TP_PER_SECOND * dt);
  if (!b.grazed) {
    b.grazed = true;
    battle.tp = Math.min(100, battle.tp + GRAZE_TP_BONUS);
    addRing(soul.x, soul.y);
    sfx.graze();
  }
}

// KARMA drains HP over time, faster the more KR there is. It can't kill by itself.
function updateKarma(dt) {
  const battle = state.battle;
  const member = battle.party[0];
  battle.karmaHitTimer = Math.max(0, (battle.karmaHitTimer || 0) - dt);
  if (battle.kr <= 0) return;

  const kr = battle.kr;
  const interval = kr >= 40 ? 1 / 30 : kr >= 30 ? 2 / 30 : kr >= 20 ? 5 / 30 : kr >= 10 ? 15 / 30 : 1;
  battle.karmaDrain = (battle.karmaDrain || 0) + dt;
  while (battle.karmaDrain >= interval && battle.kr > 0) {
    battle.karmaDrain -= interval;
    battle.kr -= 1;
    if (member.hp > 1) member.hp -= 1;
  }
}

// -------------- Green SOUL shield --------------
// Arrow bullets (kind 'arrow') fly at the SOUL from one side. If the shield faces that side
// when they reach it, they are blocked; otherwise they hit the SOUL.
function updateShieldBlocks() {
  for (const b of state.bullets) {
    if (b.kind !== 'arrow' || b.dead) continue;
    const dist = Math.hypot(b.x - soul.x, b.y - soul.y);
    if (dist > SHIELD_RADIUS + 6) continue;
    const from = Math.atan2(b.y - soul.y, b.x - soul.x);
    let diff = from - soul.shieldAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) < Math.PI / 4 + 0.15) {
      b.dead = true;
      sfx.ding();
      addRing(b.x, b.y, '#3ab0ff');
      if (state.battle.style === 'deltarune') state.battle.tp = Math.min(100, state.battle.tp + 1);
    }
  }
}
