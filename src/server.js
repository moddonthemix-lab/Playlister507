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
    workout:     store.getPlaylist('workout'),
    study:       store.getPlaylist('study'),
    summer:      store.getPlaylist('summer'),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, lastRun: store.getLastRun() });
});

app.get('/api/status', (req, res) => {
  const keys = ['floridaWave', 'gaming', 'underground', 'workout', 'study', 'summer'];
  const playlists = {};
  keys.forEach(k => {
    const p = store.getPlaylist(k);
    playlists[k] = p ? { id: p.id || null, tracks: p.tracks?.length || 0, lastUpdated: p.lastUpdated || null } : null;
  });
  res.json({
    lastRun: store.getLastRun(),
    spotifyConfigured: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_REFRESH_TOKEN),
    lastUpdateError: global.__lastUpdateError || null,
    playlists,
  });
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

// One-time manual trigger: /api/trigger-update?playlist=workout&token=SECRET
app.get('/api/trigger-update', async (req, res) => {
  const secret = process.env.UPDATE_TOKEN;
  if (!secret || req.query.token !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = req.query.playlist;
  const allowed = ['floridaWave', 'gaming', 'underground', 'workout', 'study', 'summer', 'all'];
  if (!key || !allowed.includes(key)) {
    return res.status(400).json({ error: `playlist must be one of: ${allowed.join(', ')}` });
  }
  res.json({ ok: true, message: `Update started for: ${key}. Check back in ~60 seconds.` });
  // Run async after response is sent — detached so errors never crash the server
  setImmediate(async () => {
    try {
      const spotify = require('./spotify/client');
      const { updatePlaylist } = require('./playlists/manager');
      const generators = {
        floridaWave: require('./playlists/floridaWave'),
        gaming:      require('./playlists/gaming'),
        underground: require('./playlists/underground'),
        workout:     require('./playlists/workout'),
        study:       require('./playlists/study'),
        summer:      require('./playlists/summer'),
      };
      const me = await spotify.getMe();
      const keys = key === 'all' ? Object.keys(generators) : [key];
      for (const k of keys) {
        try {
          const result = await updatePlaylist(k, generators[k], me.id);
          global.__lastUpdateError = null;
          console.log(`[trigger] ✓ ${k} updated: ${result.trackCount} tracks`);
        } catch (e) {
          console.error(`[trigger] ✗ ${k} failed:`, e.message, e.stack);
          global.__lastUpdateError = { key: k, message: e.message, time: new Date().toISOString() };
        }
      }
    } catch (e) {
      console.error('[trigger] Auth/init error:', e.message);
      global.__lastUpdateError = { key: 'auth', message: e.message, time: new Date().toISOString() };
    }
  });
});

// Live playlist stats — follower counts from Spotify + YouTube channel stats
app.get('/api/stats', async (req, res) => {
  const secret = process.env.UPDATE_TOKEN;
  if (!secret || req.query.token !== secret) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const spotify = require('./spotify/client');
    const youtube = require('./youtube/client');
    const keys = ['floridaWave', 'gaming', 'underground', 'workout', 'study', 'summer'];
    const playlists = {};
    let totalFollowers = 0;
    for (const k of keys) {
      const p = store.getPlaylist(k);
      if (p?.id) {
        try {
          const s = await spotify.getPlaylistStats(p.id);
          playlists[k] = { followers: s.followers, tracks: s.tracks };
          totalFollowers += (s.followers || 0);
        } catch { playlists[k] = { followers: 0, tracks: 0 }; }
      } else {
        playlists[k] = null;
      }
    }

    let ytStats = null;
    if (process.env.YOUTUBE_REFRESH_TOKEN) {
      try {
        ytStats = await youtube.getChannelStats();
      } catch (e) {
        console.warn('[stats] YouTube channel stats failed:', e.message);
        ytStats = null;
      }
    }

    const result = {
      fetchedAt: new Date().toISOString(),
      spotify: { total: totalFollowers, playlists },
      youtube: ytStats,
    };
    global.__cachedStats = result;
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public cached stats — no token required, returns last fetched data
app.get('/api/public-stats', (req, res) => {
  if (global.__cachedStats) {
    res.json(global.__cachedStats);
  } else {
    res.json({ error: 'No stats fetched yet. Visit /api/stats?token=YOUR_TOKEN to refresh.' });
  }
});

// Spotify re-auth flow — visit /auth/spotify to get a fresh refresh token
app.get('/auth/spotify', (req, res) => {
  const token = req.query.token;
  if (!token || token !== process.env.UPDATE_TOKEN) return res.status(401).send('Unauthorized');
    const redirectUri = 'https://playlister507-production.up.railway.app/auth/callback';
  const scopes = 'playlist-modify-public playlist-modify-private user-read-private';
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`Spotify error: ${error}`);
  if (!code) return res.status(400).send(`Missing code. Query params: ${JSON.stringify(req.query)}`);
  try {
    const axios = require('axios');
    const r = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://playlister507-production.up.railway.app/auth/callback',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );
    const { refresh_token } = r.data;
    res.send(`
      <html><body style="font-family:monospace;padding:40px;background:#111;color:#fff">
        <h2 style="color:#1DB954">✓ New Refresh Token</h2>
        <p>Copy this value and set it as <strong>SPOTIFY_REFRESH_TOKEN</strong> in Railway Variables:</p>
        <textarea style="width:100%;height:80px;background:#222;color:#1DB954;border:1px solid #333;padding:12px;font-size:13px;border-radius:8px">${refresh_token}</textarea>
        <p style="color:#888;margin-top:16px">After updating the Railway variable, trigger the update again.</p>
      </body></html>
    `);
  } catch (e) {
    res.status(500).send(`Auth failed: ${e.message}`);
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

