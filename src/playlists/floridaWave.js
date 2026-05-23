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

  // Rotating subset of Florida artists — search for their tracks directly
  const weekRotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % FLORIDA_ARTISTS.length;
  const rotatedArtists = [
    ...FLORIDA_ARTISTS.slice(weekRotation),
    ...FLORIDA_ARTISTS.slice(0, weekRotation),
  ].slice(0, 10);

  for (const name of rotatedArtists) {
    try {
      const tracks = await spotify.searchArtistTracks(name, 3);
      pool.push(...tracks);
    } catch (e) {
      console.warn(`[FloridaWave] Could not load artist: ${name}`);
    }
  }

  // Genre + keyword searches to fill the pool
  const searches = [
    'florida rap 2025',
    'miami hip hop',
    'florida drill 2025',
    'sunshine state rap',
  ];
  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % searches.length;
  for (const q of [searches[searchIdx % searches.length], searches[(searchIdx + 1) % searches.length]]) {
    try {
      const results = await spotify.searchTracks(q, 10);
      pool.push(...results);
    } catch (e) {
      console.warn(`[FloridaWave] Search failed: ${q}`);
    }
  }

  const unique = spotify.dedupe(spotify.shuffle(pool));
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
