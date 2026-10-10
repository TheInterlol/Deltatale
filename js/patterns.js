// Sdílené vzory střel. Parametr speedMult (výchozí 1 = původní chování v režimu přežití)
// používají útoky v bitvě, které se s každým kolem zrychlují.

// Spustí fn každých `interval` sekund během útoku. Časovač je uložený v run.timers[key],
// takže jeden útok může kombinovat víc nezávislých vzorů.
function every(run, key, interval, fn, firstDelay = interval) {
  if (!(key in run.timers)) run.timers[key] = interval - firstDelay;
  run.timers[key] += run.dt;
  while (run.timers[key] >= interval) {
    run.timers[key] -= interval;
    fn();
  }
}

function spawnBone(x, y, vx, vy) {
  const bone = spawnBullet(x, y, vx, vy, 10, 'bone');
  // obdélníkový hitbox přesně podle vykreslené kosti (12x36)
  bone.hw = 6;
  bone.hh = 18;
  return bone;
}

function spawnBoneRain(speedMult = 1) {
  for (let i = 0; i < 5; i++) {
    const x = arena.x + 20 + Math.random() * (arena.w - 40);
    const speed = (120 + Math.random() * 90) * speedMult;
    spawnBone(x, arena.y - 20 - Math.random() * 60, 0, speed);
  }
}

// Stěna z kostí, která projede arénou zboku. Má jednu mezeru, kterou se dá proklouznout.
function spawnBoneWall(speedMult = 1) {
  const fromLeft = Math.random() > 0.5;
  const x = fromLeft ? arena.x - 20 : arena.x + arena.w + 20;
  const vx = (fromLeft ? 150 : -150) * speedMult;
  const slots = Math.ceil(arena.h / 36);
  const gap = Math.floor(Math.random() * (slots - 1));

  for (let i = 0; i < slots; i++) {
    if (i === gap || i === gap + 1) continue;
    spawnBone(x, arena.y + 18 + i * 36, vx, 0);
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

function spawnCards(speedMult = 1) {
  // dřív burst vznikal ve středu arény = přesně tam, kde hráč začíná
  const origin = pickPointAwayFromPlayer(110);
  const centerX = origin.x;
  const centerY = origin.y;

  for (let i = 0; i < 12; i++) {
    // patternClock se před voláním nuloval, takže otočení se bere z celkového času
    const angle = (Math.PI * 2 * i) / 12 + state.timer * 0.7;
    const speed = 120 * speedMult;
    spawnBullet(centerX, centerY, Math.cos(angle) * speed, Math.sin(angle) * speed, 7, 'card');
  }
}

function spawnBlasters(speedMult = 1) {
  const fromLeft = Math.random() > 0.5;
  const y = arena.y + 20 + Math.random() * (arena.h - 40);
  const x = fromLeft ? arena.x - 40 : arena.x + arena.w + 40;
  const vx = (fromLeft ? 260 : -260) * speedMult;

  spawnBullet(x, y, vx, 0, 14, 'blaster');
}

function spawnDummy(speedMult = 1) {
  const side = Math.floor(Math.random() * 4);
  const speed = 140 * speedMult;

  if (side === 0) spawnBullet(arena.x - 15, arena.y + Math.random() * arena.h, speed, 0, 9);
  if (side === 1) spawnBullet(arena.x + arena.w + 15, arena.y + Math.random() * arena.h, -speed, 0, 9);
  if (side === 2) spawnBullet(arena.x + Math.random() * arena.w, arena.y - 15, 0, speed, 9);
  if (side === 3) spawnBullet(arena.x + Math.random() * arena.w, arena.y + arena.h + 15, 0, -speed, 9);
}
