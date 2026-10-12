// Title screen, settings and the pause menu - all drawn on the canvas, so the page is just the game.

const TITLE_OPTIONS = [
  { id: 'battle', label: 'BOSS RUSH', hint: 'Pick a boss and fight it - retry as often as you like.' },
  { id: 'survival', label: 'SURVIVAL', hint: 'Dodge a boss\' attacks back to back for as long as you can.' },
  { id: 'settings', label: 'SETTINGS', hint: 'Volume, screen shake, fullscreen.' }
];

const PAUSE_OPTIONS = [
  { id: 'resume', label: 'Resume' },
  { id: 'retry', label: 'Retry' },
  { id: 'settings', label: 'Settings' },
  { id: 'select', label: 'Boss select' },
  { id: 'title', label: 'Title screen' }
];

const screens = {
  titleCursor: 0,
  settingsCursor: 0,
  pauseCursor: 0,
  settingsReturn: 'title',   // where BACK leads from the settings
  stars: null
};

// ---------------- title ----------------
function openTitle() {
  if (state.screen === 'fight') resetGame();
  state.screen = 'title';
  state.paused = false;
  screens.titleCursor = Math.max(0, TITLE_OPTIONS.findIndex(o => o.id === selection.mode));
  setHint('Title screen');
  playMenuMusic();
}

function updateTitle() {
  const { dy } = directionPressed();
  if (dy) {
    screens.titleCursor = (screens.titleCursor + dy + TITLE_OPTIONS.length) % TITLE_OPTIONS.length;
    sfx.move();
  }
  if (confirmPressed()) {
    const option = TITLE_OPTIONS[screens.titleCursor];
    sfx.select();
    if (option.id === 'settings') {
      openSettings('title');
    } else {
      selection.mode = option.id;
      settings.gameMode = option.id;
      saveSettings();
      openBossSelect(selection.boss);
    }
  }
}

function titleStars() {
  if (!screens.stars) {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    screens.stars = Array.from({ length: 70 }, () => ({
      x: rnd() * VIEW_W, y: rnd() * VIEW_H, s: 0.5 + rnd() * 1.6, v: 4 + rnd() * 14, p: rnd() * 6
    }));
  }
  return screens.stars;
}

