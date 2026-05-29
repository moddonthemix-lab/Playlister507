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
document.getElementById('btn-blog').addEventListener('click', showBlog);

document.getElementById('btn-update-all').addEventListener('click', async () => {
  const btn = document.getElementById('btn-update-all');
  if (!confirm('Update all 7 playlists now? This runs in the background and takes ~2 minutes.')) return;
  btn.disabled = true;
  btn.textContent = 'Starting…';
  try {
    const res = await fetch('/api/admin/trigger-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistKey: 'all' }),
    });
    const data = await res.json();
    if (res.ok) {
      toast('All playlists updating — takes ~2 minutes', 'success');
      btn.textContent = 'Running…';
      setTimeout(() => { btn.disabled = false; btn.textContent = '⚡ Update All Playlists'; }, 120_000);
    } else {
      toast(data.error || 'Failed', 'error');
      btn.disabled = false;
      btn.textContent = '⚡ Update All Playlists';
    }
  } catch {
    toast('Request failed', 'error');
    btn.disabled = false;
    btn.textContent = '⚡ Update All Playlists';
  }
});

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
let _submissionsData   = [];
let _submissionsFilter = 'all';

async function showSubmissions() {
  document.querySelectorAll('.adm-pl-btn').forEach(b => b.classList.remove('active'));
  currentKey = null;
  const main = document.getElementById('adm-main');
  main.innerHTML = `
    <div class="adm-editor-header">
      <h2 class="adm-editor-title">Submissions</h2>
    </div>
    <div class="sub-filter-tabs" id="sub-filter-tabs">
      <button class="sub-filter-tab active" data-filter="all">All</button>
      <button class="sub-filter-tab" data-filter="pending">Pending</button>
      <button class="sub-filter-tab" data-filter="accepted">Accepted</button>
      <button class="sub-filter-tab" data-filter="declined">Declined</button>
    </div>
    <div id="submissions-list"><p style="color:rgba(255,255,255,0.3);font-size:14px">Loading…</p></div>
  `;

  document.getElementById('sub-filter-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.sub-filter-tab');
    if (!tab) return;
    document.querySelectorAll('.sub-filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    _submissionsFilter = tab.dataset.filter;
    renderSubmissionsList();
  });

  try {
    const res  = await fetch('/api/admin/submissions');
    _submissionsData = await res.json();
    _submissionsFilter = 'all';
    renderSubmissionsList();
  } catch {
    toast('Failed to load submissions', 'error');
  }
}

