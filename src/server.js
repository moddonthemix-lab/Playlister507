require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const store   = require('./store');
const { startScheduler } = require('./scheduler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// ── Admin auth ──────────────────────────────────────────────────────
const adminSessions = new Set();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'iloveburgers1!';

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  });
  return cookies;
}

function requireAdmin(req, res, next) {
  const { admin_token } = parseCookies(req);
  if (admin_token && adminSessions.has(admin_token)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.post('/admin/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.add(token);
  res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
  res.json({ ok: true });
});

app.post('/admin/logout', (req, res) => {
  const { admin_token } = parseCookies(req);
  adminSessions.delete(admin_token);
  res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/admin/check', requireAdmin, (req, res) => res.json({ ok: true }));

// ── Admin API ───────────────────────────────────────────────────────
app.get('/api/admin/playlists', requireAdmin, (req, res) => {
  const keys = ['floridaWave', 'gaming', 'underground', 'workout', 'study', 'summer', 'kpop'];
  const result = {};
  keys.forEach(k => { result[k] = store.getPlaylist(k); });
  res.json(result);
});

app.get('/api/admin/search', requireAdmin, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing q' });
  try {
    const spotify = require('./spotify/client');
    const items = await spotify.searchTracks(q, 10);
    res.json({ tracks: items.map(t => ({
      id: t.id, uri: t.uri, name: t.name,
      artist: t.artists?.[0]?.name,
      album: t.album?.name,
      image: t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || null,
      duration_ms: t.duration_ms,
    })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/add-track', requireAdmin, async (req, res) => {
  const { playlistKey, trackUri, trackId, trackName, trackArtist } = req.body;
  const playlist = store.getPlaylist(playlistKey);
  if (!playlist?.id) return res.status(400).json({ error: 'Playlist not initialized' });
  try {
    const spotify = require('./spotify/client');
    await spotify.addTracksToPlaylist(playlist.id, [trackUri]);
    const tracks = [...(playlist.tracks || []), { uri: trackUri, id: trackId, name: trackName, artist: trackArtist, popularityGain: 0 }];
    store.setPlaylist(playlistKey, { ...playlist, tracks, lastUpdated: new Date().toISOString() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/remove-track', requireAdmin, async (req, res) => {
  const { playlistKey, trackUri } = req.body;
  const playlist = store.getPlaylist(playlistKey);
  if (!playlist?.id) return res.status(400).json({ error: 'Playlist not initialized' });
  try {
    const spotify = require('./spotify/client');
    await spotify.removeTracksFromPlaylist(playlist.id, [trackUri]);
    const tracks = (playlist.tracks || []).filter(t => t.uri !== trackUri);
    store.setPlaylist(playlistKey, { ...playlist, tracks, lastUpdated: new Date().toISOString() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/update-details', requireAdmin, async (req, res) => {
  const { playlistKey, name, description } = req.body;
  const playlist = store.getPlaylist(playlistKey);
  if (!playlist?.id) return res.status(400).json({ error: 'Playlist not initialized' });
  try {
    const spotify = require('./spotify/client');
    const fields = {};
    if (name !== undefined)        fields.name        = name;
    if (description !== undefined) fields.description = description;
    await spotify.updatePlaylistDetails(playlist.id, fields);
    store.setPlaylist(playlistKey, { ...playlist, ...fields });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/upload-cover', requireAdmin, async (req, res) => {
  const { playlistKey, imageBase64 } = req.body;
  const playlist = store.getPlaylist(playlistKey);
  if (!playlist?.id) return res.status(400).json({ error: 'Playlist not initialized' });
  if (!imageBase64)  return res.status(400).json({ error: 'Missing imageBase64' });
  try {
    const spotify = require('./spotify/client');
    await spotify.uploadPlaylistCover(playlist.id, imageBase64);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/trigger-update', requireAdmin, async (req, res) => {
  const { playlistKey } = req.body;
  const allowed = ['floridaWave', 'gaming', 'underground', 'workout', 'study', 'summer', 'kpop', 'all'];
  if (!playlistKey || !allowed.includes(playlistKey)) {
    return res.status(400).json({ error: `playlistKey must be one of: ${allowed.join(', ')}` });
  }
  res.json({ ok: true, message: `Update started for: ${playlistKey}` });
  setImmediate(() => runUpdateJob(playlistKey));
});

app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
  if (store.useSupabase()) {
    try {
      const rows = await store.sbGet('submissions', '?select=id,data,submitted_at&order=submitted_at.desc');
      return res.json(rows.map(row => ({ id: row.id, ...row.data, submittedAt: row.submitted_at })));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  const filePath = path.join(__dirname, '..', 'data', 'submissions.json');
  if (!fs.existsSync(filePath)) return res.json([]);
  try {
    const submissions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(submissions.map((s, i) => ({ id: i, ...s })));
  } catch { res.json([]); }
});

app.patch('/api/admin/submission/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  if (store.useSupabase()) {
    try {
      const axios = require('axios');
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_KEY = process.env.SUPABASE_KEY;
      const sbH = () => ({
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      });
      // GET the current row to merge
      const rows = await store.sbGet('submissions', `?id=eq.${id}&select=id,data,submitted_at`);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      const updatedData = { ...rows[0].data };
      if (status !== undefined) updatedData.status = status;
      if (notes !== undefined) updatedData.notes = notes;
      await axios.patch(
        `${SUPABASE_URL}/rest/v1/submissions?id=eq.${id}`,
        { data: updatedData },
        { headers: sbH() }
      );
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  // File fallback
  const filePath = path.join(__dirname, '..', 'data', 'submissions.json');
  try {
    let submissions = [];
    if (fs.existsSync(filePath)) {
      try { submissions = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
    }
    const idx = parseInt(id, 10);
    if (isNaN(idx) || idx < 0 || idx >= submissions.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (status !== undefined) submissions[idx].status = status;
    if (notes !== undefined) submissions[idx].notes = notes;
    fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/submission/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (store.useSupabase()) {
    try {
      const axios = require('axios');
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_KEY = process.env.SUPABASE_KEY;
      const sbH = () => ({
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      });
      await axios.delete(
        `${SUPABASE_URL}/rest/v1/submissions?id=eq.${id}`,
        { headers: sbH() }
      );
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  // File fallback
  const filePath = path.join(__dirname, '..', 'data', 'submissions.json');
  try {
    let submissions = [];
    if (fs.existsSync(filePath)) {
      try { submissions = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
    }
    const idx = parseInt(id, 10);
    if (isNaN(idx) || idx < 0 || idx >= submissions.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    submissions.splice(idx, 1);
    fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Shared update helper ────────────────────────────────────────────
async function runUpdateJob(key) {
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
      kpop:        require('./playlists/kpop'),
    };
    const me = await spotify.getMe();
    const keys = key === 'all' ? Object.keys(generators) : [key];
    for (const k of keys) {
      try {
        const result = await updatePlaylist(k, generators[k], me.id);
        global.__lastUpdateError = null;
        console.log(`[update] ✓ ${k}: ${result.trackCount} tracks`);
      } catch (e) {
        console.error(`[update] ✗ ${k}:`, e.message);
        global.__lastUpdateError = { key: k, message: e.message, time: new Date().toISOString() };
      }
    }
  } catch (e) {
    console.error('[update] Auth/init error:', e.message);
    global.__lastUpdateError = { key: 'auth', message: e.message, time: new Date().toISOString() };
  }
}

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/templates', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'templates.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'blog.html'));
});
app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'blog-post.html'));
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/playlists', (req, res) => {
  res.json({
    floridaWave: store.getPlaylist('floridaWave'),
    gaming:      store.getPlaylist('gaming'),
    underground: store.getPlaylist('underground'),
    workout:     store.getPlaylist('workout'),
    study:       store.getPlaylist('study'),
    summer:      store.getPlaylist('summer'),
    kpop:        store.getPlaylist('kpop'),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, lastRun: store.getLastRun() });
});

app.get('/api/status', (req, res) => {
  const keys = ['floridaWave', 'gaming', 'underground', 'workout', 'study', 'summer', 'kpop'];
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

app.post('/api/submit', async (req, res) => {
  try {
    const submission = { ...req.body, submittedAt: new Date().toISOString() };
    if (!submission.artistName || !submission.trackLink || !submission.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (store.useSupabase()) {
      await store.sbInsert('submissions', { data: submission, submitted_at: submission.submittedAt });
    } else {
      const filePath = path.join(__dirname, '..', 'data', 'submissions.json');
      let submissions = [];
      if (fs.existsSync(filePath)) {
        try { submissions = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
      }
      submissions.push(submission);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
    }
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
  const allowed = ['floridaWave', 'gaming', 'underground', 'workout', 'study', 'summer', 'kpop', 'all'];
  if (!key || !allowed.includes(key)) {
    return res.status(400).json({ error: `playlist must be one of: ${allowed.join(', ')}` });
  }
  res.json({ ok: true, message: `Update started for: ${key}. Check back in ~60 seconds.` });
  setImmediate(() => runUpdateJob(key));
});

// Live playlist stats
app.get('/api/stats', async (req, res) => {
  const secret = process.env.UPDATE_TOKEN;
  if (!secret || req.query.token !== secret) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await fetchStats();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function fetchStats() {
  const spotify = require('./spotify/client');
  const youtube = require('./youtube/client');
  const keys = ['floridaWave', 'gaming', 'underground', 'workout', 'study', 'summer', 'kpop'];
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
    }
  }

  const result = {
    fetchedAt: new Date().toISOString(),
    spotify: { total: totalFollowers, playlists },
    youtube: ytStats,
  };
  global.__cachedStats = result;
  console.log(`[stats] Refreshed — ${totalFollowers} total followers`);
  return result;
}

// Public cached stats
app.get('/api/public-stats', (req, res) => {
  if (global.__cachedStats) {
    res.json(global.__cachedStats);
  } else {
    res.json({ error: 'No stats fetched yet.' });
  }
});

// Spotify re-auth flow
app.get('/auth/spotify', (req, res) => {
  const token = req.query.token;
  if (!token || token !== process.env.UPDATE_TOKEN) return res.status(401).send('Unauthorized');
  const redirectUri = 'https://playlistengine.com/auth/callback';
  const scopes = 'playlist-modify-public playlist-modify-private ugc-image-upload user-read-private';
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
        redirect_uri: 'https://playlistengine.com/auth/callback',
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

app.get('/api/submissions', async (req, res) => {
  if (store.useSupabase()) {
    try {
      const rows = await store.sbGet('submissions', '?select=data,submitted_at&order=submitted_at.desc');
      return res.json(rows.map(row => ({ ...row.data, submittedAt: row.submitted_at })));
    } catch (e) { return res.json([]); }
  }
  const filePath = path.join(__dirname, '..', 'data', 'submissions.json');
  if (!fs.existsSync(filePath)) return res.json([]);
  try { res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8'))); }
  catch { res.json([]); }
});

store.hydrate().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Playlister507 → http://localhost:${PORT}`);
    startScheduler();

  // Auto-fetch stats on startup (30s delay to let Spotify auth settle)
  // then refresh every 6 hours
  setTimeout(() => {
    fetchStats().catch(e => console.warn('[stats] Initial fetch failed:', e.message));
    setInterval(() => {
      fetchStats().catch(e => console.warn('[stats] Auto-refresh failed:', e.message));
    }, 6 * 60 * 60 * 1000);
  }, 30_000);
  });
}).catch(e => {
  console.error('[store] Hydration error, starting anyway:', e.message);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Playlister507 → http://localhost:${PORT}`);
    startScheduler();
  });
});

module.exports = app;
