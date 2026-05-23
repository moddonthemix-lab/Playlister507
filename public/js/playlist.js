/* ═══════════════════════════════════════════════════════════════
   Playlist Engine — Playlist Detail Page JS
   ═══════════════════════════════════════════════════════════════ */

const CONFIGS = {
  'florida-wave': {
    key:        'floridaWave',
    name:       'FRESH\nFLORIDA\nWAVE',
    eyebrow:    '— Florida Rap Only —',
    desc:       'Only Florida MCs. The Sunshine State\'s finest, rotating every two weeks based on real traction data.',
    tags:       ['Florida Rap Only', '20 Tracks', 'Bi-Weekly'],
    heroClass:  'florida',
    btnClass:   '',
    otherClass: 'other-card--florida',
    accentColor:'#FFD166',
  },
  'gaming': {
    key:        'gaming',
    name:       'UNSTOPPABLE\nGAMING',
    eyebrow:    '— All Genres · All Levels —',
    desc:       'EDM, metal, trap, synthwave — whatever hits hardest. The soundtrack to your victories, evolved from listener data.',
    tags:       ['All Genres', '20 Tracks', 'High Energy'],
    heroClass:  'gaming',
    btnClass:   'pl-btn--gaming',
    otherClass: 'other-card--gaming',
    accentColor:'#8B5CF6',
  },
  'underground': {
    key:        'underground',
    name:       'THE\nSLEPT ON\nUNDERGROUND',
    eyebrow:    '— Rising Artists —',
    desc:       'The ones growing right now. Emerging artists from everywhere, trending before the world catches on.',
    tags:       ['Rising Artists', '20 Tracks', 'All Genres'],
    heroClass:  'underground',
    btnClass:   'pl-btn--underground',
    otherClass: 'other-card--underground',
    accentColor:'#F5A623',
  },
};

const OTHER_INFO = {
  'florida-wave': { title: 'FRESH FLORIDA WAVE',      desc: 'Florida rap only. 20 tracks.' },
  'gaming':       { title: 'UNSTOPPABLE GAMING',       desc: 'All genres, max energy.' },
  'underground':  { title: 'THE SLEPT ON UNDERGROUND', desc: 'Rising artists, always fresh.' },
};

// ── Read query param ────────────────────────────────────────────────
const params   = new URLSearchParams(window.location.search);
const id       = params.get('id') || 'florida-wave';
const config   = CONFIGS[id] || CONFIGS['florida-wave'];

// ── Apply static config immediately ────────────────────────────────
const hero = document.getElementById('detail-hero');
if (hero) hero.classList.add(config.heroClass);

const titleEl = document.getElementById('detail-title');
if (titleEl) {
  titleEl.innerHTML = config.name.split('\n').map(line => `<span style="display:block">${line}</span>`).join('');
  titleEl.style.color = config.accentColor;
}

const eyebrowEl = document.getElementById('detail-eyebrow');
if (eyebrowEl) eyebrowEl.textContent = config.eyebrow;

const descEl = document.getElementById('detail-desc');
if (descEl) descEl.textContent = config.desc;

document.title = `Playlist Engine — ${config.name.replace(/\n/g, ' ')}`;

// Tags
const badgesEl = document.getElementById('detail-badges');
if (badgesEl) {
  config.tags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'pl-tag';
    span.textContent = tag;
    badgesEl.appendChild(span);
  });
}

// Traction badge
const actionRow = document.querySelector('.pl-detail-action-row');
if (actionRow) {
  const badge = document.createElement('div');
  badge.className = 'traction-badge';
  badge.innerHTML = '<div class="traction-badge__dot"></div> Traction-tracked';
  actionRow.appendChild(badge);
}

// Other playlists
const otherCards = document.getElementById('other-cards');
if (otherCards) {
  Object.entries(OTHER_INFO).forEach(([pid, info]) => {
    if (pid === id) return;
    const cls = CONFIGS[pid]?.otherClass || '';
    const a = document.createElement('a');
    a.href      = `playlist.html?id=${pid}`;
    a.className = `other-card ${cls}`;
    a.innerHTML = `
      <span class="other-card__arrow">↗</span>
      <p class="other-card__label">— Playlist Engine —</p>
      <h3 class="other-card__title">${info.title}</h3>
      <p class="other-card__desc">${info.desc}</p>
    `;
    otherCards.appendChild(a);
  });
}

// ── Load live data from API ─────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('/api/playlists');
    if (!res.ok) throw new Error('no api');
    const data = await res.json();
    const playlist = data[config.key];
    if (!playlist) return;

    // Update meta
    const countEl   = document.getElementById('detail-count');
    const updatedEl = document.getElementById('detail-updated');
    if (countEl && playlist.tracks) countEl.textContent = playlist.tracks.length;
    if (updatedEl && playlist.lastUpdated) {
      updatedEl.textContent = new Date(playlist.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Inject Spotify embed
    if (playlist.id) {
      const embedContainer = document.getElementById('detail-embed');
      const iframe = document.createElement('iframe');
      iframe.src     = `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0`;
      iframe.width   = '100%';
      iframe.height  = '500';
      iframe.allow   = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      iframe.style.borderRadius = '16px';
      embedContainer.innerHTML = '';
      embedContainer.appendChild(iframe);

      // Update nav + open button
      const navSpotify = document.getElementById('nav-spotify');
      const openBtn    = document.getElementById('detail-open-btn');
      const link = `https://open.spotify.com/playlist/${playlist.id}`;
      if (navSpotify) navSpotify.href = link;
      if (openBtn)    openBtn.href    = link;
    }

    // Render track list
    if (playlist.tracks?.length) {
      renderTracks(playlist.tracks);

      const noteEl = document.getElementById('refresh-note');
      if (noteEl && playlist.lastUpdated) {
        const next = new Date(playlist.lastUpdated);
        next.setDate(next.getDate() + 14);
        noteEl.textContent = `Next auto-refresh: ${next.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      }
    }
  } catch {
    clearSkeletons();
  }
}

function renderTracks(tracks) {
  const list = document.getElementById('track-list');
  if (!list) return;
  list.innerHTML = tracks.map((t, i) => `
    <div class="track-item">
      <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="track-info">
        <div class="track-name">${escHtml(t.name || '—')}</div>
        <div class="track-artist">${escHtml(t.artist || '—')}</div>
      </div>
      ${t.popularityGain > 0 ? `<span class="track-pop">↑${t.popularityGain}</span>` : ''}
    </div>
  `).join('');
}

function clearSkeletons() {
  const list = document.getElementById('track-list');
  if (!list) return;
  list.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:14px;padding:16px">Track data loads after setup. Run <code>npm run update</code> first.</p>';
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadData();
