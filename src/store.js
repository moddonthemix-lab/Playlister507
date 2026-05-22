const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'playlists.json');

function load() {
  try {
    if (!fs.existsSync(DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function getPlaylist(key) {
  return load()[key] || null;
}

function setPlaylist(key, value) {
  const data = load();
  data[key] = value;
  save(data);
}

function getLastRun() {
  return load().lastRun || null;
}

function setLastRun(date) {
  const data = load();
  data.lastRun = date;
  save(data);
}

function isUpdateDue() {
  const lastRun = getLastRun();
  if (!lastRun) return true;
  const diffDays = (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 14;
}

module.exports = { getPlaylist, setPlaylist, getLastRun, setLastRun, isUpdateDue };
