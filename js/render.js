// Pozadí s pomalu se posouvající mřížkou (jako bitvy v Deltarune).
function drawBackground() {
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);

  const size = 40;
  const offset = (state.clock * 12) % size;
  ctx.strokeStyle = 'rgba(110, 50, 160, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = offset - size; x < canvas.width + size; x += size) {
    ctx.moveTo(Math.round(x) + 0.5, -20);
    ctx.lineTo(Math.round(x) + 0.5, canvas.height + 20);
  }
  for (let y = offset - size; y < canvas.height + size; y += size) {
    ctx.moveTo(-20, Math.round(y) + 0.5);
    ctx.lineTo(canvas.width + 20, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

// Box se plynule animuje mezi arénou (útok) a širokým textovým boxem (menu).
function getBoxTarget() {
  if (state.battle) return getBattleBoxTarget(state.battle);
  return state.gameMode === 'battle' ? TEXT_BOX : arena;
}

function updateBox(dt) {
  const target = getBoxTarget();
  const k = Math.min(1, dt * 14);
  for (const prop of ['x', 'y', 'w', 'h']) {
    state.box[prop] += (target[prop] - state.box[prop]) * k;
    if (Math.abs(target[prop] - state.box[prop]) < 0.5) state.box[prop] = target[prop];
  }
}

function drawArena() {
  const box = state.box;

  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(box.x, box.y, box.w, box.h);

  // rámeček až po výplni, jinak výplň překryje jeho vnitřní polovinu
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
}

function isSoulVisible() {
  if (!state.battle) return state.gameMode === 'survival';
  return state.battle.phase === 'enemyTalk' || state.battle.phase === 'attack';
}

function drawPlayer() {
  const p = state.player;

  // po zásahu srdce bliká (nezranitelnost)
  if (p.hurtCooldown > 0 && Math.floor(p.hurtCooldown * 16) % 2 === 0) return;

  ctx.save();

  if(soulRedSprite.complete && soulRedSprite.naturalWidth > 0){
    const size = 24;
    ctx.drawImage(soulRedSprite, p.x - size /2, p.y - size /2, size, size);
  } else{
    ctx.fillStyle = '#ff3b3b';
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
      const hw = b.hw || 6;
      const hh = b.hh || 18;
      ctx.fillRect(b.x - hw, b.y - hh, hw * 2, hh * 2);
      // "kloubky" na koncích kosti
      for (const end of [-hh, hh]) {
        fillCircle(b.x - hw * 0.6, b.y + end, hw * 0.75);
        fillCircle(b.x + hw * 0.6, b.y + end, hw * 0.75);
      }
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

function drawCharacters(){
    const boss = state.currentBoss;
    const battle = state.battle;

    if (boss) {
        let x = BOSS_POS.x;
        ctx.save();
        if (battle) {
            ctx.globalAlpha = battle.bossAlpha;
            // po zásahu se boss zatřese
            if (battle.bossHurt > 0) x += Math.sin(battle.bossHurt * 60) * 12 * battle.bossHurt;
        }
        boss.draw(x, BOSS_POS.y, state.clock);
        ctx.restore();
    }

    // Susie v přirozeném poměru stran (73x139), dřív byla roztažená do šířky
    const susieX = SUSIE_POS.x + getSusieOffset();
    ctx.save();
    // při zásahu Susie bliká
    if (effects.susieHurt > 0 && Math.floor(effects.susieHurt * 20) % 2 === 0) ctx.globalAlpha = 0.45;
    if(typeof susieSprite !== 'undefined' && susieSprite.complete && susieSprite.naturalWidth > 0){
        ctx.drawImage(susieSprite, susieX, SUSIE_POS.y, susieSprite.naturalWidth, susieSprite.naturalHeight);
    }else {
        ctx.fillStyle = '#7a4fd1';
        ctx.fillRect(susieX, SUSIE_POS.y, 73, 139);
    }
    ctx.restore();
}

function drawHud() {
  drawPartyPanel();

  if (state.battle) drawBattleUi(state.battle);
  else if (state.gameMode === 'battle') drawCommandButtons(null);
  else drawSurvivalHud();
}

function render() {
  const shake = getShakeOffset();

  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawBackground();
  drawCharacters();
  drawArena();
  if (isSoulVisible()) {
    drawBullets();
    drawPlayer();
  }
  drawEffects();
  ctx.restore();

  drawHud();
  drawOverlays();
  drawFlash();
}
