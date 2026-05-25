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
  'workout': {
    key:        'workout',
    name:       'THE IRON\nHOUR',
    eyebrow:    '— All Genres · High Energy —',
    desc:       'High-intensity. Every genre. The only playlist that matches your effort, updated bi-weekly.',
    tags:       ['All Genres', '20 Tracks', 'High Energy'],
    heroClass:  'workout',
    btnClass:   'pl-btn--workout',
    otherClass: 'other-card--workout',
    accentColor:'#FF4D4D',
  },
  'study': {
    key:        'study',
    name:       'LOCKED\nIN',
    eyebrow:    '— Focus · No Distractions —',
    desc:       'Zero distractions. Pure focus. Instrumental and ambient tracks curated for deep work.',
    tags:       ['Focus Music', '20 Tracks', 'Instrumental'],
    heroClass:  'study',
    btnClass:   'pl-btn--study',
    otherClass: 'other-card--study',
    accentColor:'#4FC3F7',
  },
  'summer': {
    key:        'summer',
    name:       'SEASONAL:\nSUMMER\nJAMS',
    eyebrow:    '— All Vibes · All Summer —',
    desc:       'Sun. Waves. Good vibes only. The seasonal soundtrack to your summer, refreshed every two weeks.',
    tags:       ['Summer Vibes', '20 Tracks', 'Feel Good'],
    heroClass:  'summer',
    btnClass:   'pl-btn--summer',
    otherClass: 'other-card--summer',
    accentColor:'#FFD166',
  },
  'kpop': {
    key:        'kpop',
    name:       'EASE IN\nKPOP',
    eyebrow:    '— K-Pop · K-Indie · Korean R&B —',
    desc:       'K-pop, K-indie, and Korean R&B done right. Trending hits and hidden gems from across the Korean music scene.',
    tags:       ['K-Pop', '20 Tracks', 'Feel Good'],
    heroClass:  'kpop',
    btnClass:   'pl-btn--kpop',
    otherClass: 'other-card--kpop',
    accentColor:'#FF69B4',
  },
};

const OTHER_INFO = {
  'florida-wave': { title: 'FRESH FLORIDA WAVE',      desc: 'Florida rap only. 20 tracks.' },
  'gaming':       { title: 'UNSTOPPABLE GAMING',       desc: 'All genres, max energy.' },
  'underground':  { title: 'THE SLEPT ON UNDERGROUND', desc: 'Rising artists, always fresh.' },
  'workout':      { title: 'THE IRON HOUR',            desc: 'All genres, max intensity.' },
  'study':        { title: 'LOCKED IN',                desc: 'Focus music, zero distractions.' },
  'summer':       { title: 'SEASONAL: SUMMER JAMS',     desc: 'Summer vibes, all genres.' },
  'kpop':         { title: 'EASE IN KPOP',              desc: 'K-pop hits, K-indie gems.' },
};

