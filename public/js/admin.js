/* ═══════════════════════════════════════════════════════
   Playlist Engine — Admin Dashboard
   ═══════════════════════════════════════════════════════ */

const PLAYLIST_META = {
  floridaWave: { label: 'Fresh Florida Wave',        color: '#FFD166' },
  gaming:      { label: 'Unstoppable Gaming',         color: '#8B5CF6' },
  underground: { label: 'The Slept On Underground',   color: '#F5A623' },
  workout:     { label: 'The Iron Hour',              color: '#FF4D4D' },
  study:       { label: 'Locked In',                  color: '#4FC3F7' },
  summer:      { label: 'Seasonal: Summer Jams',      color: '#FFD166' },
  kpop:        { label: 'Ease In Kpop',               color: '#FF69B4' },
};

let currentKey  = null;
let allPlaylists = {};

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('/api/admin/check');
    if (res.ok) {
      showDashboard();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

// ── Auth ──────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').classList.remove('visible');
  setTimeout(() => document.getElementById('login-password').focus(), 100);
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').classList.add('visible');
  loadAllPlaylists();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw  = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button');
  const err = document.getElementById('login-error');
  btn.disabled = true;
  btn.textContent = 'SIGNING IN…';
  err.textContent = '';
  try {
    const res  = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (res.ok) {
      showDashboard();
    } else {
      err.textContent = data.error || 'Wrong password';
      btn.disabled = false;
      btn.textContent = 'SIGN IN';
    }
  } catch {
    err.textContent = 'Connection error';
    btn.disabled = false;
    btn.textContent = 'SIGN IN';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/admin/logout', { method: 'POST' });
  showLogin();
  document.getElementById('login-password').value = '';
});

// ── Load playlists ────────────────────────────────────────────────
async function loadAllPlaylists() {
  try {
    const res  = await fetch('/api/admin/playlists');
    allPlaylists = await res.json();
    updateStatus();
  } catch {
    toast('Failed to load playlists', 'error');
  }
}

function updateStatus() {
  const total = Object.values(allPlaylists).filter(p => p?.id).length;
  document.getElementById('adm-status').textContent = `${total}/${Object.keys(PLAYLIST_META).length} playlists active`;
}

// ── Playlist selection ────────────────────────────────────────────
document.getElementById('playlist-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('.adm-pl-btn');
  if (!btn) return;
  document.querySelectorAll('.adm-pl-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectPlaylist(btn.dataset.key);
});

document.getElementById('btn-submissions').addEventListener('click', showSubmissions);

