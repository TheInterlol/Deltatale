// FIGHT minigames.
// Undertale: one cursor sweeps across the target; Z as close to the centre as possible.
// Deltarune: every fighter has a lane; cursors slide left toward the target box and each Z
// press hits the front-most cursor. Perfect hits do bonus damage.
const UT_BAR_TIME = 1.3;
const DR_TARGET_X = 96;
const DR_CURSOR_SPEED = 300;
const DR_RANGE = 140;

function updateFightStep(battle, step, dt) {
  return battle.style === 'undertale' ? updateUtFight(battle, step, dt) : updateDrFight(battle, step, dt);
}

function utFightDamage(battle, member, accuracy) {
  const base = member.atk - battle.enemy.def + Math.random() * 2;
  const mult = accuracy >= 0.96 ? 2.2 : Math.max(0.2, 2 * accuracy);
  return Math.max(1, Math.round(base * mult));
}

function drFightDamage(battle, member, accuracy, perfect) {
  const base = member.atk * 7.5 - battle.enemy.def * 3;
  const mult = perfect ? 1.3 : 0.25 + 0.75 * accuracy;
  return Math.max(1, Math.round(base * mult * (0.95 + Math.random() * 0.1)));
}

function updateUtFight(battle, step, dt) {
  const member = battle.party[0];
  if (!step.state) {
    step.state = 'aim';
    step.pos = 0;
    step.anim = 0;
    setBoard(UT.textBox);
    board.visible = true;
  }

  if (step.state === 'aim') {
    step.pos += dt / UT_BAR_TIME;
    if (confirmPressed()) {
      const accuracy = 1 - Math.min(1, Math.abs(step.pos - 0.5) * 2);
      step.crit = accuracy >= 0.96;
      sfx.slash();
      member.pose = 'attack';
      member.poseTime = 0.4;
      attackEnemy(battle, utFightDamage(battle, member, accuracy), { member, crit: step.crit });
      step.state = 'anim';
    } else if (step.pos >= 1) {
      const pos = enemyPosition(battle);
      addPopup('MISS', pos.x, pos.y - 40, '#c0c0c0');
      sfx.miss();
      step.state = 'anim';
      step.missed = true;
    }
    return false;
  }

  step.anim += dt;
  return step.anim >= (step.missed ? 0.7 : 1.2);
}

function updateDrFight(battle, step, dt) {
  if (!step.lanes) {
    step.lanes = step.fighters.map((member, i) => ({
      member,
      x: DR_TARGET_X + 150 + i * 60 + Math.random() * 30,
      resolved: false,
      accuracy: 0,
      perfect: false,
      missed: false,
      flash: 0
    }));
    step.state = 'aim';
    step.anim = 0;
    step.applied = 0;
  }

  if (step.state === 'aim') {
    for (const lane of step.lanes) {
      if (lane.resolved) continue;
      lane.x -= DR_CURSOR_SPEED * dt;
      if (lane.x < DR_TARGET_X - 30) {
        lane.resolved = true;
        lane.missed = true;
      }
    }
    if (confirmPressed()) {
      const candidates = step.lanes.filter(l => !l.resolved && l.x < DR_TARGET_X + DR_RANGE);
      candidates.sort((a, b) => a.x - b.x);
      const lane = candidates[0];
      if (lane) {
        const dist = Math.abs(lane.x - DR_TARGET_X);
        lane.resolved = true;
        lane.accuracy = Math.max(0, 1 - dist / DR_RANGE);
        lane.perfect = dist < 6;
        lane.flash = 0.3;
        sfx.slash();
      }
    }
    if (step.lanes.every(l => l.resolved)) step.state = 'anim';
    for (const lane of step.lanes) lane.flash = Math.max(0, lane.flash - dt);
    return false;
  }

  // apply the hits one after another
  step.anim += dt;
  while (step.applied < step.lanes.length && step.anim >= step.applied * 0.18) {
    const lane = step.lanes[step.applied];
    step.applied += 1;
    if (lane.missed) {
      const pos = enemyPosition(battle);
      addPopup('MISS', pos.x - 20 + step.applied * 12, pos.y - 30 - step.applied * 16, '#c0c0c0', 20);
      continue;
    }
    lane.member.pose = 'attack';
    lane.member.poseTime = 0.4;
    attackEnemy(battle, drFightDamage(battle, lane.member, lane.accuracy, lane.perfect), { member: lane.member, crit: lane.perfect });
    if (battle.outcome) return true;
  }
  return step.applied >= step.lanes.length && step.anim >= step.lanes.length * 0.18 + 0.9;
}

// -------------- Drawing --------------
function drawUtFightBar(step) {
  const box = UT.textBox;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const width = box.w - 40;

  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(4, width / 2 - i * 52), Math.max(4, 54 - i * 11), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#3bd16f';
  ctx.fillRect(cx - 3, cy - 52, 6, 104);

  const pos = Math.min(step.pos || 0, 1);
  const x = box.x + 20 + pos * width;
  const blink = step.state === 'anim' && Math.floor(step.anim * 14) % 2 === 0;
  ctx.fillStyle = blink ? '#000' : '#fff';
  ctx.fillRect(x - 5, cy - 60, 10, 120);
  ctx.strokeStyle = blink ? '#fff' : '#000';
  ctx.strokeRect(x - 5, cy - 60, 10, 120);
  ctx.restore();
}

function drawDrFightBars(battle, step) {
  if (!step.lanes) return;
  const box = DR.textBox;
  ctx.save();
  step.lanes.forEach((lane, i) => {
    const y = box.y + 14 + i * 32;
    const color = lane.member.color || '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(24, y, box.w - 48, 26);
    ctx.fillStyle = color;
    ctx.font = SMALL_FONT;
    ctx.fillText(lane.member.name.slice(0, 1), 32, y + 19);
    // target box
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(DR_TARGET_X - 8, y + 2, 16, 22);
    if (!lane.resolved || lane.flash > 0) {
      ctx.fillStyle = lane.perfect ? '#ffff40' : '#fff';
      ctx.globalAlpha = lane.resolved ? lane.flash / 0.3 : 1;
      ctx.fillRect(lane.x - 4, y + 2, 8, 22);
      ctx.globalAlpha = 1;
    }
  });
  ctx.restore();
}
