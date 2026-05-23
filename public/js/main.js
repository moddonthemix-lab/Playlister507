/* ═══════════════════════════════════════════════════════════════
   Playlister 507 — Main JS
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
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Load playlist data & inject Spotify embeds ──────────────────────
async function loadPlaylists() {
  try {
    const res = await fetch('/api/playlists');
    if (!res.ok) return;
    const data = await res.json();

    injectEmbed('embed-florida',    data.floridaWave,  'open-florida');
    injectEmbed('embed-gaming',     data.gaming,       'open-gaming');
    injectEmbed('embed-underground', data.underground, 'open-underground');
  } catch {
    // No server running — placeholders stay visible
  }
}

function injectEmbed(containerId, playlist, linkId) {
  if (!playlist?.id) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  const iframe = document.createElement('iframe');
  iframe.src = `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0`;
  iframe.width = '100%';
  iframe.height = '352';
  iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  iframe.loading = 'lazy';
  iframe.style.borderRadius = '16px';

  container.innerHTML = '';
  container.appendChild(iframe);

  const link = document.getElementById(linkId);
  if (link) link.href = `https://open.spotify.com/playlist/${playlist.id}`;
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
