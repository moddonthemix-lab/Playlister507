/* ── Playlist Engine — Template Studio ───────────────────────────── */

const PLAYLISTS = {
  floridaWave: {
    name: 'FRESH\nFLORIDA\nWAVE',
    nameShort: 'FRESH FLORIDA WAVE',
    tag: 'FLORIDA RAP',
    accent: '#FFD166',
    accent2: '#FF6B35',
    bg: ['#0a0500', '#1a0a00', '#0d1a2e', '#051020'],
    desc: 'The Sunshine State\'s finest. Only Florida MCs.',
  },
  gaming: {
    name: 'UNSTOPPABLE\nGAMING',
    nameShort: 'UNSTOPPABLE GAMING',
    tag: 'GAMING',
    accent: '#8B5CF6',
    accent2: '#06B6D4',
    bg: ['#050010', '#0a0020', '#000d1a', '#05001a'],
    desc: 'EDM, metal, trap, synthwave. Whatever hits hardest.',
  },
  kpop: {
    name: 'EASE IN\nKPOP',
    nameShort: 'EASE IN KPOP',
    tag: 'K-POP · K-INDIE',
    accent: '#FF69B4',
    accent2: '#C084FC',
    bg: ['#1a0014', '#2d0028', '#0d0020', '#1a001a'],
    desc: 'K-pop hits, K-indie gems, Korean R&B.',
  },
  underground: {
    name: 'THE SLEPT\nON\nUNDERGROUND',
    nameShort: 'THE SLEPT ON UNDERGROUND',
    tag: 'UNDERGROUND',
    accent: '#F5A623',
    accent2: '#FF3366',
    bg: ['#080300', '#120700', '#0a0200', '#060200'],
    desc: 'Rising artists. Trending before the world catches on.',
  },
  workout: {
    name: 'THE IRON\nHOUR',
    nameShort: 'THE IRON HOUR',
    tag: 'WORKOUT',
    accent: '#FF0080',
    accent2: '#FF6B35',
    bg: ['#0D0005', '#1a0008', '#0d0005', '#080000'],
    desc: 'High intensity. Every genre. Match your effort.',
  },
  study: {
    name: 'LOCKED\nIN',
    nameShort: 'LOCKED IN',
    tag: 'FOCUS · STUDY',
    accent: '#4A9EFF',
    accent2: '#8B5CF6',
    bg: ['#080810', '#0d0d1a', '#080810', '#050510'],
    desc: 'Instrumental. Ambient. Built for deep work.',
  },
  summer: {
    name: 'SEASONAL:\nSUMMER\nJAMS',
    nameShort: 'SEASONAL: SUMMER JAMS',
    tag: 'SUMMER VIBES',
    accent: '#FBBF24',
    accent2: '#F472B6',
    bg: ['#1a0a00', '#2d1500', '#1a0d00', '#0d0800'],
    desc: 'Feel-good summer hits. Pop, R&B, Afrobeats.',
  },
};

const canvas = document.getElementById('tmpl-canvas');
const ctx = canvas.getContext('2d');

let currentStyle = 'cover';
let currentW = 1080;
let currentH = 1080;

// ── Controls ─────────────────────────────────────────────────────────
document.querySelectorAll('.tmpl-style-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tmpl-style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStyle = btn.dataset.style;
  });
});

document.querySelectorAll('.tmpl-size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tmpl-size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentW = parseInt(btn.dataset.w);
    currentH = parseInt(btn.dataset.h);
    canvas.width = currentW;
    canvas.height = currentH;
  });
});

document.getElementById('render-btn').addEventListener('click', render);
document.getElementById('download-btn').addEventListener('click', download);

// Auto-render on any control change
['playlist-pick','custom-headline','custom-sub','custom-cta',
 'show-logo','show-stats','show-refresh','show-cta'].forEach(id => {
  document.getElementById(id).addEventListener('change', render);
  document.getElementById(id).addEventListener('input', render);
});

// ── Helpers ───────────────────────────────────────────────────────────
function hex2rgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

function drawNoise(opacity = 0.04) {
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.random() * 255;
    imageData.data[i] = v;
    imageData.data[i+1] = v;
    imageData.data[i+2] = v;
    imageData.data[i+3] = Math.random() * opacity * 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = test;
    }
  }
  lines.push(line.trim());
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length;
}

