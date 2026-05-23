require('dotenv').config();
const express = require('express');
const path    = require('path');
const store   = require('./store');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

// API: return all playlist state (IDs + track data)
app.get('/api/playlists', (req, res) => {
  res.json({
    floridaWave: store.getPlaylist('floridaWave'),
    gaming:      store.getPlaylist('gaming'),
    underground: store.getPlaylist('underground'),
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, lastRun: store.getLastRun() });
});

app.listen(PORT, () => {
  console.log(`\n  Playlister507 web server → http://localhost:${PORT}\n`);
});

module.exports = app;
