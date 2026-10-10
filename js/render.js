function drawArena() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(arena.x, arena.y, arena.w, arena.h);

  // rámeček až po výplni, jinak výplň překryje jeho vnitřní polovinu
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
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

// Každý druh střely se kreslí právě jednou a s vlastní barvou
// (dřív se "normal" kreslil barvou pozadí arény, takže byl neviditelný).
const BULLET_COLORS = {
  normal: '#ffffff',
  bone: '#f5f5f5',
  card: '#d96cff',
  blaster: '#5ed0ff'
};

function drawBullets() {
  for (const b of state.bullets) {
    ctx.save();
    ctx.fillStyle = BULLET_COLORS[b.kind] || BULLET_COLORS.normal;

    if (b.kind === 'axe01' && axe01Sprite.complete && axe01Sprite.naturalWidth > 0) {
      // sprite 47x55 -> vykreslit se zachovaným poměrem stran, otáčet kolem středu
      const h = 42;
      const w = h * axe01Sprite.naturalWidth / axe01Sprite.naturalHeight;
      ctx.translate(b.x, b.y);
      ctx.rotate(b.life * 5);
      ctx.drawImage(axe01Sprite, -w / 2, -h / 2, w, h);
    } else if (b.kind === 'bone') {
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
  // HUD je ve spodním pruhu pod arénou, aby nepřekrýval Susie
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial';
  ctx.fillText(`HP ${state.player.hp}/${state.player.maxHp}`, 26, 380);
  ctx.fillText(`TIME ${state.timer.toFixed(1)}s`, 200, 380);
  ctx.textAlign = 'right';
  ctx.fillText(`${bossSelect.options[bossSelect.selectedIndex].text}`, canvas.width - 26, 380);
  ctx.textAlign = 'left';

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

    // Susie v přirozeném poměru stran (73x139), dřív byla roztažená do šířky
    if(typeof susieSprite !== 'undefined' && susieSprite.complete && susieSprite.naturalWidth > 0){
        ctx.drawImage(susieSprite, 70, 8, susieSprite.naturalWidth, susieSprite.naturalHeight);
    }else {
        ctx.fillStyle = '#7a4fd1';
        ctx.fillRect(70, 8, 73, 139);
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

    const sx = anim.frame * anim.frameWidth;
    const sy = 0;
    const sw = anim.frameWidth;
    const sh = anim.frameHeight;

    // 2x zvětšení bez deformace (snímek je 81x63)
    const drawWidth = sw * 2;
    const drawHeight = sh * 2;

    const x = canvas.width / 2 - drawWidth /2 + 240;
    const y = 14;

    if(gersonSheet.complete && gersonSheet.naturalWidth >0){
        ctx.drawImage(gersonSheet, sx, sy, sw, sh, x, y, drawWidth, drawHeight);

    }else{
        ctx.fillStyle = '#3a7f5a';
        ctx.fillRect(x, y, drawWidth, drawHeight);
    }
}