function drawBrandBadge(x, y, accent) {
  if (!document.getElementById('show-logo').checked) return;
  ctx.save();
  ctx.font = `700 ${Math.round(canvas.width * 0.018)}px 'Space Grotesk', sans-serif`;
  ctx.letterSpacing = '3px';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'left';
  ctx.fillText('PLAYLIST', x, y);
  const pw = ctx.measureText('PLAYLIST').width;
  ctx.fillStyle = accent;
  ctx.fillText('ENGINE', x + pw + 6, y);
  ctx.restore();
}

function drawTag(text, x, y, accent) {
  const pad = canvas.width * 0.018;
  const fontSize = canvas.width * 0.016;
  ctx.save();
  ctx.font = `600 ${fontSize}px 'Space Grotesk', sans-serif`;
  const tw = ctx.measureText(text).width;
  const rh = fontSize * 1.8;
  const rw = tw + pad * 2;

  // Pill background
  const rgb = hex2rgb(accent);
  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`;
  ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
  ctx.lineWidth = 1;
  const r = rh / 2;
  ctx.beginPath();
  ctx.roundRect(x, y - rh * 0.75, rw, rh, r);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.fillText(text, x + pad, y + rh * 0.25 - rh * 0.75 + fontSize * 0.75);
  ctx.restore();
}

// ── Background ────────────────────────────────────────────────────────
function drawBackground(pl) {
  const W = canvas.width, H = canvas.height;
  const rgb = hex2rgb(pl.accent);
  const rgb2 = hex2rgb(pl.accent2);

  // Base dark
  ctx.fillStyle = pl.bg[0];
  ctx.fillRect(0, 0, W, H);

  // Radial glow 1 (accent color, top right area)
  const g1 = ctx.createRadialGradient(W * 0.75, H * 0.25, 0, W * 0.75, H * 0.25, W * 0.7);
  g1.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`);
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  // Radial glow 2 (accent2, bottom left)
  const g2 = ctx.createRadialGradient(W * 0.2, H * 0.8, 0, W * 0.2, H * 0.8, W * 0.6);
  g2.addColorStop(0, `rgba(${rgb2.r},${rgb2.g},${rgb2.b},0.12)`);
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Bottom gradient overlay (for text legibility)
  const overlay = ctx.createLinearGradient(0, H * 0.4, 0, H);
  overlay.addColorStop(0, 'transparent');
  overlay.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // Noise grain
  drawNoise(0.035);
}

