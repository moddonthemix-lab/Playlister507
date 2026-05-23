const spotify = require('../spotify/client');
const { resolveFeaturedTracks } = require('../utils/featured');

const PLAYLIST_NAME = 'COASTAL HEAT';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `Sun. Waves. Good vibes only. The soundtrack to your summer — updated ${date}. ☀️`;

const TARGET_COUNT = 20;

const SUMMER_ARTISTS = [
  'Drake',
  'Post Malone',
  'Bad Bunny',
  'Tyler the Creator',
  'Frank Ocean',
  'SZA',
  'Doja Cat',
  'Harry Styles',
  'Dua Lipa',
  'The Weeknd',
  'Rihanna',
  'Beyoncé',
  'Pharrell Williams',
  'Kendrick Lamar',
  'Jack Johnson',
];

const SUMMER_SEARCHES = [
  'summer hits 2025',
  'summer vibes hip hop',
  'beach party music 2025',
  'summer anthem R&B 2025',
  'hot summer pop 2025',
  'summer reggaeton 2025',
  'carefree summer music',
  'good vibes summer playlist',
];

async function generate(previousTracks = []) {
  console.log('[Summer] Generating COASTAL HEAT...');
  const featured = await resolveFeaturedTracks('summer');
  const pool = [...featured];

  // Search tracks for core summer artists (rotating)
  const rotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % SUMMER_ARTISTS.length;
  const rotated = [...SUMMER_ARTISTS.slice(rotation), ...SUMMER_ARTISTS.slice(0, rotation)].slice(0, 8);

  for (const name of rotated) {
    try {
      const tracks = await spotify.searchArtistTracks(name, 3);
      pool.push(...tracks);
    } catch (e) {
      console.warn(`[Summer] Could not load artist: ${name}`);
    }
  }

  // Rotating keyword searches
  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % SUMMER_SEARCHES.length;
  const searchBatch = [
    SUMMER_SEARCHES[searchIdx % SUMMER_SEARCHES.length],
    SUMMER_SEARCHES[(searchIdx + 1) % SUMMER_SEARCHES.length],
    SUMMER_SEARCHES[(searchIdx + 2) % SUMMER_SEARCHES.length],
  ];
  for (const query of searchBatch) {
    try {
      const results = await spotify.searchTracks(query, 10);
      pool.push(...results);
    } catch (e) {
      console.warn(`[Summer] Search failed for "${query}"`);
    }
  }

  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final = unique.slice(0, TARGET_COUNT);
  console.log(`[Summer] Selected ${final.length} tracks.`);
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