function renderSubmissionsList() {
  const el = document.getElementById('submissions-list');
  if (!el) return;

  const filtered = _submissionsData.filter(s => {
    if (_submissionsFilter === 'all') return true;
    const status = (s.status || 'pending').toLowerCase();
    return status === _submissionsFilter;
  });

  if (!_submissionsData.length) {
    el.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:14px">No submissions yet.</p>';
    return;
  }
  if (!filtered.length) {
    el.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:14px">No ${_submissionsFilter} submissions.</p>`;
    return;
  }

  el.innerHTML = filtered.map(s => {
    const status  = (s.status || 'pending').toLowerCase();
    const badgeClass = status === 'accepted' ? 'sub-status-badge--accepted'
                     : status === 'declined' ? 'sub-status-badge--declined'
                     : 'sub-status-badge--pending';
    const borderClass = status === 'accepted' ? 'sub-border--accepted'
                      : status === 'declined' ? 'sub-border--declined'
                      : 'sub-border--pending';
    const dateStr = s.submittedAt
      ? new Date(s.submittedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : '—';
    const notesVal = s.notes || '';
    const notesDisplay = notesVal
      ? `<span class="sub-notes-text">${esc(notesVal)}</span>`
      : `<span class="sub-notes-placeholder">Add note…</span>`;

    return `
      <div class="adm-submission-item ${borderClass}" data-id="${esc(String(s.id))}">
        <div class="sub-card-header">
          <h4>${esc(s.artistName || '—')} — ${esc(s.trackTitle || '(no title)')}</h4>
          <span class="sub-status-badge ${badgeClass}">${status.toUpperCase()}</span>
        </div>
        <p>Playlist: ${esc(s.playlist || '—')} &nbsp;·&nbsp; Genre: ${esc(s.genre || '—')}</p>
        <p>Email: ${esc(s.email || '—')} &nbsp;·&nbsp; ${dateStr}</p>
        ${s.trackLink ? `<p><a href="${esc(s.trackLink)}" target="_blank" rel="noopener">Listen ↗</a></p>` : ''}
        ${s.pitch ? `<p style="margin-top:6px;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6">${esc(s.pitch)}</p>` : ''}
        <div class="sub-notes-row" data-id="${esc(String(s.id))}">
          <div class="sub-notes-display">${notesDisplay}</div>
          <textarea class="sub-notes-textarea adm-textarea" style="display:none" rows="2">${esc(notesVal)}</textarea>
        </div>
        <div class="sub-actions">
          <button class="adm-btn adm-btn--green sub-btn-accept" data-id="${esc(String(s.id))}" ${status === 'accepted' ? 'disabled' : ''}>Accept</button>
          <button class="adm-btn adm-btn--red sub-btn-decline" data-id="${esc(String(s.id))}" ${status === 'declined' ? 'disabled' : ''}>Decline</button>
          <button class="adm-btn sub-btn-delete" data-id="${esc(String(s.id))}" style="margin-left:auto">&#x1F5D1; Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Bind action buttons
  el.querySelectorAll('.sub-btn-accept').forEach(btn => {
    btn.addEventListener('click', () => patchSubmission(btn.dataset.id, { status: 'accepted' }));
  });
  el.querySelectorAll('.sub-btn-decline').forEach(btn => {
    btn.addEventListener('click', () => patchSubmission(btn.dataset.id, { status: 'declined' }));
  });
  el.querySelectorAll('.sub-btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteSubmission(btn.dataset.id));
  });

  // Notes inline editing — click to open, blur to save
  el.querySelectorAll('.sub-notes-row').forEach(row => {
    const display  = row.querySelector('.sub-notes-display');
    const textarea = row.querySelector('.sub-notes-textarea');
    const id       = row.dataset.id;

    display.addEventListener('click', () => {
      display.style.display  = 'none';
      textarea.style.display = 'block';
      textarea.focus();
    });

    textarea.addEventListener('blur', async () => {
      const newNotes = textarea.value;
      textarea.style.display = 'none';
      display.style.display  = '';
      display.innerHTML = newNotes
        ? `<span class="sub-notes-text">${esc(newNotes)}</span>`
        : `<span class="sub-notes-placeholder">Add note…</span>`;
      await patchSubmission(id, { notes: newNotes }, true);
    });
  });
}

async function patchSubmission(id, body, silent = false) {
  try {
    const res = await fetch(`/api/admin/submission/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || 'Update failed', 'error');
      return;
    }
    // Update local cache
    const idx = _submissionsData.findIndex(s => String(s.id) === String(id));
    if (idx !== -1) {
      if (body.status !== undefined) _submissionsData[idx].status = body.status;
      if (body.notes  !== undefined) _submissionsData[idx].notes  = body.notes;
    }
    if (!silent) {
      toast(body.status ? `Marked ${body.status}` : 'Note saved', 'success');
      renderSubmissionsList();
    }
  } catch {
    toast('Request failed', 'error');
  }
}

async function deleteSubmission(id) {
  if (!confirm('Delete this submission? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/admin/submission/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || 'Delete failed', 'error');
      return;
    }
    _submissionsData = _submissionsData.filter(s => String(s.id) !== String(id));
    toast('Submission deleted', 'success');
    renderSubmissionsList();
  } catch {
    toast('Request failed', 'error');
  }
}

