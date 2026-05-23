const fs   = require('fs');
const path = require('path');
const spotify = require('../spotify/client');

const FEATURED_PATH = path.join(__dirname, '..', '..', 'featured.json');

function getFeatured(playlistKey) {
  try {
    const data = JSON.parse(fs.readFileSync(FEATURED_PATH, 'utf-8'));
    return (data[playlistKey] || []).filter(Boolean);
  } catch {
    return [];
  }
}

// Resolves featured artist names → top tracks, guaranteed slots at front of pool
async function resolveFeaturedTracks(playlistKey) {
  const names = getFeatured(playlistKey);
  if (!names.length) return [];

  const tracks = [];
  for (const name of names) {
    try {
      const artist = await spotify.searchArtist(name);
      if (!artist) { console.warn(`[Featured] Artist not found: ${name}`); continue; }
      const top = await spotify.getArtistTopTracks(artist.id);
      tracks.push(...top.slice(0, 2));
      console.log(`[Featured] ✓ ${name} — added ${Math.min(2, top.length)} tracks`);
    } catch (e) {
      console.warn(`[Featured] Failed to load ${name}:`, e.message);
    }
  }
  return tracks;
}

module.exports = { getFeatured, resolveFeaturedTracks };
