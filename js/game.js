function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min((ts - state.lastTime) / 1000, 0.033);
  state.lastTime = ts;

    updateGersonAnimation(dt);

  if (state.running) {
    state.timer += dt;
    updatePlayer(dt);

    if(state.currentBoss){
    state.currentBoss.update(dt);
    }

    handlePatterns(dt);
    updateBullets(dt);
    updateUi();
  }
  

  drawArena();
  drawCharacters();
  drawBullets();
  drawPlayer();
  drawHud();

  requestAnimationFrame(frame);
}

bossSelect.addEventListener('change', resetGame);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(frame);