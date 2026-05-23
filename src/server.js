require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const store   = require('./store');
const { startScheduler } = require('./scheduler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
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

app.post('/api/submit', (req, res) => {
  try {
    const submission = { ...req.body, submittedAt: new Date().toISOString() };
    // Basic validation
    if (!submission.artistName || !submission.trackLink || !submission.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Save to data/submissions.json
    const filePath = path.join(__dirname, '..', 'data', 'submissions.json');
    let submissions = [];
    if (fs.existsSync(filePath)) {
      try { submissions = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
    }
    submissions.push(submission);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/submissions', (req, res) => {
  // Simple admin view — in production this should be auth-protected
  const filePath = path.join(__dirname, '..', 'data', 'submissions.json');
  if (!fs.existsSync(filePath)) return res.json([]);
  try { res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8'))); }
  catch { res.json([]); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Playlister507 → http://localhost:${PORT}`);
  startScheduler();
});

module.exports = app;