// ── Blog Manager ─────────────────────────────────────────────────
async function showBlog() {
  document.querySelectorAll('.adm-pl-btn').forEach(b => b.classList.remove('active'));
  currentKey = null;
  const main = document.getElementById('adm-main');
  main.innerHTML = `
    <div class="adm-blog-header">
      <h2 class="adm-editor-title">Blog Posts</h2>
      <button class="adm-btn adm-btn--green" id="btn-new-post">+ New Post</button>
    </div>
    <div id="blog-list"><p style="color:rgba(255,255,255,0.3);font-size:14px">Loading…</p></div>
  `;

  document.getElementById('btn-new-post').addEventListener('click', () => showNewPostForm());

  try {
    const res  = await fetch('/api/admin/blog-posts');
    const posts = await res.json();
    renderBlogList(posts);
  } catch {
    toast('Failed to load blog posts', 'error');
  }
}

function renderBlogList(posts) {
  const el = document.getElementById('blog-list');
  if (!el) return;

  if (!posts || !posts.length) {
    el.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:14px">No posts yet. Create your first one.</p>';
    return;
  }

  el.innerHTML = `<div class="adm-blog-list">${posts.map(p => {
    const dateStr = p.createdAt
      ? new Date(p.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : '—';
    const tagStyle = p.tagColor ? `background:${esc(p.tagColor)}22;color:${esc(p.tagColor)};border:1px solid ${esc(p.tagColor)}44` : '';
    return `
      <div class="adm-blog-item">
        <div class="adm-blog-item__body">
          <div class="adm-blog-item__title">${esc(p.title || '(Untitled)')}</div>
          <div class="adm-blog-item__meta">
            ${p.tag ? `<span class="adm-blog-tag" style="${tagStyle}">${esc(p.tag)}</span>` : ''}
            ${dateStr}
            &nbsp;·&nbsp;
            <span style="color:${p.published ? '#1DB954' : 'rgba(255,255,255,0.3)'}">${p.published ? 'Published' : 'Draft'}</span>
          </div>
        </div>
        <div class="adm-blog-item__actions">
          <button class="adm-btn blog-btn-edit" data-id="${esc(String(p.id || p._id || ''))}">Edit</button>
          <button class="adm-btn adm-btn--red blog-btn-delete" data-id="${esc(String(p.id || p._id || ''))}" data-title="${esc(p.title || '')}">Delete</button>
        </div>
      </div>
    `;
  }).join('')}</div>`;

  el.querySelectorAll('.blog-btn-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const res = await fetch(`/api/admin/blog-posts/${encodeURIComponent(btn.dataset.id)}`);
        const post = await res.json();
        showNewPostForm(post);
      } catch {
        toast('Failed to load post', 'error');
      }
    });
  });

  el.querySelectorAll('.blog-btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deletePost(btn.dataset.id, btn.dataset.title));
  });
}

