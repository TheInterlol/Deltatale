// Safe localStorage access. In private windows or with storage disabled localStorage throws;
// the game must keep running, just without saving.
function storageGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // storage unavailable - keep playing without saving
  }
}

function loadJson(key, fallback) {
  const raw = storageGet(key);
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJson(key, value) {
  storageSet(key, JSON.stringify(value));
}

// -------------- Per-boss records --------------
const RECORDS_KEY = 'deltatale_rush_records';

function getBossRecord(bossId) {
  const r = loadJson(RECORDS_KEY, {})[bossId] || {};
  return {
    wins: Number(r.wins) || 0,
    spared: Number(r.spared) || 0,
    killed: Number(r.killed) || 0,
    deaths: Number(r.deaths) || 0,
    bestTime: Number(r.bestTime) || 0
  };
}

function updateBossRecord(bossId, change) {
  const records = loadJson(RECORDS_KEY, {});
  const record = getBossRecord(bossId);
  change(record);
  records[bossId] = record;
  saveJson(RECORDS_KEY, records);
  return record;
}

function recordWin(bossId, outcome, seconds) {
  return updateBossRecord(bossId, r => {
    r.wins += 1;
    if (outcome === 'spared' || outcome === 'pacified') r.spared += 1;
    if (outcome === 'killed') r.killed += 1;
    if (!r.bestTime || seconds < r.bestTime) r.bestTime = seconds;
  });
}

function recordDeath(bossId) {
  return updateBossRecord(bossId, r => { r.deaths += 1; });
}

// -------------- Settings --------------
const SETTINGS_KEY = 'deltatale_settings';
const settings = Object.assign({ muted: false, lastBoss: 'toriel' }, loadJson(SETTINGS_KEY, {}));

function saveSettings() {
  saveJson(SETTINGS_KEY, settings);
}
