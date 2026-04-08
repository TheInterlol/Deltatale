function drawArena() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);

  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(arena.x, arena.y, arena.w, arena.h);
}

function drawPlayer() {
  const p = state.player;

  ctx.save();

  if(soulRedSprite.complete && soulRedSprite.naturalWidth > 0){
    const size = 24;
    if(p.hurtCooldown > 0){
        ctx.globalAlpha = 0.65;
    }
    ctx.drawImage(soulRedSprite, p.x - size /2, p.y - size /2, size, size);
  } else{
    ctx.fillStyle = p.hurtCooldown > 0 ? '#ff9b9b' : '#ff3b3b';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBullets() {
  for (const b of state.bullets) {
    ctx.save();

    if (b.kind === 'bone') ctx.fillStyle = '#f5f5f5';
    else if (b.kind === 'card') ctx.fillStyle = '#d96cff';
    else if (b.kind === 'blaster') ctx.fillStyle = '#5ed0ff';
    else if (b.kind === 'axe01'){
        ctx.translate(b.x, b.y);
        ctx.rotate(b.life * 5);

        ctx.drawImage(axe01Sprite, -16, -16, 42, 42);
    }
    else{
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
    }

    if (b.kind === 'bone') {
      ctx.fillRect(b.x - 6, b.y - 18, 12, 36);
    } else if (b.kind === 'card') {
      ctx.translate(b.x, b.y);
      ctx.rotate(b.life * 6);
      ctx.fillRect(-6, -10, 12, 20);
    } else {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial';
  ctx.fillText(`HP ${state.player.hp}/${state.player.maxHp}`, 26, 34);
  ctx.fillText(`TIME ${state.timer.toFixed(1)}s`, 26, 60);
  ctx.fillText(`${bossSelect.options[bossSelect.selectedIndex].text}`, 26, 86);

  if (!state.running && !state.gameOver) {
    ctx.textAlign = 'center';
    ctx.font = '28px Arial';
    ctx.fillText('STISKNI START', canvas.width / 2, arena.y + arena.h / 2);
    ctx.textAlign = 'left';
  }

  if (state.gameOver) {
    ctx.textAlign = 'center';
    ctx.font = '28px Arial';
    ctx.fillText('GAME OVER', canvas.width / 2, arena.y + arena.h / 2);
    ctx.textAlign = 'left';
  }
}

function drawCharacters(){
    if (state.mode === 'gerson') drawGerson();

    if(typeof susieSprite !== 'undefined' && susieSprite.complete && susieSprite.naturalWidth > 0){
        ctx.drawImage(susieSprite, 70, 25, 100, 140);
    }else {
        ctx.fillStyle = '#7a4fd1';
        ctx.fillRect(70, 25, 140, 140);
    }
}

function updateGersonAnimation(dt){
    const anim = state.gersonAnim;

    anim.timer += dt;

    if(anim.timer >= anim.frameDuration){
        anim.timer = 0;
        anim.frame = (anim.frame + 1) % anim.frameCount;
    }
}

function drawGerson(){
    const anim =state.gersonAnim;

    const sx = anim.frame * anim.frameWidth;;
    const sy = 0;
    const sw = anim.frameWidth;
    const sh = anim.frameHeight;

    const drawWidth = 140;
    const drawHeight = 140;

    const x = canvas.width / 2 - drawWidth /2 + 250;
    const y = 10;

    if(gersonSheet.complete && gersonSheet.naturalWidth >0){
        ctx.drawImage(gersonSheet, sx, sy, sw, sh, x, y, drawWidth, drawHeight);

    }else{
        ctx.fillStyle = '#3a7f5a';
        ctx.fillRect(x, y, drawWidth, drawHeight);
    }
}