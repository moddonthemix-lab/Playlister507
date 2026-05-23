require('dotenv').config();
const express = require('express');
const path    = require('path');
const store   = require('./store');
const { startScheduler } = require('./scheduler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/playlists', (req, res) => {
  res.json({
    floridaWave: store.getPlaylist('floridaWave'),
    gaming:      store.getPlaylist('gaming'),
    underground: store.getPlaylist('underground'),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, lastRun: store.getLastRun() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Playlister507 → http://localhost:${PORT}`);
  startScheduler();
});

module.exports = app;