const SEO_DATA = {
  'florida-wave': {
    title:    'Fresh Florida Wave — Best Florida Rap Playlist on Spotify',
    desc:     'Fresh Florida Wave is Playlist Engine\'s curated Florida rap playlist featuring the best Florida artists right now. Updated every two weeks with rising and established Florida MCs — from Miami to Jacksonville. The only Florida hip-hop playlist driven by real listener traction data.',
    keywords: 'florida rap playlist spotify, florida hip hop playlist, best florida rappers, miami rap music, jacksonville hip hop, florida rap 2025, fresh florida wave playlist engine, curated florida music',
    ogTitle:  'Fresh Florida Wave — Florida Rap Playlist | Playlist Engine',
    ogDesc:   'The best Florida rap playlist on Spotify. 20 tracks, updated every 2 weeks. Only the Sunshine State\'s finest.',
  },
  'gaming': {
    title:    'Unstoppable Gaming — Best Gaming Music Playlist on Spotify 2025',
    desc:     'Unstoppable Gaming is Playlist Engine\'s high-energy gaming playlist. EDM, metal, trap, synthwave, hip-hop — every genre that hits hardest. Whether you\'re grinding ranked, streaming, or just need music to match your focus level, this playlist evolves every two weeks based on listener traction. No filler. Only bangers.',
    keywords: 'gaming playlist spotify, best gaming music 2025, music for gaming, high energy gaming songs, edm gaming playlist, trap gaming music, gaming background music spotify, unstoppable gaming playlist engine',
    ogTitle:  'Unstoppable Gaming — Best Gaming Playlist | Playlist Engine',
    ogDesc:   'EDM, metal, trap, synthwave. High-energy gaming music updated bi-weekly. 20 tracks, no filler.',
  },
  'underground': {
    title:    'The Slept On Underground — Best Underrated Artists Playlist 2025',
    desc:     'The Slept On Underground is where Playlist Engine finds the next wave before everyone else does. Independent and rising artists from across genres — hip-hop, R&B, indie, pop, and beyond. These are the artists trending before the world catches on. Updated every two weeks with fresh traction data.',
    keywords: 'underground music playlist spotify, best underrated artists 2025, rising artists playlist, indie hip hop playlist, slept on music, hidden gem artists spotify, new artists to listen to, underground rap playlist 2025',
    ogTitle:  'The Slept On Underground — Rising Artists Playlist | Playlist Engine',
    ogDesc:   'The next wave before everyone knows. 20 rising artists, updated every 2 weeks.',
  },
  'workout': {
    title:    'The Iron Hour — Best Workout Music Playlist on Spotify 2025',
    desc:     'The Iron Hour is Playlist Engine\'s ultimate workout playlist. High-intensity tracks across every genre — hip-hop, rock, EDM, metal, rap. Built for the gym, the run, the grind. Every track is selected for maximum energy output. Updated every two weeks so your motivation never runs dry.',
    keywords: 'workout playlist spotify, best gym music 2025, exercise music playlist, high intensity workout songs, gym motivation music, running playlist spotify, iron hour playlist engine, best workout songs spotify',
    ogTitle:  'The Iron Hour — Best Workout Playlist | Playlist Engine',
    ogDesc:   'High-intensity workout music across every genre. 20 tracks built for the gym, updated bi-weekly.',
  },
  'study': {
    title:    'Locked In — Best Study Music & Focus Playlist on Spotify 2025',
    desc:     'Locked In is Playlist Engine\'s deep focus and study music playlist. Instrumental, ambient, lo-fi, and atmospheric tracks curated for flow state. Zero distractions. Whether you\'re studying, coding, writing, or doing deep work, Locked In keeps you in the zone. Updated every two weeks.',
    keywords: 'study music playlist spotify, focus music spotify, instrumental music for studying, lo-fi study playlist, deep work music, ambient music playlist, concentration music spotify, locked in playlist engine, best study songs 2025',
    ogTitle:  'Locked In — Best Study & Focus Playlist | Playlist Engine',
    ogDesc:   'Instrumental and ambient focus music for deep work. 20 tracks, zero distractions.',
  },
  'kpop': {
    title:    'Ease In Kpop — Best K-Pop Playlist on Spotify 2025',
    desc:     'Ease In Kpop is Playlist Engine\'s curated K-pop, K-indie, and Korean R&B playlist. From NewJeans and BTS to underground K-indie gems and smooth Korean R&B — 20 tracks updated every two weeks with the freshest sounds from the Korean music scene. Whether you\'re a long-time fan or just discovering K-pop, this is your starting point.',
    keywords: 'kpop playlist spotify 2025, best kpop songs, newjeans spotify, bts playlist, blackpink playlist, aespa ive fifty fifty, k-indie playlist, korean r&b spotify, ease in kpop playlist engine, trending kpop 2025',
    ogTitle:  'Ease In Kpop — Best K-Pop Playlist | Playlist Engine',
    ogDesc:   'K-pop, K-indie, and Korean R&B — the smoothest hits and hidden gems. 20 tracks, updated every 2 weeks.',
  },
  'summer': {
    title:    'Seasonal: Summer Jams — Best Summer Music Playlist on Spotify 2025',
    desc:     'Seasonal: Summer Jams is Playlist Engine\'s hand-curated summer soundtrack. The best feel-good tracks across pop, hip-hop, R&B, and tropical sounds — built for beach days, road trips, and late nights. Updated every two weeks so the vibes stay fresh all season long.',
    keywords: 'summer playlist spotify 2025, best summer songs, summer jams playlist, feel good music summer, beach music playlist spotify, summer hits 2025, seasonal summer jams playlist engine, summer road trip music',
    ogTitle:  'Seasonal: Summer Jams — Best Summer Playlist | Playlist Engine',
    ogDesc:   'Sun. Waves. Good vibes. The ultimate summer soundtrack updated every 2 weeks.',
  },
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

// ── SEO content ─────────────────────────────────────────────────────
(function applySEO() {
  const seo = SEO_DATA[id];
  if (!seo) return;

  // Dynamic meta tags
  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute('content', val); };
  document.title = seo.ogTitle;
  setMeta('meta[name="description"]',         seo.ogDesc);
  setMeta('meta[property="og:title"]',        seo.ogTitle);
  setMeta('meta[property="og:description"]',  seo.ogDesc);
  setMeta('meta[name="twitter:title"]',       seo.ogTitle);
  setMeta('meta[name="twitter:description"]', seo.ogDesc);

  // Indexable hidden section
  const section = document.getElementById('seo-content');
  if (section) {
    section.style.display = 'block';
    const titleEl = document.getElementById('seo-title');
    const descEl  = document.getElementById('seo-desc');
    const kwEl    = document.getElementById('seo-keywords');
    if (titleEl) titleEl.textContent = seo.title;
    if (descEl)  descEl.textContent  = seo.desc;
    if (kwEl)    kwEl.textContent    = seo.keywords;
  }
})();

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

    // Inject embed with platform toggle if YouTube is available
    if (playlist.id) {
      const embedContainer = document.getElementById('detail-embed');
      const hasYouTube = !!playlist.youtubeId;
      const wrapper = document.createElement('div');

      if (hasYouTube) {
        const toggle = document.createElement('div');
        toggle.className = 'platform-toggle';
        toggle.innerHTML = `
          <button class="platform-btn active" data-p="spotify" onclick="switchDetailEmbed('spotify','${playlist.id}','${playlist.youtubeId}',this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            Spotify
          </button>
          <button class="platform-btn" data-p="youtube" onclick="switchDetailEmbed('youtube','${playlist.id}','${playlist.youtubeId}',this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z"/></svg>
            YouTube
          </button>`;
        wrapper.appendChild(toggle);
      }

      const iframe = document.createElement('iframe');
      iframe.id      = 'detail-embed-iframe';
      iframe.src     = `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0`;
      iframe.width   = '100%';
      iframe.height  = '500';
      iframe.allow   = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      iframe.style.borderRadius = '16px';
      wrapper.appendChild(iframe);

      embedContainer.innerHTML = '';
      embedContainer.appendChild(wrapper);

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

function switchDetailEmbed(platform, spotifyId, youtubeId, btn) {
  const iframe = document.getElementById('detail-embed-iframe');
  const openBtn = document.getElementById('detail-open-btn');
  btn.closest('.platform-toggle').querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (platform === 'spotify') {
    iframe.src = `https://open.spotify.com/embed/playlist/${spotifyId}?utm_source=generator&theme=0`;
    if (openBtn) { openBtn.textContent = 'Open in Spotify ↗'; openBtn.href = `https://open.spotify.com/playlist/${spotifyId}`; }
  } else {
    iframe.src = `https://www.youtube.com/embed/videoseries?list=${youtubeId}`;
    if (openBtn) { openBtn.textContent = 'Open in YouTube ↗'; openBtn.href = `https://www.youtube.com/playlist?list=${youtubeId}`; }
  }
}

loadData();
