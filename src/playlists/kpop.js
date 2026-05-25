const spotify = require('../spotify/client');
const { resolveFeaturedTracks } = require('../utils/featured');

const PLAYLIST_NAME = 'Ease In Kpop';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `K-pop, K-indie & Korean R&B done right. The smoothest hits and hidden gems updated ${date}. 🌸`;

const TARGET_COUNT = 20;

const KPOP_ARTISTS = [
  // Mainstream K-pop
  'NewJeans',
  'BTS',
  'BLACKPINK',
  'aespa',
  'IVE',
  'FIFTY FIFTY',
  'LE SSERAFIM',
  'TWICE',
  'Stray Kids',
  'TXT',
  // Cross-genre / global breakouts
  'Pink Pantheress',
  'MAMAMOO',
  'Red Velvet',
  'EXO',
  // K-indie / R&B gems
  'DPR LIVE',
  'DPR IAN',
  'pH-1',
  'Heize',
  'Dean',
  'Epik High',
];

const KPOP_SEARCHES = [
  'kpop hits 2025',
  'best kpop songs 2025',
  'kpop girl group banger 2025',
  'kpop boy group trending 2025',
  'k-indie viral 2025',
  'korean r&b smooth 2025',
  'kpop new release 2025',
  'kpop crossover pop 2025',
  'trending kpop playlist 2025',
  'kpop feel good summer 2025',
];

async function generate(previousTracks = []) {
  console.log('[Kpop] Generating Ease In Kpop...');
  const featured = await resolveFeaturedTracks('kpop');
  const pool = [...featured];

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
