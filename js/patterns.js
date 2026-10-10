function spawnBoneRain() {
  for (let i = 0; i < 5; i++) {
    const x = arena.x + 20 + Math.random() * (arena.w - 40);
    const speed = 120 + Math.random() * 90;
    spawnBullet(x, arena.y - 20 - Math.random() * 60, 0, speed, 10, 'bone');
  }
}

// Najde bod v aréně, který je od hráče aspoň minDist daleko (aby burst nevznikl přímo na srdci).
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

function spawnCards() {
  // dřív burst vznikal ve středu arény = přesně tam, kde hráč začíná
  const origin = pickPointAwayFromPlayer(110);
  const centerX = origin.x;
  const centerY = origin.y;

  for (let i = 0; i < 12; i++) {
    // patternClock se před voláním nuluje, takže otočení se bere z celkového času
    const angle = (Math.PI * 2 * i) / 12 + state.timer * 0.7;
    const speed = 120;
    spawnBullet(centerX, centerY, Math.cos(angle) * speed, Math.sin(angle) * speed, 7, 'card');
  }
}

function spawnBlasters() {
  const fromLeft = Math.random() > 0.5;
  const y = arena.y + 20 + Math.random() * (arena.h - 40);
  const x = fromLeft ? arena.x - 40 : arena.x + arena.w + 40;
  const vx = fromLeft ? 260 : -260;

  spawnBullet(x, y, vx, 0, 14, 'blaster');
}

function spawnDummy() {
  const side = Math.floor(Math.random() * 4);
  const speed = 140;

  if (side === 0) spawnBullet(arena.x - 15, arena.y + Math.random() * arena.h, speed, 0, 9);
  if (side === 1) spawnBullet(arena.x + arena.w + 15, arena.y + Math.random() * arena.h, -speed, 0, 9);
  if (side === 2) spawnBullet(arena.x + Math.random() * arena.w, arena.y - 15, 0, speed, 9);
  if (side === 3) spawnBullet(arena.x + Math.random() * arena.w, arena.y + arena.h + 15, 0, -speed, 9);
}

function handlePatterns(dt) {
  state.patternClock += dt;

  if (state.mode === 'dummy') {
    if (state.patternClock >= 0.55) {
      state.patternClock = 0;
      spawnDummy();
    }
  }

  if (state.mode === 'bones') {
    if (state.patternClock >= 0.8) {
      state.patternClock = 0;
      spawnBoneRain();
    }
  }

  if (state.mode === 'cards') {
    if (state.patternClock >= 1.2) {
      state.patternClock = 0;
      spawnCards();
    }
  }

  if (state.mode === 'neo') {
    if (state.patternClock >= 0.5) {
      state.patternClock = 0;
      spawnBlasters();
    }
  }
}