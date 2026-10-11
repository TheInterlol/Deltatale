// Boss select: UNDERTALE / DELTARUNE tabs, bosses grouped by area or chapter.
// Left/Right switches game, Up/Down picks a boss, Z starts the fight. Mouse/touch works too.
const SELECT_ROWS = 15;
const SELECT_LIST = { x: 28, y: 112, w: 300, rowH: 22 };

const selectState = { tab: 0, index: [0, 0], scroll: [0, 0] };

const SOUL_LABELS = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow', purple: 'Purple' };

// Visible rows for a tab: section headers + boss entries.
function selectRows(tab) {
  const rows = [];
  for (const section of ROSTER[tab].sections) {
    rows.push({ header: section.name });
    for (const entry of section.bosses) rows.push({ entry: { ...entry, game: ROSTER[tab].game, section: section.name } });
  }
  return rows;
}

function selectEntries(tab) {
  return selectRows(tab).filter(r => r.entry).map(r => r.entry);
}

function openBossSelect(bossId = settings.lastBoss) {
  stopMusic();
  state.scene = 'select';
  state.battle = null;
  state.paused = false;
  state.bullets = [];
  state.shots = [];
  soul.visible = false;
  resetEffects();
  focusBossInSelect(bossId);
  setStatus('Boss select: ←/→ switch game, ↑/↓ choose, Z to fight. Click a boss to pick it.');
}

function focusBossInSelect(bossId) {
  ROSTER.forEach((game, tab) => {
    const i = selectEntries(tab).findIndex(e => e.id === bossId);
    if (i >= 0) {
      selectState.tab = tab;
      selectState.index[tab] = i;
    }
  });
  keepSelectionVisible();
}

function selectedEntry() {
  const entries = selectEntries(selectState.tab);
  return entries[selectState.index[selectState.tab]];
}

function keepSelectionVisible() {
  const tab = selectState.tab;
  const rows = selectRows(tab);
  const entry = selectedEntry();
  const rowIndex = rows.findIndex(r => r.entry && r.entry.id === entry.id);
  // keep the section header visible above the first boss of a section
  const top = Math.max(0, rows[rowIndex - 1] && rows[rowIndex - 1].header ? rowIndex - 1 : rowIndex);
  if (top < selectState.scroll[tab]) selectState.scroll[tab] = top;
  if (rowIndex >= selectState.scroll[tab] + SELECT_ROWS) selectState.scroll[tab] = rowIndex - SELECT_ROWS + 1;
}

function tryStartSelected() {
  const entry = selectedEntry();
  if (entry && BOSSES[entry.id]) {
    sfx.select();
    startBossFight(entry.id);
  } else {
    sfx.cancel();
    setStatus(`${entry.name} is on the roster but not implemented yet.`);
  }
}

function updateSelect() {
  const tab = selectState.tab;
  const entries = selectEntries(tab);
  const { dx, dy } = directionPressed();

  if (dx) {
    selectState.tab = (tab + dx + ROSTER.length) % ROSTER.length;
    sfx.move();
    keepSelectionVisible();
    return;
  }
  if (dy) {
    selectState.index[tab] = (selectState.index[tab] + dy + entries.length) % entries.length;
    sfx.move();
    keepSelectionVisible();
  }
  if (confirmPressed()) tryStartSelected();

  const click = consumeClick();
  if (click) handleSelectClick(click);
}

function handleSelectClick(click) {
  // tabs
  if (click.y >= 70 && click.y <= 100) {
    const tab = click.x < W / 2 ? 0 : 1;
    if (tab !== selectState.tab) {
      selectState.tab = tab;
      sfx.move();
    }
    return;
  }
  // list rows
  if (click.x >= SELECT_LIST.x && click.x <= SELECT_LIST.x + SELECT_LIST.w && click.y >= SELECT_LIST.y - 16) {
    const tab = selectState.tab;
    const rows = selectRows(tab);
    const row = rows[selectState.scroll[tab] + Math.floor((click.y - SELECT_LIST.y + 16) / SELECT_LIST.rowH)];
    if (!row || !row.entry) return;
    const index = selectEntries(tab).findIndex(e => e.id === row.entry.id);
    if (index === selectState.index[tab]) tryStartSelected();
    else {
      selectState.index[tab] = index;
      sfx.move();
    }
    return;
  }
  // "FIGHT" button on the info panel
  if (click.x >= 360 && click.y >= 400) tryStartSelected();
}

