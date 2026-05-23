const spotify = require('../spotify/client');

const PLAYLIST_NAME = 'Unstoppable Gaming';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `All genres. All levels. The soundtrack to your victories — updated ${date}. 🎮`;

const TARGET_COUNT = 20;

const GAMING_ARTISTS = [
  'TheFatRat',
  'Marshmello',
  'Alan Walker',
  'Imagine Dragons',
  'Two Steps From Hell',
  'Carpenter Brut',
  'Perturbator',
  'HOME',
  'Linkin Park',
  'Muse',
  'Madeon',
  'Porter Robinson',
  'Skrillex',
  'deadmau5',
  'EDEN',
];

const GAMING_SEARCHES = [
  'epic gaming music 2024',
  'gaming beats electronic',
  'game soundtrack intense',
  'gaming dubstep hype',
  'metal gaming epic',
  'lo-fi gaming chill beats',
  'fortnite music gaming',
  'anime gaming opening',
];

async function generate(previousTracks = []) {
  console.log('[Gaming] Generating Unstoppable Gaming...');
  const pool = [];

  // ── Step 1: Seed from previous top-performers ────────────────────────────────
  let seedTrackIds = [];
  let seedArtistIds = [];

  if (previousTracks.length >= 3) {
    const sorted = [...previousTracks].sort((a, b) => b.popularityGain - a.popularityGain);
    seedTrackIds = sorted.slice(0, 2).map(t => t.id).filter(Boolean);
    console.log(`[Gaming] Seeding from top tracks: ${sorted.slice(0, 2).map(t => t.name).join(', ')}`);
  }

  // ── Step 2: Top tracks from core gaming artists (rotating) ───────────────────
  const rotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % GAMING_ARTISTS.length;
  const rotated = [...GAMING_ARTISTS.slice(rotation), ...GAMING_ARTISTS.slice(0, rotation)].slice(0, 8);

  for (const name of rotated) {
    try {
      const artist = await spotify.searchArtist(name);
      if (!artist) continue;
      seedArtistIds.push(artist.id);
      const tracks = await spotify.getArtistTopTracks(artist.id);
      pool.push(...tracks.slice(0, 2));
    } catch (e) {
      console.warn(`[Gaming] Could not load artist: ${name}`);
    }
  }

  // ── Step 3: Multi-genre recommendations ─────────────────────────────────────
  const genreGroups = [
    { genres: ['electronic', 'edm'], label: 'EDM' },
    { genres: ['metal', 'hard-rock'], label: 'Metal' },
    { genres: ['hip-hop'], label: 'Hip-hop gaming' },
  ];

  for (const group of genreGroups) {
    try {
      const recs = await spotify.getRecommendations({
        seedArtists: seedArtistIds.slice(0, 1),
        seedTracks: seedTrackIds.slice(0, 1),
        seedGenres: group.genres.slice(0, 2),
        limit: 15,
        extra: { min_energy: 0.65, min_popularity: 35 },
      });
      pool.push(...recs);
    } catch (e) {
      console.warn(`[Gaming] Recommendations (${group.label}) failed:`, e.message);
    }
  }

  // ── Step 4: Keyword searches for gaming tracks ───────────────────────────────
  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % GAMING_SEARCHES.length;
  const searchBatch = [
    GAMING_SEARCHES[searchIdx % GAMING_SEARCHES.length],
    GAMING_SEARCHES[(searchIdx + 1) % GAMING_SEARCHES.length],
  ];

  for (const query of searchBatch) {
    try {
      const results = await spotify.searchTracks(query, 20);
      pool.push(...results.filter(t => t.popularity >= 30));
    } catch (e) {
      console.warn(`[Gaming] Search failed for "${query}":`, e.message);
    }
  }

  // ── Step 5: Dedupe, shuffle, pick 20 ────────────────────────────────────────
  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final = unique.slice(0, TARGET_COUNT);

  console.log(`[Gaming] Selected ${final.length} tracks.`);
  return {
    name: PLAYLIST_NAME,
    description: PLAYLIST_DESC_TEMPLATE(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })),
    tracks: final.map(t => ({
      uri: t.uri,
      id: t.id,
      name: t.name,
      artist: t.artists?.[0]?.name,
      popularity: t.popularity,
      popularityGain: 0,
    })),
  };
}

module.exports = { generate };