// ── Diagonal accent stripe ─────────────────────────────────────────────
function drawAccentStripe(pl) {
  const W = canvas.width, H = canvas.height;
  const rgb = hex2rgb(pl.accent);
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = pl.accent;
  ctx.beginPath();
  ctx.moveTo(W * 0.55, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W * 0.45, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── COVER ART template ────────────────────────────────────────────────
function renderCover(pl) {
  const W = canvas.width, H = canvas.height;
  const pad = W * 0.08;

  drawBackground(pl);
  drawAccentStripe(pl);

  // Top: brand + tag
  drawBrandBadge(pad, pad + W * 0.025, pl.accent);
  drawTag(pl.tag, pad, pad + W * 0.075, pl.accent);

  // Center: large playlist name
  const headline = document.getElementById('custom-headline').value || pl.name;
  const lines = headline.split('\n');
  const fontSize = lines.length > 2 ? W * 0.14 : W * 0.17;
  ctx.save();
  ctx.font = `normal ${fontSize}px 'Bebas Neue', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.shadowColor = `rgba(0,0,0,0.5)`;
  ctx.shadowBlur = 20;
  const totalH = lines.length * fontSize * 0.95;
  const startY = (H - totalH) / 2 + fontSize * 0.35;
  lines.forEach((line, i) => {
    // First word accent color
    const words = line.split(' ');
    let xOff = pad;
    words.forEach((word, wi) => {
      ctx.fillStyle = wi === 0 && i === 0 ? pl.accent : '#fff';
      ctx.fillText(word + (wi < words.length - 1 ? ' ' : ''), xOff, startY + i * fontSize * 0.95);
      xOff += ctx.measureText(word + ' ').width;
    });
  });
  ctx.restore();

  // Bottom bar
  const bottomY = H - pad;
  const sub = document.getElementById('custom-sub').value || pl.desc;

  // Divider line
  ctx.save();
  ctx.strokeStyle = pl.accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(pad, H - pad * 2.2);
  ctx.lineTo(W - pad, H - pad * 2.2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.font = `300 ${W * 0.022}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'left';
  ctx.fillText(sub, pad, H - pad * 1.6);

  // Stats row
  const stats = [];
  if (document.getElementById('show-stats').checked) stats.push('20 TRACKS');
  if (document.getElementById('show-refresh').checked) stats.push('BI-WEEKLY UPDATE');
  if (stats.length) {
    ctx.font = `600 ${W * 0.018}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = pl.accent;
    ctx.fillText(stats.join('  ·  '), pad, bottomY - W * 0.01);
  }

  // CTA
  if (document.getElementById('show-cta').checked) {
    const cta = document.getElementById('custom-cta').value || 'Follow on Spotify →';
    ctx.font = `500 ${W * 0.02}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(cta, W - pad, bottomY - W * 0.01);
  }
}

// ── PROMO POST template ───────────────────────────────────────────────
function renderPromo(pl) {
  const W = canvas.width, H = canvas.height;
  const pad = W * 0.08;

  drawBackground(pl);

  // Large accent number / visual element
  ctx.save();
  ctx.font = `normal ${W * 0.55}px 'Bebas Neue', sans-serif`;
  ctx.fillStyle = pl.accent;
  ctx.globalAlpha = 0.06;
  ctx.textAlign = 'center';
  ctx.fillText('PE', W / 2, H * 0.65);
  ctx.globalAlpha = 1;
  ctx.restore();

  // Top label
  const topLabel = document.getElementById('custom-headline').value || '🔥 NOW UPDATED';
  ctx.font = `700 ${W * 0.022}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = pl.accent;
  ctx.textAlign = 'left';
  ctx.fillText(topLabel.toUpperCase(), pad, pad + W * 0.04);

  // Playlist name — big
  const lines = pl.name.split('\n');
  const fontSize = W * 0.15;
  ctx.font = `normal ${fontSize}px 'Bebas Neue', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 16;
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, H * 0.35 + i * fontSize * 0.92);
  });
  ctx.shadowBlur = 0;

  // Description
  const sub = document.getElementById('custom-sub').value || pl.desc;
  ctx.font = `300 ${W * 0.026}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'left';
  wrapText(sub, pad, H * 0.72, W - pad * 2, W * 0.036);

  // Bottom: stats + CTA box
  const boxH = H * 0.14;
  const boxY = H - boxH - pad * 0.5;
  const rgb = hex2rgb(pl.accent);
  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`;
  ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(pad, boxY, W - pad * 2, boxH, 12);
  ctx.fill();
  ctx.stroke();

  const midBoxY = boxY + boxH / 2;

  if (document.getElementById('show-stats').checked) {
    ctx.font = `700 ${W * 0.045}px 'Bebas Neue', sans-serif`;
    ctx.fillStyle = pl.accent;
    ctx.textAlign = 'left';
    ctx.fillText('20', pad * 1.5, midBoxY + W * 0.018);
    ctx.font = `500 ${W * 0.016}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('TRACKS', pad * 1.5 + W * 0.075, midBoxY + W * 0.005);
  }

  if (document.getElementById('show-refresh').checked) {
    ctx.font = `700 ${W * 0.045}px 'Bebas Neue', sans-serif`;
    ctx.fillStyle = pl.accent;
    ctx.textAlign = 'center';
    ctx.fillText('2WK', W / 2, midBoxY + W * 0.018);
    ctx.font = `500 ${W * 0.016}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('REFRESH', W / 2, midBoxY + W * 0.038);
  }

  if (document.getElementById('show-cta').checked) {
    const cta = document.getElementById('custom-cta').value || 'Follow on Spotify →';
    ctx.font = `600 ${W * 0.02}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = pl.accent;
    ctx.textAlign = 'right';
    ctx.fillText(cta, W - pad * 1.5, midBoxY + W * 0.01);
  }

  drawBrandBadge(pad, H - pad * 0.3, pl.accent);
}

// ── STORY template ────────────────────────────────────────────────────
function renderStory(pl) {
  const W = canvas.width, H = canvas.height;
  const pad = W * 0.1;

  drawBackground(pl);

  // Top: brand
  drawBrandBadge(pad, pad + W * 0.04, pl.accent);

  // Middle: HUGE name
  const headline = document.getElementById('custom-headline').value || pl.name;
  const lines = headline.split('\n');
  const fontSize = W * 0.2;
  ctx.save();
  ctx.font = `normal ${fontSize}px 'Bebas Neue', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 24;
  const totalH = lines.length * fontSize * 0.92;
  const startY = (H / 2) - (totalH / 2) + fontSize * 0.4;
  lines.forEach((line, i) => {
    const words = line.split(' ');
    let xOff = pad;
    words.forEach((word, wi) => {
      ctx.fillStyle = wi === 0 && i === 0 ? pl.accent : '#fff';
      ctx.fillText(word + ' ', xOff, startY + i * fontSize * 0.92);
      xOff += ctx.measureText(word + ' ').width;
    });
  });
  ctx.restore();

  // Genre tag
  drawTag(pl.tag, pad, H / 2 + totalH / 2 + W * 0.06, pl.accent);

  // Bottom CTA
  if (document.getElementById('show-cta').checked) {
    const cta = document.getElementById('custom-cta').value || 'Follow on Spotify →';
    const boxW = W * 0.8;
    const boxX = (W - boxW) / 2;
    const boxY = H - pad * 2.5;
    const boxHt = W * 0.13;

    ctx.fillStyle = pl.accent;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxHt, boxHt / 2);
    ctx.fill();

    ctx.font = `700 ${W * 0.05}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(cta, W / 2, boxY + boxHt * 0.65);
  }

  // playlistengine.com watermark
  ctx.font = `400 ${W * 0.03}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.textAlign = 'center';
  ctx.fillText('playlistengine.com', W / 2, H - pad * 0.8);
}

