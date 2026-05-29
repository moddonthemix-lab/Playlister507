const fs   = require('fs');
const path = require('path');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const useSupabase = () => !!(SUPABASE_URL && SUPABASE_KEY);

// ── Supabase helpers ──────────────────────────────────────────────────
function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

async function sbGet(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${filter || ''}`;
  const r = await axios.get(url, { headers: { ...sbHeaders(), Prefer: undefined } });
  return r.data;
}

async function sbUpsert(table, row) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  await axios.post(url, row, {
    headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
  });
}

async function sbInsert(table, row) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  await axios.post(url, row, { headers: sbHeaders() });
}

// ── In-memory cache (hydrated from Supabase on startup) ───────────────
let cache = {};

async function hydrate() {
  if (!useSupabase()) {
    cache = loadFile();
    return;
  }
  try {
    const rows = await sbGet('playlist_store', '?select=key,value');
    cache = {};
    rows.forEach(r => { cache[r.key] = r.value; });
    console.log(`[store] Hydrated from Supabase (${rows.length} keys)`);
  } catch (e) {
    console.warn('[store] Supabase hydration failed, falling back to file:', e.message);
    cache = loadFile();
  }
}

// ── File fallback ─────────────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, '..', 'data', 'playlists.json');

function loadFile() {
  try {
    if (!fs.existsSync(DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch { return {}; }
}

function saveFile(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// ── Public API (sync reads from cache, async writes) ──────────────────
function getPlaylist(key) {
  return cache[key] || null;
}

function setPlaylist(key, value) {
  cache[key] = value;
  if (useSupabase()) {
    sbUpsert('playlist_store', { key, value, updated_at: new Date().toISOString() })
      .catch(e => console.error('[store] setPlaylist write failed:', e.message));
  } else {
    saveFile(cache);
  }
}

function getLastRun() {
  return cache.__lastRun || null;
}

function setLastRun(date) {
  cache.__lastRun = date;
  if (useSupabase()) {
    sbUpsert('playlist_store', { key: '__lastRun', value: date, updated_at: new Date().toISOString() })
      .catch(e => console.error('[store] setLastRun write failed:', e.message));
  } else {
    saveFile(cache);
  }
}

function isUpdateDue() {
  const lastRun = getLastRun();
  if (!lastRun) return true;
  const diffDays = (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 14;
}

module.exports = { hydrate, getPlaylist, setPlaylist, getLastRun, setLastRun, isUpdateDue, sbGet, sbInsert, useSupabase };
