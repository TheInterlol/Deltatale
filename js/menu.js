// Boss select screen: two tabs (UNDERTALE / DELTARUNE), bosses grouped by area or chapter.
// ↑ ↓ choose, ← → switch game, Z / Enter fights. Unfinished bosses are listed as "coming soon".

const MENU_LIST = { x: 28, y: 92, w: 350, rowH: 19, rows: 15 };
const MENU_INFO = { x: 400, y: 80, w: 292 };

const menu = { tab: 0, cursor: [0, 0], scroll: [0, 0] };

// Rows of one tab: group headers and bosses.
function menuRows(tab) {
  const section = ROSTER[tab];
  const rows = [];
  for (const group of section.groups) {
    rows.push({ header: group.name });
    for (const boss of group.bosses) rows.push({ entry: { ...boss, game: section.game, group: group.name } });
  }
  return rows;
}

function menuBossRows(tab) {
  return menuRows(tab).map((row, i) => ({ row, i })).filter(r => r.row.entry);
}

function selectedMenuEntry() {
  const bosses = menuBossRows(menu.tab);
  const pick = bosses[Math.min(menu.cursor[menu.tab], bosses.length - 1)];
  return pick ? pick.row.entry : null;
}

function focusBossInMenu(id) {
  ROSTER.forEach((section, tab) => {
    const index = menuBossRows(tab).findIndex(r => r.row.entry.id === id);
    if (index >= 0) {
      menu.tab = tab;
      menu.cursor[tab] = index;
    }
  });
  keepMenuCursorVisible();
}

function nextPlayableBoss(id) {
  const all = rosterEntries();
  const start = all.findIndex(e => e.id === id);
  for (let i = 1; i <= all.length; i++) {
    const entry = all[(start + i) % all.length];
    if (isPlayable(entry.id)) return entry.id;
  }
  return id;
}

function keepMenuCursorVisible() {
  const tab = menu.tab;
  const bosses = menuBossRows(tab);
  const current = bosses[menu.cursor[tab]];
  if (!current) return;
  // keep the group header of the first visible boss in view too
  const rowIndex = current.i;
  if (rowIndex - 1 < menu.scroll[tab]) menu.scroll[tab] = Math.max(0, rowIndex - 1);
  if (rowIndex >= menu.scroll[tab] + MENU_LIST.rows) menu.scroll[tab] = rowIndex - MENU_LIST.rows + 1;
}

function updateBossSelect() {
  const { dx, dy } = directionPressed();
  if (dx) {
    menu.tab = (menu.tab + dx + ROSTER.length) % ROSTER.length;
    sfx.move();
    previewMenuBoss();
  }
  if (dy) {
    const count = menuBossRows(menu.tab).length;
    menu.cursor[menu.tab] = (menu.cursor[menu.tab] + dy + count) % count;
    sfx.move();
    keepMenuCursorVisible();
    previewMenuBoss();
  }

  if (confirmPressed()) {
    const entry = selectedMenuEntry();
    if (entry && isPlayable(entry.id)) {
      sfx.select();
      bossSelect.value = entry.id;
      startGame();
    } else {
      sfx.cancel();
      statusText.textContent = `${entry ? entry.name : 'This boss'} is not in the boss rush yet.`;
    }
  }
}

// Keep the HTML <select> in sync with the cursor, so Start/Restart fight the shown boss.
function previewMenuBoss() {
  const entry = selectedMenuEntry();
  if (entry && isPlayable(entry.id) && bossSelect.value !== entry.id) {
    bossSelect.value = entry.id;
    settings.boss = entry.id;
    saveSettings();
  }
}

function drawBossSelect() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `bold 26px ${FONT_FAMILY}`;
  ctx.fillText('DELTATALE', canvas.width / 2, 36);
  ctx.font = TINY_FONT;
  ctx.fillStyle = '#9c9c9c';
  const total = rosterEntries();
  const playable = total.filter(e => isPlayable(e.id)).length;
  ctx.fillText(`BOSS RUSH · ${playable} / ${total.length} bosses playable`, canvas.width / 2, 54);

  // tabs
  ROSTER.forEach((section, tab) => {
    const x = 28 + tab * 176;
    const active = tab === menu.tab;
    ctx.fillStyle = active ? '#fff' : '#555';
    ctx.font = SMALL_FONT;
    ctx.textAlign = 'left';
    ctx.fillText(section.title, x, 78);
    if (active) ctx.fillRect(x, 82, ctx.measureText(section.title).width, 2);
  });
  ctx.restore();

  drawMenuList();
  drawMenuInfo();
}