// ── NEW DROP / ANNOUNCE template ───────────────────────────────────────
function renderAnnounce(pl) {
  const W = canvas.width, H = canvas.height;
  const pad = W * 0.08;

  drawBackground(pl);

  // Left accent bar
  const rgb = hex2rgb(pl.accent);
  ctx.fillStyle = pl.accent;
  ctx.fillRect(0, 0, W * 0.006, H);

  // "NEW DROP" stamp
  ctx.save();
  ctx.font = `normal ${W * 0.12}px 'Bebas Neue', sans-serif`;
  ctx.fillStyle = pl.accent;
  ctx.globalAlpha = 0.08;
  ctx.textAlign = 'center';
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.25);
  ctx.fillText('NEW DROP', 0, 0);
  ctx.globalAlpha = 1;
  ctx.restore();

  // Top eyebrow
  const topLabel = document.getElementById('custom-headline').value || 'NEW TRACKS ADDED';
  ctx.font = `700 ${W * 0.028}px 'Bebas Neue', sans-serif`;
  ctx.fillStyle = pl.accent;
  ctx.textAlign = 'left';
  ctx.letterSpacing = '4px';
  ctx.fillText('— ' + topLabel + ' —', pad, H * 0.22);

  // Playlist name
  const lines = pl.name.split('\n');
  const fontSize = lines.length > 2 ? W * 0.13 : W * 0.16;
  ctx.font = `normal ${fontSize}px 'Bebas Neue', sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, H * 0.3 + i * fontSize * 0.92);
  });
  ctx.shadowBlur = 0;

  // Horizontal rule
  ctx.strokeStyle = pl.accent;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(pad, H * 0.65);
  ctx.lineTo(W - pad, H * 0.65);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Sub description
  const sub = document.getElementById('custom-sub').value || pl.desc;
  ctx.font = `300 ${W * 0.028}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'left';
  wrapText(sub, pad, H * 0.72, W - pad * 2, W * 0.04);

  // Bottom
  const stats = [];
  if (document.getElementById('show-stats').checked) stats.push('20 TRACKS');
  if (document.getElementById('show-refresh').checked) stats.push('UPDATED BI-WEEKLY');

  ctx.font = `600 ${W * 0.022}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = pl.accent;
  ctx.textAlign = 'left';
  ctx.fillText(stats.join('  ·  '), pad, H - pad * 1.5);

  if (document.getElementById('show-cta').checked) {
    const cta = document.getElementById('custom-cta').value || 'Follow on Spotify →';
    ctx.font = `500 ${W * 0.022}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'right';
    ctx.fillText(cta, W - pad, H - pad * 1.5);
  }

  drawBrandBadge(pad, H - pad * 0.5, pl.accent);
}

// ── Main render dispatcher ─────────────────────────────────────────────
function render() {
  canvas.width = currentW;
  canvas.height = currentH;

  const key = document.getElementById('playlist-pick').value;
  const pl = PLAYLISTS[key];

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (currentStyle) {
    case 'cover':    renderCover(pl);    break;
    case 'promo':    renderPromo(pl);    break;
    case 'story':    renderStory(pl);    break;
    case 'announce': renderAnnounce(pl); break;
  }
}

// ── Download ───────────────────────────────────────────────────────────
function download() {
  const key = document.getElementById('playlist-pick').value;
  const pl = PLAYLISTS[key];
  const link = document.createElement('a');
  link.download = `playlist-engine-${key}-${currentStyle}-${currentW}x${currentH}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Initial render
render();
