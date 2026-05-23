require('dotenv').config();
const express = require('express');
const path    = require('path');
const cron    = require('node-cron');
const store   = require('./store');
const { runAll } = require('./update');

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

app.listen(PORT, () => {
  console.log(`\n  Playlister507 → http://localhost:${PORT}\n`);
});

// ── Bi-weekly cron — every Monday 9 AM ET ────────────────────────────
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 9 * * 1';

cron.schedule(CRON_SCHEDULE, async () => {
  if (!store.isUpdateDue()) {
    console.log('[Scheduler] Skipping — last run less than 14 days ago.');
    return;
  }
  console.log('[Scheduler] Bi-weekly update triggered.');
  try {
    await runAll();
  } catch (e) {
    console.error('[Scheduler] Update failed:', e.message);
  }
}, { timezone: 'America/New_York' });

console.log(`  Scheduler active (${CRON_SCHEDULE}) — bi-weekly updates enabled.\n`);

module.exports = app;
