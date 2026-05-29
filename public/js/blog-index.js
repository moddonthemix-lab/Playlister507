/* ═══════════════════════════════════════════════════════════════════
   PLAYLIST ENGINE — Blog Index Page Script
   Reads BLOG_POSTS from blog-data.js and renders card grid.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const BLOG_POSTS = window.BLOG_POSTS || [];

  function buildTagStyle(color) {
    return (
      `background:${hexToRgba(color, 0.15)};` +
      `border-color:${hexToRgba(color, 0.4)};` +
      `color:${color};`
    );
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function buildCard(post) {
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
  }

  function escHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render() {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;

    if (!BLOG_POSTS.length) {
      grid.innerHTML = '<div class="blog-loading">No posts yet — check back soon.</div>';
      return;
    }

    grid.innerHTML = BLOG_POSTS.map(buildCard).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