function showNewPostForm(existing = null) {
  const main = document.getElementById('adm-main');
  const isEdit = !!existing;

  const playlistOptions = Object.entries(PLAYLIST_META).map(([key, meta]) =>
    `<option value="${esc(key)}" ${existing?.playlist === key ? 'selected' : ''}>${esc(meta.label)}</option>`
  ).join('');

  const sections = existing?.sections?.length
    ? existing.sections
    : [{ heading: '', body: '' }];

  const sectionsHtml = sections.map((sec, i) => buildSectionItemHtml(sec, i)).join('');

  main.innerHTML = `
    <div class="adm-blog-header">
      <h2 class="adm-editor-title">${isEdit ? 'Edit Post' : 'New Post'}</h2>
    </div>
    <div class="adm-section">
      <form class="adm-blog-form" id="blog-post-form" onsubmit="return false">

        <div>
          <label class="adm-section-title" for="blog-title">Title</label>
          <input class="adm-input" type="text" id="blog-title" placeholder="e.g. The Rise of Florida Rap" required
            value="${esc(existing?.title || '')}" style="width:100%" />
        </div>

        <div>
          <label class="adm-section-title" for="blog-slug">Slug</label>
          <input class="adm-input" type="text" id="blog-slug" placeholder="e.g. rise-of-florida-rap"
            value="${esc(existing?.slug || '')}" style="width:100%" />
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:160px">
            <label class="adm-section-title" for="blog-tag">Tag</label>
            <input class="adm-input" type="text" id="blog-tag" placeholder="e.g. Florida Rap"
              value="${esc(existing?.tag || '')}" style="width:100%" />
          </div>
          <div style="min-width:120px">
            <label class="adm-section-title" for="blog-tag-color">Tag Color</label>
            <input type="color" id="blog-tag-color" value="${esc(existing?.tagColor || '#FFD166')}"
              style="width:100%;height:42px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);cursor:pointer;padding:4px 6px" />
          </div>
        </div>

        <div>
          <label class="adm-section-title" for="blog-playlist">Playlist</label>
          <select class="adm-input" id="blog-playlist" style="width:100%">
            <option value="">— None —</option>
            ${playlistOptions}
          </select>
        </div>

        <div>
          <label class="adm-section-title" for="blog-meta-desc">Meta Description <span class="adm-char-count" id="meta-char-count">0 / 160</span></label>
          <textarea class="adm-textarea" id="blog-meta-desc" rows="2" maxlength="200"
            placeholder="Short description for search engines (max 160 chars)"
            style="margin-bottom:0">${esc(existing?.metaDescription || '')}</textarea>
        </div>

        <div>
          <label class="adm-section-title" for="blog-read-time">Read Time</label>
          <input class="adm-input" type="text" id="blog-read-time" placeholder="e.g. 5 min read"
            value="${esc(existing?.readTime || '')}" style="width:100%" />
        </div>

        <div>
          <label class="adm-section-title" for="blog-intro">Intro</label>
          <textarea class="adm-textarea" id="blog-intro" rows="4"
            placeholder="The hook paragraph — draws readers in">${esc(existing?.intro || '')}</textarea>
        </div>

        <div class="adm-blog-sections">
          <p class="adm-section-title" style="margin-bottom:12px">Sections</p>
          <div id="blog-sections-list">${sectionsHtml}</div>
          <button type="button" class="adm-btn" id="btn-add-section" style="margin-top:8px">+ Add Section</button>
        </div>

        <div>
          <label class="adm-section-title" for="blog-cta">CTA Line</label>
          <input class="adm-input" type="text" id="blog-cta" placeholder="e.g. Follow Fresh Florida Wave on Spotify"
            value="${esc(existing?.ctaLine || '')}" style="width:100%" />
        </div>

        <div style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" id="blog-published" ${existing === null || existing?.published !== false ? 'checked' : ''}
            style="width:16px;height:16px;cursor:pointer;accent-color:#1DB954" />
          <label for="blog-published" style="font-size:14px;color:rgba(255,255,255,0.7);cursor:pointer">Published</label>
        </div>

        <div style="display:flex;gap:10px;margin-top:4px">
          <button type="button" class="adm-btn" id="btn-cancel-post">Cancel</button>
          <button type="button" class="adm-btn adm-btn--green" id="btn-save-post">Save Post</button>
        </div>

      </form>
    </div>
  `;

  const titleInput = document.getElementById('blog-title');
  const slugInput  = document.getElementById('blog-slug');
  titleInput.addEventListener('input', () => {
    if (!isEdit || !slugInput.dataset.manuallyEdited) {
      slugInput.value = titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  });
  slugInput.addEventListener('input', () => {
    slugInput.dataset.manuallyEdited = '1';
  });

  const metaDesc  = document.getElementById('blog-meta-desc');
  const charCount = document.getElementById('meta-char-count');
  function updateCharCount() {
    const len = metaDesc.value.length;
    charCount.textContent = `${len} / 160`;
    charCount.classList.toggle('adm-char-count--over', len > 160);
  }
  metaDesc.addEventListener('input', updateCharCount);
  updateCharCount();

  document.getElementById('btn-add-section').addEventListener('click', () => {
    const list = document.getElementById('blog-sections-list');
    const idx  = list.querySelectorAll('.adm-blog-section-item').length;
    const div  = document.createElement('div');
    div.innerHTML = buildSectionItemHtml({ heading: '', body: '' }, idx);
    list.appendChild(div.firstElementChild);
    bindSectionRemove(list.lastElementChild);
  });

  document.querySelectorAll('.adm-blog-section-item').forEach(item => bindSectionRemove(item));

  document.getElementById('btn-cancel-post').addEventListener('click', showBlog);
  document.getElementById('btn-save-post').addEventListener('click', () => savePost(existing?.id || existing?._id || null));
}

function buildSectionItemHtml(sec, idx) {
  return `
    <div class="adm-blog-section-item">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;letter-spacing:2px;color:rgba(255,255,255,0.25)">SECTION ${idx + 1}</span>
        <button type="button" class="adm-btn adm-btn--red blog-section-remove" style="padding:4px 10px;font-size:11px">Remove</button>
      </div>
      <input class="adm-input blog-section-heading" type="text" placeholder="Section heading (optional)"
        value="${esc(sec.heading || '')}" style="width:100%;margin-bottom:8px" />
      <textarea class="adm-textarea blog-section-body" rows="4"
        placeholder="Section body text">${esc(sec.body || '')}</textarea>
    </div>
  `;
}

function bindSectionRemove(item) {
  const btn = item.querySelector('.blog-section-remove');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const list = document.getElementById('blog-sections-list');
    if (list && list.querySelectorAll('.adm-blog-section-item').length > 1) {
      item.remove();
    } else {
      toast('At least one section is required', 'error');
    }
  });
}

