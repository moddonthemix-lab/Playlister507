const spotify = require('../spotify/client');
const { resolveFeaturedTracks } = require('../utils/featured');

const PLAYLIST_NAME = 'LOCKED IN';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `Zero distractions. Pure focus. The study session you didn't know you needed — updated ${date}. 🎧`;

const TARGET_COUNT = 20;

const STUDY_ARTISTS = [
  // Lo-fi / jazz-hop legends
  'Nujabes',
  'J Dilla',
  'Knxwledge',
  'Idealism',
  'Philanthrope',
  // Ambient / instrumental
  'Nils Frahm',
  'Brian Eno',
  'Rival Consoles',
  'Hammock',
  'Explosions in the Sky',
  // Electronic / chillwave
  'Tycho',
  'Bonobo',
  'Com Truise',
  'Washed Out',
  'Flying Lotus',
  // Gems
  'Modd Origami',
  'Elijah Who',
  'Cozy Lofi',
  'Hior Chronik',
  'Olan',
];

const STUDY_SEARCHES = [
  'lofi hip hop study beats 2025',
  'deep focus instrumental music',
  'ambient study music no lyrics',
  'lo-fi chill beats concentration',
  'piano focus music study',
  'jazz hop study session',
  'dark academia music playlist',
  'minimal techno focus work',
  'binaural beats study focus',
  'cinematic ambient study music',
];

async function generate(previousTracks = []) {
  console.log('[Study] Generating LOCKED IN...');
  const featured = await resolveFeaturedTracks('study');
  const pool = [...featured];

  // Search tracks for core study artists (rotating)
  const rotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % STUDY_ARTISTS.length;
  const rotated = [...STUDY_ARTISTS.slice(rotation), ...STUDY_ARTISTS.slice(0, rotation)].slice(0, 8);

  for (const name of rotated) {
    try {
      const tracks = await spotify.searchArtistTracks(name, 3);
      pool.push(...tracks);
    } catch (e) {
      console.warn(`[Study] Could not load artist: ${name}`);
    }
  }

  // Rotating keyword searches
  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % STUDY_SEARCHES.length;
  const searchBatch = [
    STUDY_SEARCHES[searchIdx % STUDY_SEARCHES.length],
    STUDY_SEARCHES[(searchIdx + 1) % STUDY_SEARCHES.length],
    STUDY_SEARCHES[(searchIdx + 2) % STUDY_SEARCHES.length],
  ];
  for (const query of searchBatch) {
    try {
      const results = await spotify.searchTracks(query, 10);
      pool.push(...results);
    } catch (e) {
      console.warn(`[Study] Search failed for "${query}"`);
    }
  }

  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final = unique.slice(0, TARGET_COUNT);
  console.log(`[Study] Selected ${final.length} tracks.`);
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
