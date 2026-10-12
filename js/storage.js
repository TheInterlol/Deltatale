// Safe localStorage access. In private windows or with storage disabled localStorage
// throws - the game must keep running, just without saving.
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
    // saving is not available, the game continues without it
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

// -------------- Survival: best time --------
// The key format is the original one, so already saved records are kept.
function getBestTime(bossId) {
  const value = Number(storageGet(`battle_best_${bossId}`, 0));
  return Number.isFinite(value) ? value : 0;
}

function saveBestTime(bossId, seconds) {
  storageSet(`battle_best_${bossId}`, String(seconds));
}

// -------------- Battle: results --------
const RECORDS_KEY = 'deltatale_records';

function getBossRecord(bossId) {
  const record = loadJson(RECORDS_KEY, {})[bossId] || {};
  return {
    defeated: Number(record.defeated) || 0,
    spared: Number(record.spared) || 0,
    bestTurns: Number(record.bestTurns) || 0
  };
}

function recordBattleResult(bossId, outcome, turns) {
  const records = loadJson(RECORDS_KEY, {});
  const record = getBossRecord(bossId);

  if (outcome === 'spared') record.spared += 1;
  else record.defeated += 1;
  if (!record.bestTurns || turns < record.bestTurns) record.bestTurns = turns;

  records[bossId] = record;
  saveJson(RECORDS_KEY, records);
  return record;
}

// -------------- Settings --------
const SETTINGS_KEY = 'deltatale_settings';
const settings = Object.assign(
  { muted: false, gameMode: 'battle', boss: 'toriel' },
  loadJson(SETTINGS_KEY, {})
);

function saveSettings() {
  saveJson(SETTINGS_KEY, settings);
}