async function savePost(id = null) {
  const titleEl = document.getElementById('blog-title');
  const slugEl  = document.getElementById('blog-slug');

  const title = titleEl.value.trim();
  let   slug  = slugEl.value.trim();

  if (!title) { toast('Title is required', 'error'); titleEl.focus(); return; }
  if (!slug)  { slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); slugEl.value = slug; }
  if (!slug)  { toast('Slug is required', 'error'); slugEl.focus(); return; }

  const sectionItems = document.querySelectorAll('#blog-sections-list .adm-blog-section-item');
  const sections = Array.from(sectionItems).map(item => ({
    heading: item.querySelector('.blog-section-heading')?.value?.trim() || '',
    body:    item.querySelector('.blog-section-body')?.value?.trim()    || '',
  }));

  const payload = {
    title,
    slug,
    tag:             document.getElementById('blog-tag').value.trim(),
    tagColor:        document.getElementById('blog-tag-color').value,
    playlist:        document.getElementById('blog-playlist').value,
    metaDescription: document.getElementById('blog-meta-desc').value.trim(),
    readTime:        document.getElementById('blog-read-time').value.trim(),
    intro:           document.getElementById('blog-intro').value.trim(),
    sections,
    ctaLine:         document.getElementById('blog-cta').value.trim(),
    published:       document.getElementById('blog-published').checked,
  };

  const btn = document.getElementById('btn-save-post');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const method = id ? 'PATCH' : 'POST';
    const url    = id ? `/api/admin/blog-posts/${encodeURIComponent(id)}` : '/api/admin/blog-posts';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast('Post saved', 'success');
      showBlog();
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || 'Save failed', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Post';
    }
  } catch {
    toast('Request failed', 'error');
    btn.disabled = false;
    btn.textContent = 'Save Post';
  }
}

async function deletePost(id, title) {
  if (!confirm(`Delete "${title || 'this post'}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`/api/admin/blog-posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || 'Delete failed', 'error');
      return;
    }
    toast('Post deleted', 'success');
    showBlog();
  } catch {
    toast('Request failed', 'error');
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
        // Spotify max: 256KB. Use 500px + quality 0.8 to stay safely under.
        const MAX = 500;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
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