function selectPlaylist(key) {
  currentKey = key;
  const playlist = allPlaylists[key];
  const meta     = PLAYLIST_META[key] || {};
  const main     = document.getElementById('adm-main');

  main.innerHTML = `
    <div class="adm-editor-header">
      <span class="adm-editor-dot" style="background:${meta.color}"></span>
      <h2 class="adm-editor-title">${meta.label || key}</h2>
      <div class="adm-editor-meta">
        ${playlist?.tracks?.length ?? 0} tracks
        ${playlist?.lastUpdated ? '<br>' + new Date(playlist.lastUpdated).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : ''}
      </div>
    </div>

    ${!playlist?.id ? `<div class="adm-section"><p style="color:rgba(255,255,255,0.4);font-size:14px">This playlist hasn't been initialized yet. Use "Trigger Auto-Update" below to generate it.</p></div>` : ''}

    <!-- Add Track -->
    <div class="adm-section">
      <p class="adm-section-title">Add a Track</p>
      <div class="adm-search-row">
        <input class="adm-input" type="text" id="track-search-input" placeholder="Search Spotify — artist, song, album…" />
        <button class="adm-btn adm-btn--green" id="track-search-btn">Search</button>
      </div>
      <div class="adm-search-results" id="search-results"></div>
    </div>

    <!-- Current Tracks -->
    <div class="adm-section">
      <p class="adm-section-title">Current Tracks <span id="track-count" style="color:rgba(255,255,255,0.25)">(${playlist?.tracks?.length ?? 0})</span></p>
      <div class="adm-track-list" id="track-list">
        ${renderTrackList(playlist?.tracks || [])}
      </div>
    </div>

    <!-- Description -->
    <div class="adm-section">
      <p class="adm-section-title">Description</p>
      <textarea class="adm-textarea" id="desc-input" rows="3">${playlist?.description || ''}</textarea>
      <button class="adm-btn adm-btn--green" id="save-desc-btn">Save Description</button>
    </div>

    <!-- Cover Art -->
    <div class="adm-section">
      <p class="adm-section-title">Cover Art</p>
      <div class="adm-cover-row">
        <img class="adm-cover-preview" id="cover-preview" src="" alt="Cover" onerror="this.style.opacity='0'" />
        <div class="adm-cover-info">
          <p>Upload a square JPEG or PNG (min 300×300). We'll auto-compress it for Spotify.</p>
          <input class="adm-file-input" type="file" id="cover-file" accept="image/*" />
          <button class="adm-btn" id="cover-upload-btn">Choose Image…</button>
          <button class="adm-btn adm-btn--green" id="cover-save-btn" style="margin-left:8px;display:none">Upload to Spotify</button>
        </div>
      </div>
      <p id="cover-status" style="margin-top:10px;font-size:13px;color:rgba(255,255,255,0.3)"></p>
    </div>

    <!-- Auto-Update -->
    <div class="adm-section">
      <p class="adm-section-title">Auto-Update</p>
      <div class="adm-trigger-row">
        <button class="adm-btn adm-btn--green" id="trigger-btn">⚡ Trigger Auto-Update</button>
        <p class="adm-trigger-note">Runs the playlist generator and replaces all ${playlist?.tracks?.length ?? 20} tracks with freshly curated ones. Takes ~30 seconds.</p>
      </div>
      <p id="trigger-status" style="margin-top:10px;font-size:13px;color:rgba(255,255,255,0.3)"></p>
    </div>
  `;

  bindEditorEvents(key, playlist);
}

function renderTrackList(tracks) {
  if (!tracks.length) return '<p style="font-size:13px;color:rgba(255,255,255,0.25);padding:8px 0">No tracks yet.</p>';
  return tracks.map((t, i) => `
    <div class="adm-track-item" data-uri="${esc(t.uri)}">
      <span class="adm-track-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="adm-track-info">
        <div class="adm-track-name">${esc(t.name || '—')}</div>
        <div class="adm-track-artist">${esc(t.artist || '—')}</div>
      </div>
      <button class="adm-btn adm-btn--red" onclick="removeTrack('${esc(t.uri)}')">Remove</button>
    </div>
  `).join('');
}

// ── Editor events ─────────────────────────────────────────────────
function bindEditorEvents(key, playlist) {
  // Track search
  const searchInput = document.getElementById('track-search-input');
  const searchBtn   = document.getElementById('track-search-btn');

  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) return;
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching…';
    try {
      const res  = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      renderSearchResults(data.tracks || []);
    } catch {
      toast('Search failed', 'error');
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Search';
    }
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  // Description save
  document.getElementById('save-desc-btn').addEventListener('click', async () => {
    const desc = document.getElementById('desc-input').value;
    const btn  = document.getElementById('save-desc-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const res = await fetch('/api/admin/update-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistKey: key, description: desc }),
      });
      if (res.ok) { toast('Description saved', 'success'); allPlaylists[key] = { ...allPlaylists[key], description: desc }; }
      else toast('Save failed', 'error');
    } catch { toast('Save failed', 'error'); }
    btn.disabled = false;
    btn.textContent = 'Save Description';
  });

  // Cover art
  document.getElementById('cover-upload-btn').addEventListener('click', () => {
    document.getElementById('cover-file').click();
  });

  document.getElementById('cover-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('cover-status');
    status.textContent = 'Processing image…';
    try {
      const base64 = await fileToBase64Jpeg(file);
      const preview = document.getElementById('cover-preview');
      preview.src = `data:image/jpeg;base64,${base64}`;
      preview.style.opacity = '1';
      document.getElementById('cover-save-btn').style.display = 'inline-flex';
      document.getElementById('cover-save-btn').dataset.b64 = base64;
      status.textContent = `Ready to upload (${Math.round(base64.length * 0.75 / 1024)}KB)`;
    } catch {
      status.textContent = 'Image error — try a different file';
    }
  });

  document.getElementById('cover-save-btn').addEventListener('click', async () => {
    const btn    = document.getElementById('cover-save-btn');
    const status = document.getElementById('cover-status');
    const b64    = btn.dataset.b64;
    if (!b64) return;
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    status.textContent = '';
    try {
      const res = await fetch('/api/admin/upload-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistKey: key, imageBase64: b64 }),
      });
      if (res.ok) { toast('Cover art updated on Spotify', 'success'); status.textContent = 'Uploaded successfully'; }
      else { const d = await res.json(); toast(d.error || 'Upload failed', 'error'); }
    } catch { toast('Upload failed', 'error'); }
    btn.disabled = false;
    btn.textContent = 'Upload to Spotify';
  });

  // Trigger update
  document.getElementById('trigger-btn').addEventListener('click', async () => {
    const btn    = document.getElementById('trigger-btn');
    const status = document.getElementById('trigger-status');
    btn.disabled = true;
    btn.textContent = 'Starting…';
    status.textContent = '';
    try {
      const res = await fetch('/api/admin/trigger-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistKey: key }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('Update started — takes ~30 seconds', 'success');
        status.textContent = 'Running in background… Reload the page in ~30 seconds to see updated tracks.';
      } else {
        toast(data.error || 'Failed', 'error');
      }
    } catch { toast('Request failed', 'error'); }
    btn.disabled = false;
    btn.textContent = '⚡ Trigger Auto-Update';
  });
}

// ── Search results ────────────────────────────────────────────────
function renderSearchResults(tracks) {
  const container = document.getElementById('search-results');
  if (!tracks.length) {
    container.innerHTML = '<p style="font-size:13px;color:rgba(255,255,255,0.3);padding:8px 0">No results found.</p>';
    return;
  }
  container.innerHTML = tracks.map(t => `
    <div class="adm-result-item">
      ${t.image ? `<img class="adm-result-img" src="${esc(t.image)}" alt="" />` : '<div class="adm-result-img"></div>'}
      <div class="adm-result-info">
        <div class="adm-result-name">${esc(t.name)}</div>
        <div class="adm-result-artist">${esc(t.artist || '—')} · ${esc(t.album || '')}</div>
      </div>
      <span class="adm-result-dur">${fmtDur(t.duration_ms)}</span>
      <button class="adm-btn adm-btn--green" onclick="addTrack(${JSON.stringify(t).replace(/"/g, '&quot;')})">+ Add</button>
    </div>
  `).join('');
}

// ── Track actions ─────────────────────────────────────────────────
async function addTrack(track) {
  if (!currentKey) return;
  try {
    const res = await fetch('/api/admin/add-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlistKey: currentKey,
        trackUri:    track.uri,
        trackId:     track.id,
        trackName:   track.name,
        trackArtist: track.artist,
      }),
    });
    if (res.ok) {
      const playlist = allPlaylists[currentKey] || {};
      playlist.tracks = [...(playlist.tracks || []), { uri: track.uri, id: track.id, name: track.name, artist: track.artist }];
      allPlaylists[currentKey] = playlist;
      document.getElementById('track-list').innerHTML = renderTrackList(playlist.tracks);
      document.getElementById('track-count').textContent = `(${playlist.tracks.length})`;
      toast(`Added: ${track.name}`, 'success');
    } else {
      const d = await res.json();
      toast(d.error || 'Failed to add', 'error');
    }
  } catch { toast('Request failed', 'error'); }
}

async function removeTrack(uri) {
  if (!currentKey) return;
  try {
    const res = await fetch('/api/admin/remove-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistKey: currentKey, trackUri: uri }),
    });
    if (res.ok) {
      const playlist = allPlaylists[currentKey] || {};
      playlist.tracks = (playlist.tracks || []).filter(t => t.uri !== uri);
      allPlaylists[currentKey] = playlist;
      document.getElementById('track-list').innerHTML = renderTrackList(playlist.tracks);
      document.getElementById('track-count').textContent = `(${playlist.tracks.length})`;
      toast('Track removed', 'success');
    } else {
      const d = await res.json();
      toast(d.error || 'Failed to remove', 'error');
    }
  } catch { toast('Request failed', 'error'); }
}

// ── Submissions ───────────────────────────────────────────────────
async function showSubmissions() {
  document.querySelectorAll('.adm-pl-btn').forEach(b => b.classList.remove('active'));
  currentKey = null;
  const main = document.getElementById('adm-main');
  main.innerHTML = `<div class="adm-editor-header"><h2 class="adm-editor-title">Submissions</h2></div><div id="submissions-list"><p style="color:rgba(255,255,255,0.3);font-size:14px">Loading…</p></div>`;
  try {
    const res  = await fetch('/api/admin/submissions');
    const data = await res.json();
    const el   = document.getElementById('submissions-list');
    if (!data.length) {
      el.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:14px">No submissions yet.</p>';
      return;
    }
    el.innerHTML = [...data].reverse().map(s => `
      <div class="adm-submission-item">
        <h4>${esc(s.artistName)} — ${esc(s.trackTitle || '(no title)')}</h4>
        <p>Playlist: ${esc(s.playlist || '—')} &nbsp;·&nbsp; Genre: ${esc(s.genre || '—')}</p>
        <p>Email: ${esc(s.email)} &nbsp;·&nbsp; ${new Date(s.submittedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</p>
        ${s.trackLink ? `<p><a href="${esc(s.trackLink)}" target="_blank" rel="noopener">Listen ↗</a></p>` : ''}
        ${s.pitch ? `<p style="margin-top:8px;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6">${esc(s.pitch)}</p>` : ''}
      </div>
    `).join('');
  } catch {
    toast('Failed to load submissions', 'error');
  }
}

// ── Image → base64 JPEG ───────────────────────────────────────────
function fileToBase64Jpeg(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDur(ms) {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('adm-toast');
  el.textContent = msg;
  el.className   = `adm-toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
}

// ── Boot ──────────────────────────────────────────────────────────
init();
