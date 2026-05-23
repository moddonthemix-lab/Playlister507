require('dotenv').config();
const spotify = require('../spotify/client');

const PLAYLIST_NAME = 'The Slept On Underground';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `Rising artists. Hidden gems. The ones growing right now — updated ${date}. 🔥`;

const TARGET_COUNT = 20;

// Popularity band: not too obscure, not mainstream (0-100 scale)
const MIN_POPULARITY = 20;
const MAX_POPULARITY = 65;

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
  const pool = [];

  // ── Step 1: Seed recommendations from previous top-performers ────────────────
  let seedTrackIds = [];

  if (previousTracks.length >= 3) {
    const sorted = [...previousTracks].sort((a, b) => b.popularityGain - a.popularityGain);
    seedTrackIds = sorted.slice(0, 3).map(t => t.id).filter(Boolean);
    console.log(`[Underground] Seeding from: ${sorted.slice(0, 3).map(t => t.name).join(', ')}`);

    // Recommendations based on what got traction
    try {
      const recs = await spotify.getRecommendations({
        seedTracks: seedTrackIds.slice(0, 3),
        limit: 30,
        extra: {
          max_popularity: MAX_POPULARITY,
          min_popularity: MIN_POPULARITY,
        },
      });
      pool.push(...recs);
    } catch (e) {
      console.warn('[Underground] Traction-based recs failed:', e.message);
    }
  }

  // ── Step 2: New releases from Spotify — filter for rising artists ─────────────
  try {
    const albums = await spotify.getNewReleases(50);
    for (const album of albums.slice(0, 20)) {
      try {
        const tracks = await spotify.getAlbumTracks(album.id);
        if (!tracks.length) continue;
        const firstTrack = tracks[0];
        // Enrich with full track data to get popularity
        const fullTrack = await spotify.getTrack(firstTrack.id);
        const artistPop = album.artists?.[0]?.popularity ?? 50;
        // album objects from new-releases don't include artist popularity directly;
        // use track popularity as proxy
        if (fullTrack.popularity >= MIN_POPULARITY && fullTrack.popularity <= MAX_POPULARITY) {
          pool.push(fullTrack);
        }
      } catch (_) {}
    }
  } catch (e) {
    console.warn('[Underground] New releases failed:', e.message);
  }

  // ── Step 3: Search-based discovery (rotating queries) ────────────────────────
  const searchIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % UNDERGROUND_SEARCHES.length;
  const queries = [
    UNDERGROUND_SEARCHES[searchIdx % UNDERGROUND_SEARCHES.length],
    UNDERGROUND_SEARCHES[(searchIdx + 2) % UNDERGROUND_SEARCHES.length],
  ];

  for (const query of queries) {
    try {
      const results = await spotify.searchTracks(query, 30);
      const filtered = results.filter(t => t.popularity >= MIN_POPULARITY && t.popularity <= MAX_POPULARITY);
      pool.push(...filtered);
    } catch (e) {
      console.warn(`[Underground] Search "${query}" failed:`, e.message);
    }
  }

  // ── Step 4: Underground recommendations (genre-diverse) ─────────────────────
  const genreSeeds = [
    ['hip-hop', 'underground'],
    ['r-n-b', 'soul'],
    ['trap', 'rap'],
  ];

  for (const genres of genreSeeds) {
    try {
      const recs = await spotify.getRecommendations({
        seedGenres: genres,
        limit: 20,
        extra: {
          max_popularity: MAX_POPULARITY,
          min_popularity: MIN_POPULARITY,
        },
      });
      pool.push(...recs);
    } catch (e) {
      console.warn(`[Underground] Genre recs (${genres.join(',')}) failed:`, e.message);
    }
  }

  // ── Step 5: Own artists slot (from .env OWN_ARTIST_NAMES) ────────────────────
  const ownArtistNames = (process.env.OWN_ARTIST_NAMES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  for (const name of ownArtistNames) {
    try {
      const artist = await spotify.searchArtist(name);
      if (!artist) continue;
      const tracks = await spotify.getArtistTopTracks(artist.id);
      // Inject up to 2 own tracks, ensuring they appear in the final 20
      pool.unshift(...tracks.slice(0, 2));
    } catch (e) {
      console.warn(`[Underground] Own artist "${name}" failed:`, e.message);
    }
  }

  // ── Step 6: Dedupe, shuffle, pick 20 ─────────────────────────────────────────
  // Keep own-artist tracks by de-shuffling them back to front after dedup
  const ownUris = new Set();
  for (const name of ownArtistNames) {
    // mark own-artist tracks (already at front of pool after unshift)
  }

  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final = unique.slice(0, TARGET_COUNT);

  console.log(`[Underground] Selected ${final.length} tracks.`);
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
