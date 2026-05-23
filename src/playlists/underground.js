const spotify = require('../spotify/client');
const { resolveFeaturedTracks } = require('../utils/featured');

const PLAYLIST_NAME = 'The Slept On Underground';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `Rising artists. Hidden gems. The ones growing right now — updated ${date}. 🔥`;

const TARGET_COUNT = 20;

const UNDERGROUND_SEARCHES = [
  'underground hip hop 2025',
  'slept on rap 2024 2025',
  'rising rapper 2025',
  'underground r&b rising',
  'new hip hop wave underground',
  'indie rap unsigned 2025',
];

async function generate(previousTracks = []) {
  console.log('[Underground] Generating The Slept On Underground...');
  const featured = await resolveFeaturedTracks('underground');
  const pool = [...featured];

  // Rotating underground search queries
  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % UNDERGROUND_SEARCHES.length;
  const queries = [
    UNDERGROUND_SEARCHES[searchIdx % UNDERGROUND_SEARCHES.length],
    UNDERGROUND_SEARCHES[(searchIdx + 1) % UNDERGROUND_SEARCHES.length],
    UNDERGROUND_SEARCHES[(searchIdx + 2) % UNDERGROUND_SEARCHES.length],
    UNDERGROUND_SEARCHES[(searchIdx + 3) % UNDERGROUND_SEARCHES.length],
  ];

  for (const query of queries) {
    try {
      const results = await spotify.searchTracks(query, 10);
      pool.push(...results);
    } catch (e) {
      console.warn(`[Underground] Search "${query}" failed`);
    }
  }

  // Own artists slot
  const ownArtistNames = (process.env.OWN_ARTIST_NAMES || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  for (const name of ownArtistNames) {
    try {
      const tracks = await spotify.searchArtistTracks(name, 3);
      pool.unshift(...tracks);
    } catch (e) {
      console.warn(`[Underground] Own artist "${name}" failed`);
    }
  }

  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final = unique.slice(0, TARGET_COUNT);
  console.log(`[Underground] Selected ${final.length} tracks.`);
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
