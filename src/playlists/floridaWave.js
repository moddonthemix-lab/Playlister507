const spotify  = require('../spotify/client');
const FLORIDA_ARTISTS = require('../data/floridaArtists');
const { resolveFeaturedTracks } = require('../utils/featured');

const PLAYLIST_NAME = 'Fresh Florida Wave';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `Only Florida MCs. The hottest tracks from the Sunshine State — updated ${date}. 🌴`;

const TARGET_COUNT = 20;

async function generate(previousTracks = []) {
  console.log('[FloridaWave] Generating Fresh Florida Wave...');
  const featured = await resolveFeaturedTracks('floridaWave');
  const pool = [...featured];

  // Rotating subset of Florida artists — pull tracks only from confirmed FL artists
  // 14 artists × up to 3 tracks each = ~42 candidates → dedupe → pick 20
  const weekRotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % FLORIDA_ARTISTS.length;
  const rotatedArtists = [
    ...FLORIDA_ARTISTS.slice(weekRotation),
    ...FLORIDA_ARTISTS.slice(0, weekRotation),
  ].slice(0, 14);

  for (const name of rotatedArtists) {
    try {
      const tracks = await spotify.searchArtistTracks(name, 3);
      pool.push(...tracks);
    } catch (e) {
      console.warn(`[FloridaWave] Could not load artist: ${name}`);
    }
  }

  // Only keep tracks where the primary artist is a confirmed Florida artist
  const floridaSet = new Set(FLORIDA_ARTISTS.map(a => a.toLowerCase()));
  const floridaOnly = pool.filter(t => {
    const primary = (t.artists?.[0]?.name || '').toLowerCase();
    return floridaSet.has(primary);
  });

  // Dedupe by URI first, then by name+artist to catch alternate versions
  const byUri = spotify.dedupe(spotify.shuffle(floridaOnly));
  const seenSongs = new Set();
  const unique = byUri.filter(t => {
    const key = `${(t.artists?.[0]?.name || '').toLowerCase()}::${t.name.toLowerCase()}`;
    if (seenSongs.has(key)) return false;
    seenSongs.add(key);
    return true;
  });
  const final = unique.slice(0, TARGET_COUNT);
  console.log(`[FloridaWave] Selected ${final.length} tracks.`);
  return {
    name: PLAYLIST_NAME,
    description: PLAYLIST_DESC_TEMPLATE(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })),
    tracks: final.map(t => ({
      uri: t.uri, id: t.id, name: t.name,
      artist: t.artists?.[0]?.name,
      popularityGain: 0,
    })),
  };
}

module.exports = { generate };