function drawStarfield(alpha = 1) {
  const t = state.clock;
  for (const star of titleStars()) {
    const y = (star.y + t * star.v) % VIEW_H;
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + star.p));
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * tw * alpha})`;
    ctx.fillRect(Math.round(star.x), Math.round(y), star.s, star.s);
  }
}

function drawTitle() {
  const t = state.clock;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawStarfield();

  // the logo: two colours for the two games, with a slow shimmer
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `bold 64px ${TITLE_FAMILY}`;
  const grad = ctx.createLinearGradient(160, 0, 560, 0);
  const shift = (Math.sin(t * 0.6) + 1) / 2;
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(Math.min(0.95, 0.35 + shift * 0.3), '#ffe14d');
  grad.addColorStop(1, '#7fd4ff');
  ctx.fillStyle = '#2a1840';
  ctx.fillText('DELTATALE', VIEW_W / 2 + 4, 112 + 4);
  ctx.fillStyle = grad;
  ctx.fillText('DELTATALE', VIEW_W / 2, 112);

  ctx.font = `15px ${FONT_FAMILY}`;
  ctx.fillStyle = '#b9b9c9';
  ctx.fillText('an Undertale / Deltarune boss rush', VIEW_W / 2, 142);

  // the SOUL floats above the menu
  const soulY = 178 + Math.sin(t * 2.2) * 4;
  drawSoulShape(VIEW_W / 2, soulY, 22, SOUL_COLORS.red);

  TITLE_OPTIONS.forEach((option, i) => {
    const y = 236 + i * 34;
    const active = i === screens.titleCursor;
    ctx.font = `bold 26px ${TITLE_FAMILY}`;
    ctx.fillStyle = active ? '#ffe14d' : '#ffffff';
    ctx.fillText(option.label, VIEW_W / 2, y);
    if (active) {
      const w = ctx.measureText(option.label).width;
      drawSoulShape(VIEW_W / 2 - w / 2 - 22, y - 9, 13, SOUL_COLORS.red);
    }
  });

  ctx.font = `13px ${FONT_FAMILY}`;
  ctx.fillStyle = '#9c9cae';
  ctx.fillText(TITLE_OPTIONS[screens.titleCursor].hint, VIEW_W / 2, 346);

  ctx.font = TINY_FONT;
  ctx.fillStyle = '#5f5f6e';
  ctx.fillText('Z select · X back · arrows move · M mute · F fullscreen', VIEW_W / 2, 374);
  ctx.fillText('Unofficial fan project - not affiliated with Toby Fox.', VIEW_W / 2, 392);
  ctx.restore();
}

// ---------------- settings ----------------
function settingsItems() {
  return [
    { id: 'music', label: 'Music volume', value: `${settings.musicVolume} / 10`, bar: settings.musicVolume / 10 },
    { id: 'sfx', label: 'Sound effects', value: `${settings.sfxVolume} / 10`, bar: settings.sfxVolume / 10 },
    { id: 'mute', label: 'Sound', value: settings.muted ? 'OFF' : 'ON' },
    { id: 'shake', label: 'Screen shake', value: settings.shake ? 'ON' : 'OFF' },
    { id: 'fullscreen', label: 'Fullscreen', value: document.fullscreenElement ? 'ON' : 'OFF' },
    { id: 'back', label: 'Back' }
  ];
}

function openSettings(returnTo) {
  screens.settingsReturn = returnTo;
  screens.settingsCursor = 0;
  state.screen = 'settings';
  setHint('Settings');
}

function closeSettings() {
  sfx.cancel();
  if (screens.settingsReturn === 'pause') {
    state.screen = 'fight';
    return;
  }
  state.screen = 'title';
}

function changeSetting(id, delta) {
  if (id === 'music') settings.musicVolume = Math.max(0, Math.min(10, settings.musicVolume + delta));
  if (id === 'sfx') settings.sfxVolume = Math.max(0, Math.min(10, settings.sfxVolume + delta));
  if (id === 'mute') toggleMute();
  if (id === 'shake') settings.shake = !settings.shake;
  if (id === 'fullscreen') toggleFullscreen();
  saveSettings();
  applyMusicVolume();
}

function updateSettings() {
  const items = settingsItems();
  const { dx, dy } = directionPressed();
  if (dy) {
    screens.settingsCursor = (screens.settingsCursor + dy + items.length) % items.length;
    sfx.move();
  }
  const item = items[screens.settingsCursor];
  if (dx && item.id !== 'back') {
    changeSetting(item.id, dx);
    sfx.move();
  }
  if (confirmPressed()) {
    if (item.id === 'back') closeSettings();
    else {
      changeSetting(item.id, item.bar !== undefined ? (item.bar >= 1 ? -10 : 1) : 1);
      sfx.select();
    }
  }
  if (cancelPressed()) closeSettings();
}

function drawSettings() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawStarfield(0.5);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `bold 36px ${TITLE_FAMILY}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('SETTINGS', VIEW_W / 2, 70);

  const items = settingsItems();
  items.forEach((item, i) => {
    const y = 124 + i * 36;
    const active = i === screens.settingsCursor;
    ctx.textAlign = 'left';
    ctx.font = `18px ${FONT_FAMILY}`;
    ctx.fillStyle = active ? '#ffe14d' : '#fff';
    ctx.fillText(item.label, 200, y);
    if (active) drawSoulShape(178, y - 6, 12, SOUL_COLORS.red);
    if (item.value) {
      ctx.textAlign = 'right';
      ctx.fillText(item.value, 520, y);
    }
    if (item.bar !== undefined) {
      ctx.fillStyle = '#333';
      ctx.fillRect(330, y - 11, 110, 10);
      ctx.fillStyle = active ? '#ffe14d' : '#ff8c1a';
      ctx.fillRect(330, y - 11, 110 * item.bar, 10);
    }
  });

  ctx.textAlign = 'center';
  ctx.font = TINY_FONT;
  ctx.fillStyle = '#777';
  ctx.fillText('← → change · Z toggle · X back', VIEW_W / 2, 372);
  ctx.restore();
}

// ---------------- pause ----------------
function updatePauseMenu() {
  const { dy } = directionPressed();
  if (dy) {
    screens.pauseCursor = (screens.pauseCursor + dy + PAUSE_OPTIONS.length) % PAUSE_OPTIONS.length;
    sfx.move();
  }
  if (cancelPressed()) {
    togglePause();
    return;
  }
  if (!confirmPressed()) return;
  const option = PAUSE_OPTIONS[screens.pauseCursor];
  sfx.select();
  if (option.id === 'resume') togglePause();
  if (option.id === 'retry') startGame();
  if (option.id === 'settings') openSettings('pause');
  if (option.id === 'select') openBossSelect();
  if (option.id === 'title') openTitle();
}

function drawPauseMenu() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `bold 40px ${TITLE_FAMILY}`;
  ctx.fillText('PAUSED', VIEW_W / 2, 110);
  ctx.font = `13px ${FONT_FAMILY}`;
  ctx.fillStyle = '#9c9c9c';
  ctx.fillText(state.currentBoss ? state.currentBoss.name : '', VIEW_W / 2, 134);

  PAUSE_OPTIONS.forEach((option, i) => {
    const y = 180 + i * 32;
    const active = i === screens.pauseCursor;
    ctx.font = `20px ${FONT_FAMILY}`;
    ctx.fillStyle = active ? '#ffe14d' : '#fff';
    ctx.fillText(option.label, VIEW_W / 2, y);
    if (active) {
      const w = ctx.measureText(option.label).width;
      drawSoulShape(VIEW_W / 2 - w / 2 - 20, y - 7, 12, SOUL_COLORS.red);
    }
  });
  ctx.font = TINY_FONT;
  ctx.fillStyle = '#777';
  ctx.fillText('Esc / P / X = resume', VIEW_W / 2, 360);
  ctx.restore();
}

// ---------------- fullscreen ----------------
function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  } catch (e) {
    // fullscreen is not available (e.g. inside an iframe)
  }
}