function drawSelect() {
  const t = state.clock;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = font(34);
  ctx.fillText('DELTATALE', W / 2, 40);
  ctx.font = font(13);
  ctx.fillStyle = '#9c9c9c';
  ctx.fillText('an Undertale & Deltarune boss rush (fan game)', W / 2, 60);

  ROSTER.forEach((game, i) => {
    const x = i === 0 ? W / 4 : (W * 3) / 4;
    const active = i === selectState.tab;
    ctx.font = font(20);
    ctx.fillStyle = active ? '#ffff00' : '#707070';
    ctx.fillText(game.title, x, 90);
    if (active) ctx.fillRect(x - 70, 96, 140, 2);
  });
  ctx.restore();

  drawSelectList();
  drawSelectInfo(t);

  ctx.save();
  ctx.font = font(12);
  ctx.fillStyle = '#707070';
  ctx.textAlign = 'center';
  ctx.fillText('←/→ game   ↑/↓ boss   Z fight   M sound   (in battle: Esc pause)', W / 2, H - 10);
  ctx.restore();
}

function drawSelectList() {
  const tab = selectState.tab;
  const rows = selectRows(tab);
  const entry = selectedEntry();
  const start = selectState.scroll[tab];

  ctx.save();
  for (let i = 0; i < SELECT_ROWS && start + i < rows.length; i++) {
    const row = rows[start + i];
    const y = SELECT_LIST.y + i * SELECT_LIST.rowH;
    if (row.header) {
      ctx.font = font(13);
      ctx.fillStyle = '#ff9f30';
      ctx.fillText(row.header.toUpperCase(), SELECT_LIST.x, y);
      continue;
    }
    const e = row.entry;
    const implemented = Boolean(BOSSES[e.id]);
    const selected = e.id === entry.id;
    const record = implemented ? getBossRecord(e.id) : null;
    ctx.font = font(17);
    ctx.fillStyle = selected ? '#ffff00' : implemented ? '#fff' : '#555';
    ctx.fillText(e.name, SELECT_LIST.x + 24, y);
    if (selected) drawHeart(SELECT_LIST.x + 10, y - 6, 13, '#ff0000');
    if (record && record.wins) {
      ctx.fillStyle = '#40ff40';
      ctx.font = font(13);
      ctx.fillText('✓', SELECT_LIST.x + SELECT_LIST.w - 10, y);
    }
  }
  if (start > 0) {
    ctx.fillStyle = '#9c9c9c';
    ctx.fillText('▲', SELECT_LIST.x + SELECT_LIST.w - 30, SELECT_LIST.y - 14);
  }
  if (start + SELECT_ROWS < rows.length) {
    ctx.fillStyle = '#9c9c9c';
    ctx.fillText('▼', SELECT_LIST.x + SELECT_LIST.w - 30, SELECT_LIST.y + SELECT_ROWS * SELECT_LIST.rowH - 8);
  }
  ctx.restore();
}

function drawSelectInfo(t) {
  const entry = selectedEntry();
  const boss = BOSSES[entry.id];
  const x = 352;
  const panel = { x: 340, y: 132, w: 280, h: 300 };

  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(panel.x, panel.y - 20, panel.w, panel.h + 14);

  // small preview of the boss art
  if (boss && boss.draw) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x + 3, panel.y - 17, panel.w - 6, 110);
    ctx.clip();
    ctx.translate(panel.x + panel.w / 2, panel.y + 44);
    ctx.scale(0.5, 0.5);
    boss.draw(0, 0, t, null);
    ctx.restore();
  } else {
    ctx.font = font(48);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('?', panel.x + panel.w / 2, panel.y + 60);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = '#ffff00';
  ctx.font = font(22);
  ctx.fillText(entry.name, x, panel.y + 116);
  ctx.font = font(13);
  ctx.fillStyle = '#9c9c9c';
  ctx.fillText(`${entry.kind} · ${entry.section}`, x, panel.y + 134);

  if (!boss) {
    ctx.fillStyle = '#808080';
    ctx.font = font(15);
    ctx.fillText('Not implemented yet.', x, panel.y + 170);
    ctx.restore();
    return;
  }

  const souls = boss.souls || ['red'];
  ctx.font = font(13);
  ctx.fillStyle = '#fff';
  ctx.fillText('SOUL:', x, panel.y + 156);
  souls.forEach((mode, i) => drawHeart(x + 60 + i * 22, panel.y + 151, 13, SOUL_COLORS[mode]));
  ctx.fillText(souls.map(s => SOUL_LABELS[s]).join(', '), x + 60 + souls.length * 22, panel.y + 156);

  const lines = wrapText(boss.description || '', panel.w - 26, font(13));
  ctx.fillStyle = '#c8c8c8';
  ctx.font = font(13);
  lines.slice(0, 6).forEach((l, i) => ctx.fillText(l, x, panel.y + 178 + i * 17));

  const r = getBossRecord(boss.id);
  ctx.fillStyle = '#fff';
  ctx.fillText(`Wins ${r.wins}  Deaths ${r.deaths}  Best ${r.bestTime ? formatTime(r.bestTime) : '--'}`, x, panel.y + 276);

  ctx.font = font(20);
  ctx.fillStyle = '#ffff00';
  ctx.fillText('Z: FIGHT', x + 150, panel.y + 302);
  ctx.restore();
}
