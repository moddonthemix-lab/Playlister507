/* ═══════════════════════════════════════════════════════════════
   Playlist Engine — Main JS
   ═══════════════════════════════════════════════════════════════ */

// ── Custom cursor ───────────────────────────────────────────────────
const cursor    = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');

if (cursor && cursorDot) {
  let mx = 0, my = 0;
  let cx = 0, cy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursorDot.style.transform = `translate(${mx - 2.5}px, ${my - 2.5}px)`;
  });

  // Smooth-follow for outer ring
  (function animateCursor() {
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;
    cursor.style.transform = `translate(${cx - 20}px, ${cy - 20}px)`;
    requestAnimationFrame(animateCursor);
  })();

  // Expand cursor on interactive elements
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width  = '60px';
      cursor.style.height = '60px';
      cursor.style.borderColor = 'rgba(255,255,255,0.8)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width  = '40px';
      cursor.style.height = '40px';
      cursor.style.borderColor = 'rgba(255,255,255,0.5)';
    });
  });
}

// ── Nav scroll state ────────────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Mobile menu ─────────────────────────────────────────────────────
const mobileMenu  = document.getElementById('mobileMenu');
const hamburger   = document.getElementById('hamburger');

function toggleMobileMenu() {
  const open = mobileMenu?.classList.toggle('open');
  hamburger?.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
function closeMobileMenu() {
  mobileMenu?.classList.remove('open');
  hamburger?.classList.remove('open');
  document.body.style.overflow = '';
}
// Close on outside tap
mobileMenu?.addEventListener('click', e => {
  if (e.target === mobileMenu) closeMobileMenu();
});

// ── Scroll reveal ───────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  }),
  { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
);

document.querySelectorAll('.reveal').forEach(el => {
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    el.classList.add('visible');
  } else {
    revealObserver.observe(el);
  }
});

// Safety net: if anything is still hidden after 1.5s, force-reveal it
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => el.classList.add('visible'));
}, 1500);

// ── Load playlist data & inject Spotify embeds ──────────────────────
async function loadPlaylists() {
  try {
    const res = await fetch('/api/playlists');
    if (!res.ok) return;
    const data = await res.json();

    injectEmbed('embed-florida',    data.floridaWave,  'open-florida');
    injectEmbed('embed-gaming',     data.gaming,       'open-gaming');
    injectEmbed('embed-underground', data.underground, 'open-underground');
    injectEmbed('embed-workout', data.workout, 'open-workout');
    injectEmbed('embed-study',   data.study,   'open-study');
    injectEmbed('embed-summer',  data.summer,  'open-summer');
    injectEmbed('embed-kpop',    data.kpop,    'open-kpop');
  } catch {
    // No server running — placeholders stay visible
  }
}

function injectEmbed(containerId, playlist, linkId) {
  if (!playlist?.id) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  const hasYouTube = !!playlist.youtubeId;
  const wrapper = document.createElement('div');

  if (hasYouTube) {
    const toggle = document.createElement('div');
    toggle.className = 'platform-toggle';
    toggle.innerHTML = `
      <button class="platform-btn active" data-p="spotify" onclick="switchEmbed('${containerId}','spotify','${playlist.id}','${playlist.youtubeId}','${linkId}',this)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        Spotify
      </button>
      <button class="platform-btn" data-p="youtube" onclick="switchEmbed('${containerId}','youtube','${playlist.id}','${playlist.youtubeId}','${linkId}',this)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z"/></svg>
        YouTube
      </button>`;
    wrapper.appendChild(toggle);
  }

  const iframe = document.createElement('iframe');
  iframe.id = `iframe-${containerId}`;
  iframe.src = `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0`;
  iframe.width = '100%';
  iframe.height = '232';
  iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  iframe.loading = 'lazy';
  iframe.style.borderRadius = '16px';
  wrapper.appendChild(iframe);

  container.innerHTML = '';
  container.appendChild(wrapper);

  const link = document.getElementById(linkId);
  if (link) link.href = `https://open.spotify.com/playlist/${playlist.id}`;
}

function switchEmbed(containerId, platform, spotifyId, youtubeId, linkId, btn) {
  const iframe = document.getElementById(`iframe-${containerId}`);
  const link   = document.getElementById(linkId);
  btn.closest('.platform-toggle').querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (platform === 'spotify') {
    iframe.src = `https://open.spotify.com/embed/playlist/${spotifyId}?utm_source=generator&theme=0`;
    if (link) link.href = `https://open.spotify.com/playlist/${spotifyId}`;
  } else {
    iframe.src = `https://www.youtube.com/embed/videoseries?list=${youtubeId}`;
    if (link) link.href = `https://www.youtube.com/playlist?list=${youtubeId}`;
  }
}

loadPlaylists();

// ── Smooth parallax on playlist section backgrounds ─────────────────
const parallaxSections = document.querySelectorAll('.pl-section');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  parallaxSections.forEach(section => {
    const rect   = section.getBoundingClientRect();
    const center = rect.top + rect.height / 2 - window.innerHeight / 2;
    const bg     = section.querySelector('.pl-section__bg');
    if (bg) bg.style.transform = `translateY(${center * 0.08}px)`;
  });
}, { passive: true });