function drawMenuList() {
  const tab = menu.tab;
  const rows = menuRows(tab);
  const selected = menuBossRows(tab)[menu.cursor[tab]];
  const first = menu.scroll[tab];
  const L = MENU_LIST;

  ctx.save();
  for (let r = 0; r < L.rows && first + r < rows.length; r++) {
    const row = rows[first + r];
    const y = L.y + r * L.rowH + 14;
    if (row.header) {
      ctx.font = TINY_FONT;
      ctx.fillStyle = '#ff8c1a';
      ctx.fillText(row.header.toUpperCase(), L.x, y);
      continue;
    }
    const entry = row.entry;
    const playable = isPlayable(entry.id);
    const isSel = selected && selected.i === first + r;
    const record = getBossRecord(entry.id);

    if (isSel) drawSoulShape(L.x + 22, y - 5, 13, SOUL_COLORS.red);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = !playable ? '#4d4d4d' : isSel ? '#ffe14d' : '#fff';
    ctx.fillText(entry.name, L.x + 36, y);

    ctx.textAlign = 'right';
    ctx.font = TINY_FONT;
    if (!playable) {
      ctx.fillStyle = '#4d4d4d';
      ctx.fillText('coming soon', L.x + L.w, y);
    } else if (record.defeated || record.spared) {
      ctx.fillStyle = '#7dff7d';
      ctx.fillText(record.spared ? '♥ cleared' : '★ cleared', L.x + L.w, y);
    }
    ctx.textAlign = 'left';
  }

  // scroll hints
  ctx.fillStyle = '#777';
  ctx.font = TINY_FONT;
  if (first > 0) ctx.fillText('▲', L.x + L.w - 8, L.y + 2);
  if (first + L.rows < rows.length) ctx.fillText('▼', L.x + L.w - 8, L.y + L.rows * L.rowH + 14);
  ctx.restore();
}

function drawMenuInfo() {
  const entry = selectedMenuEntry();
  if (!entry) return;
  const I = MENU_INFO;
  const boss = getBoss(entry.id);
  const cx = I.x + I.w / 2;

  ctx.save();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(I.x, I.y, I.w, 300);

  if (boss) {
    drawBossFigure(boss, cx, I.y + 82, state.clock);
  } else {
    drawBossPlaceholder({ name: entry.name, color: '#555', emblem: 'star' }, cx, I.y + 82, 0);
  }

  ctx.textAlign = 'center';
  ctx.font = `bold 18px ${FONT_FAMILY}`;
  ctx.fillStyle = boss ? '#fff' : '#777';
  ctx.fillText(entry.name, cx, I.y + 176);
  ctx.font = TINY_FONT;
  ctx.fillStyle = '#ff8c1a';
  ctx.fillText(`${entry.game === 'undertale' ? 'UNDERTALE' : 'DELTARUNE'} · ${entry.group}`, cx, I.y + 194);

  ctx.fillStyle = '#bbb';
  const lines = wrapText(entry.note || '', I.w - 24, TINY_FONT);
  lines.slice(0, 3).forEach((line, i) => ctx.fillText(line, cx, I.y + 216 + i * 15));

  ctx.font = SMALL_FONT;
  if (boss) {
    const record = getBossRecord(entry.id);
    ctx.fillStyle = '#7dff7d';
    const best = record.bestTurns ? ` · best ${plural(record.bestTurns, 'turn')}` : '';
    ctx.fillText(`Won ${record.defeated + record.spared}×${best}`, cx, I.y + 270);
    ctx.fillStyle = '#ffe14d';
    ctx.fillText('Z / Enter: FIGHT', cx, I.y + 290);
  } else {
    ctx.fillStyle = '#777';
    ctx.fillText('Coming soon', cx, I.y + 285);
  }

  ctx.textAlign = 'left';
  ctx.font = TINY_FONT;
  ctx.fillStyle = '#777';
  ctx.fillText(`← → game · ↑ ↓ boss · mode: ${state.gameMode === 'battle' ? 'Battle' : 'Survival'} (change below)`, 28, 398);
  ctx.restore();
}
