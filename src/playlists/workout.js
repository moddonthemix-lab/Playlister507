const spotify = require('../spotify/client');
const { resolveFeaturedTracks } = require('../utils/featured');

const PLAYLIST_NAME = 'THE IRON HOUR';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `High-intensity. All genres. The only playlist that matches your effort — updated ${date}. 💪`;

const TARGET_COUNT = 20;

const WORKOUT_ARTISTS = [
  'Eminem',
  'Kendrick Lamar',
  'Travis Scott',
  'Kanye West',
  'Jay-Z',
  'Lil Wayne',
  'TheFatRat',
  'Alan Walker',
  'Imagine Dragons',
  'Linkin Park',
  'Metallica',
  'Rage Against the Machine',
  'AC/DC',
  'Skrillex',
  'Marshmello',
];

const WORKOUT_SEARCHES = [
  'gym motivation hip hop 2025',
  'workout hype electronic',
  'training hard beats 2025',
  'high energy workout music',
  'gym rap motivation',
  'intense workout electronic 2025',
  'beast mode music',
  'lifting music heavy',
];

async function generate(previousTracks = []) {
  console.log('[Workout] Generating THE IRON HOUR...');
  const featured = await resolveFeaturedTracks('workout');
  const pool = [...featured];

  // Search tracks for core workout artists (rotating)
  const rotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % WORKOUT_ARTISTS.length;
  const rotated = [...WORKOUT_ARTISTS.slice(rotation), ...WORKOUT_ARTISTS.slice(0, rotation)].slice(0, 8);

  for (const name of rotated) {
    try {
      const tracks = await spotify.searchArtistTracks(name, 3);
      pool.push(...tracks);
    } catch (e) {
      console.warn(`[Workout] Could not load artist: ${name}`);
    }
  }

  // Rotating keyword searches
  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % WORKOUT_SEARCHES.length;
  const searchBatch = [
    WORKOUT_SEARCHES[searchIdx % WORKOUT_SEARCHES.length],
    WORKOUT_SEARCHES[(searchIdx + 1) % WORKOUT_SEARCHES.length],
    WORKOUT_SEARCHES[(searchIdx + 2) % WORKOUT_SEARCHES.length],
  ];
  for (const query of searchBatch) {
    try {
      const results = await spotify.searchTracks(query, 10);
      pool.push(...results);
    } catch (e) {
      console.warn(`[Workout] Search failed for "${query}"`);
    }
  }

  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final = unique.slice(0, TARGET_COUNT);
  console.log(`[Workout] Selected ${final.length} tracks.`);
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
