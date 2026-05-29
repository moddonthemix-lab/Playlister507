/* ═══════════════════════════════════════════════════════════════════
   PLAYLIST ENGINE — Blog Post Page Script
   Reads ?slug= from URL, finds matching post in BLOG_POSTS,
   renders the full post layout and injects SEO meta/schema.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const BLOG_POSTS = window.BLOG_POSTS || [];

  /* ── Helpers ───────────────────────────────────────────────────── */
  function escHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hexToRgba(hex, alpha) {
    const h = (hex || '#ffffff').replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function buildTagStyle(color) {
    return (
      `background:${hexToRgba(color, 0.15)};` +
      `border-color:${hexToRgba(color, 0.4)};` +
      `color:${color};`
    );
  }

  /* ── Get slug from URL ─────────────────────────────────────────── */
  function getSlug() {
    // Support both /blog/:slug (server route) and ?slug= (direct file)
    const params = new URLSearchParams(window.location.search);
    if (params.get('slug')) return params.get('slug');
    // Extract from pathname: /blog/some-slug
    const parts = window.location.pathname.split('/');
    const blogIdx = parts.indexOf('blog');
    if (blogIdx !== -1 && parts[blogIdx + 1]) {
      return decodeURIComponent(parts[blogIdx + 1]);
    }
    return null;
  }

  /* ── SEO injection ─────────────────────────────────────────────── */
  function injectSEO(post) {
    document.title = `${post.title} — Playlist Engine`;

    setMeta('name', 'description', post.metaDesc);
    setMeta('property', 'og:title', `${post.title} — Playlist Engine`);
    setMeta('property', 'og:description', post.metaDesc);
    setMeta('property', 'og:url', `https://playlistengine.com/blog/${post.slug}`);
    setMeta('name', 'twitter:title', `${post.title} — Playlist Engine`);
    setMeta('name', 'twitter:description', post.metaDesc);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `https://playlistengine.com/blog/${post.slug}`;

    // Article schema
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.metaDesc,
      datePublished: post.date,
      publisher: {
        '@type': 'Organization',
        name: 'Playlist Engine',
        url: 'https://playlistengine.com',
      },
    };
    const schemaTag = document.createElement('script');
    schemaTag.type = 'application/ld+json';
    schemaTag.textContent = JSON.stringify(schema);
    document.head.appendChild(schemaTag);
  }

  function setMeta(attr, name, content) {
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  /* ── Render post hero ──────────────────────────────────────────── */
  function renderHero(post) {
    const hero = document.getElementById('post-hero');
    const bg = document.getElementById('post-hero-bg');
    if (!hero) return;

    // Themed radial gradient behind post using tagColor
    if (bg) {
      bg.style.background = `radial-gradient(ellipse at 50% 60%, ${hexToRgba(post.tagColor || '#ffffff', 0.12)} 0%, transparent 65%)`;
    }

    const tagStyle = buildTagStyle(post.tagColor || '#ffffff');

    hero.insertAdjacentHTML('beforeend', `
      <div class="post-hero__eyebrow">
        <span class="blog-tag" style="${tagStyle}">${escHtml(post.tag)}</span>
        <span class="post-hero__date-wrap">
          <span>${escHtml(post.date)}</span>
          <span class="post-hero__meta-sep"></span>
          <span>${escHtml(post.readTime)}</span>
        </span>
      </div>
      <h1 class="post-hero__title">${escHtml(post.title)}</h1>
    `);
  }

  /* ── Render post body ──────────────────────────────────────────── */
  function renderBody(post) {
    const body = document.getElementById('post-body');
    if (!body) return;

    let html = '';

    // Intro paragraph
    if (post.intro) {
      html += `<p>${escHtml(post.intro)}</p>`;
    }

    // Sections
    if (Array.isArray(post.sections)) {
      post.sections.forEach(function (section) {
        if (section.heading) {
          html += `<h2>${escHtml(section.heading)}</h2>`;
        }
        if (Array.isArray(section.paragraphs)) {
          section.paragraphs.forEach(function (p) {
            html += `<p>${escHtml(p)}</p>`;
          });
        } else if (typeof section.body === 'string') {
          html += `<p>${escHtml(section.body)}</p>`;
        }
      });
    }

    body.innerHTML = html;
  }

  /* ── Render Spotify embed ──────────────────────────────────────── */
  function renderEmbed(post) {
    if (!post.spotifyId) return;

    const section = document.getElementById('post-embed-section');
    const wrap = document.getElementById('post-embed-wrap');
    if (!section || !wrap) return;

    wrap.innerHTML = `
      <iframe
        src="https://open.spotify.com/embed/playlist/${encodeURIComponent(post.spotifyId)}?theme=0"
        width="100%"
        height="380"
        frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="${escHtml(post.title)} on Spotify"
      ></iframe>
    `;
    section.style.display = '';
  }

  /* ── Render CTA button ─────────────────────────────────────────── */
  function renderCTA(post) {
    if (!post.spotifyId) return;

    const section = document.getElementById('post-cta-section');
    const wrap = document.getElementById('post-cta-wrap');
    if (!section || !wrap) return;

    wrap.innerHTML = `
      <a
        class="post-cta-btn"
        href="https://open.spotify.com/playlist/${encodeURIComponent(post.spotifyId)}"
        target="_blank"
        rel="noopener"
      >Follow on Spotify →</a>
    `;
    section.style.display = '';
  }

  /* ── Render "More from the blog" ───────────────────────────────── */
  function renderMore(currentPost) {
    const section = document.getElementById('post-more');
    const grid = document.getElementById('post-more-grid');
    if (!section || !grid) return;

    const others = BLOG_POSTS.filter(function (p) {
      return p.slug !== currentPost.slug;
    }).slice(0, 3);

    if (!others.length) return;

    grid.innerHTML = others.map(function (post) {
      const tagStyle = buildTagStyle(post.tagColor || '#ffffff');
      return `
        <a class="blog-card" href="/blog/${encodeURIComponent(post.slug)}">
          <div>
            <span class="blog-tag" style="${tagStyle}">${escHtml(post.tag)}</span>
          </div>
          <p class="blog-card__title">${escHtml(post.title)}</p>
          <p class="blog-card__excerpt">${escHtml(post.metaDesc)}</p>
          <div class="blog-card__footer">
            <div class="blog-card__meta">
              <span>${escHtml(post.date)}</span>
              <span class="blog-card__meta-sep"></span>
              <span>${escHtml(post.readTime)}</span>
            </div>
            <span class="blog-card__read">Read →</span>
          </div>
        </a>
      `;
    }).join('');

    section.style.display = '';
  }

  /* ── Render not-found state ────────────────────────────────────── */
  function renderNotFound(slug) {
    const hero = document.getElementById('post-hero');
    const body = document.getElementById('post-body');
    if (hero) {
      hero.insertAdjacentHTML('beforeend', `
        <div class="post-not-found">
          <h1>404</h1>
          <p>Post "${escHtml(slug || '')}" not found.</p>
          <a href="/blog" class="post-cta-btn" style="margin-top:8px">← Back to Blog</a>
        </div>
      `);
    }
    if (body) body.style.display = 'none';
  }

  /* ── Main init ─────────────────────────────────────────────────── */
  function init() {
    const slug = getSlug();

    if (!slug) {
      renderNotFound(null);
      return;
    }

    const post = BLOG_POSTS.find(function (p) {
      return p.slug === slug;
    });

    if (!post) {
      renderNotFound(slug);
      return;
    }

    injectSEO(post);
    renderHero(post);
    renderBody(post);
    renderEmbed(post);
    renderCTA(post);
    renderMore(post);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
