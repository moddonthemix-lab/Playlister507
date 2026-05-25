const spotify = require('../spotify/client');
const { resolveFeaturedTracks } = require('../utils/featured');

const PLAYLIST_NAME = 'Unstoppable Gaming';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `All genres. All levels. The soundtrack to your victories — updated ${date}. 🎮`;

const TARGET_COUNT = 20;

const GAMING_ARTISTS = [
  // Electronic / EDM staples
  'TheFatRat',
  'Marshmello',
  'Alan Walker',
  'Porter Robinson',
  'Madeon',
  'Skrillex',
  'Virtual Riot',
  'Pegboard Nerds',
  // Harder / synthwave edge
  'Carpenter Brut',
  'Perturbator',
  'Rezz',
  'Camellia',
  'Savant',
  // Rock / cinematic
  'Imagine Dragons',
  'Two Steps From Hell',
  'Linkin Park',
  'Muse',
  // Hidden gems
  'Bossfight',
  'Nitro Fun',
  'EDEN',
];

const GAMING_SEARCHES = [
  'epic gaming music 2025',
  'high energy gaming beats 2025',
  'gaming electronic hype',
  'game soundtrack intense orchestral',
  'dubstep gaming drop 2025',
  'synthwave gaming neon',
  'hard bass gaming music',
  'speed metal gaming',
  'phonk gaming drift 2025',
  'competitive gaming music playlist',
];

async function generate(previousTracks = []) {
  console.log('[Gaming] Generating Unstoppable Gaming...');
  const featured = await resolveFeaturedTracks('gaming');
  const pool = [...featured];

  // Search tracks for core gaming artists (rotating)
  const rotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % GAMING_ARTISTS.length;
  const rotated = [...GAMING_ARTISTS.slice(rotation), ...GAMING_ARTISTS.slice(0, rotation)].slice(0, 8);

  for (const name of rotated) {
    try {
      const tracks = await spotify.searchArtistTracks(name, 3);
      pool.push(...tracks);
    } catch (e) {
      console.warn(`[Gaming] Could not load artist: ${name}`);
    }
  }

  // Rotating keyword searches
  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % GAMING_SEARCHES.length;
  const searchBatch = [
    GAMING_SEARCHES[searchIdx % GAMING_SEARCHES.length],
    GAMING_SEARCHES[(searchIdx + 1) % GAMING_SEARCHES.length],
    GAMING_SEARCHES[(searchIdx + 2) % GAMING_SEARCHES.length],
  ];
  for (const query of searchBatch) {
    try {
      const results = await spotify.searchTracks(query, 10);
      pool.push(...results);
    } catch (e) {
      console.warn(`[Gaming] Search failed for "${query}"`);
    }
  }

  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final = unique.slice(0, TARGET_COUNT);
  console.log(`[Gaming] Selected ${final.length} tracks.`);
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
