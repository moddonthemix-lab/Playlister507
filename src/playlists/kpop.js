const spotify = require('../spotify/client');
const { resolveFeaturedTracks } = require('../utils/featured');

const PLAYLIST_NAME = 'Ease In Kpop';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `K-pop done right. NewJeans, 4th gen girl groups, K-R&B, and the smooth Korean tracks that actually hit. Updated ${date}. 🌸`;

const TARGET_COUNT = 25;

// NewJeans is the anchor — always gets 5 tracks, pulled separately
const NEWJEANS_ANCHOR = 'NewJeans';

const KPOP_ARTISTS = [
  // 4th gen girl groups
  'IVE',
  'aespa',
  'LE SSERAFIM',
  'FIFTY FIFTY',
  'MAMAMOO+',
  'BABYMONSTER',
  'KISS OF LIFE',
  'tripleS',
  'Kep1er',
  'STAYC',
  'Brave Girls',
  'Apink',
  // Korean R&B / indie
  'Heize',
  'Dean',
  'Crush',
  'pH-1',
  'OFFONOFF',
  'Lim Young Woong',
  'The Rose',
  'DAY6',
];

const KPOP_SEARCHES = [
  'NewJeans hype boy attention',
  'NewJeans OMG get up',
  '4th gen kpop girl group hits 2025',
  'korean R&B chill 2025',
  'kpop ease in playlist 2025',
  'korean indie pop 2025',
  'KISS OF LIFE kpop retro',
  'IVE After LIKE Eleven',
  'STAYC kpop smooth',
  'kpop viral trending 2025',
];

async function generate(previousTracks = []) {
  console.log('[Kpop] Generating Ease In Kpop...');
  const featured = await resolveFeaturedTracks('kpop');
  const pool = [...featured];

  // NewJeans always gets 5 tracks as the anchor
  try {
    const newjeansTracks = await spotify.searchArtistTracks(NEWJEANS_ANCHOR, 5);
    pool.push(...newjeansTracks);
  } catch (e) {
    console.warn(`[Kpop] Could not load anchor artist: ${NEWJEANS_ANCHOR}`);
  }

  // Rotate through the rest of the artist list
  const rotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % KPOP_ARTISTS.length;
  const rotated = [...KPOP_ARTISTS.slice(rotation), ...KPOP_ARTISTS.slice(0, rotation)].slice(0, 8);

  for (const name of rotated) {
    try {
      const tracks = await spotify.searchArtistTracks(name, 3);
      pool.push(...tracks);
    } catch (e) {
      console.warn(`[Kpop] Could not load artist: ${name}`);
    }
  }

  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % KPOP_SEARCHES.length;
  const searchBatch = [
    KPOP_SEARCHES[searchIdx % KPOP_SEARCHES.length],
    KPOP_SEARCHES[(searchIdx + 1) % KPOP_SEARCHES.length],
    KPOP_SEARCHES[(searchIdx + 2) % KPOP_SEARCHES.length],
  ];
  for (const query of searchBatch) {
    try {
      const results = await spotify.searchTracks(query, 10);
      pool.push(...results);
    } catch (e) {
      console.warn(`[Kpop] Search failed for "${query}"`);
    }
  }

  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final  = unique.slice(0, TARGET_COUNT);
  console.log(`[Kpop] Selected ${final.length} tracks.`);
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
