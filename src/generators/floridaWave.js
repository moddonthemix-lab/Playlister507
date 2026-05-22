const spotify = require('../spotify');
const FLORIDA_ARTISTS = require('../data/floridaArtists');

const PLAYLIST_NAME = 'Fresh Florida Wave';
const PLAYLIST_DESC_TEMPLATE = (date) =>
  `Only Florida MCs. The hottest tracks from the Sunshine State — updated ${date}. 🌴`;

const TARGET_COUNT = 20;

async function generate(previousTracks = []) {
  console.log('[FloridaWave] Generating Fresh Florida Wave...');
  const pool = [];

  // ── Step 1: Determine seed artists ──────────────────────────────────────────
  // If we have previous-playlist data, use the top performers as recommendation seeds.
  let seedArtistIds = [];
  let seedTrackIds = [];

  if (previousTracks.length >= 3) {
    const sorted = [...previousTracks].sort((a, b) => b.popularityGain - a.popularityGain);
    const topTracks = sorted.slice(0, 3);
    seedTrackIds = topTracks.map(t => t.id).filter(Boolean);
    console.log(`[FloridaWave] Seeding from top-performing previous tracks: ${topTracks.map(t => t.name).join(', ')}`);
  }

  // ── Step 2: Resolve a rotating subset of Florida artists ────────────────────
  const weekRotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 14)) % FLORIDA_ARTISTS.length;
  const rotatedArtists = [
    ...FLORIDA_ARTISTS.slice(weekRotation),
    ...FLORIDA_ARTISTS.slice(0, weekRotation),
  ].slice(0, 10); // Work with 10 artists per cycle

  for (const name of rotatedArtists) {
    try {
      const artist = await spotify.searchArtist(name);
      if (!artist) continue;
      seedArtistIds.push(artist.id);

      // Grab top 3 tracks from each artist
      const tracks = await spotify.getArtistTopTracks(artist.id);
      pool.push(...tracks.slice(0, 3));
    } catch (e) {
      console.warn(`[FloridaWave] Could not load artist: ${name}`);
    }
  }

  // ── Step 3: Recommendations seeded by top FL artists + traction seeds ───────
  const artistSeeds = seedArtistIds.slice(0, 3);
  const trackSeeds = seedTrackIds.slice(0, 2);

  if (artistSeeds.length || trackSeeds.length) {
    try {
      const recs = await spotify.getRecommendations({
        seedArtists: artistSeeds,
        seedTracks: trackSeeds,
        seedGenres: ['hip-hop', 'rap'],
        limit: 30,
        extra: { min_popularity: 30 },
      });
      pool.push(...recs);
    } catch (e) {
      console.warn('[FloridaWave] Recommendations failed:', e.message);
    }
  }

  // ── Step 4: Trending search top-up ──────────────────────────────────────────
  try {
    const trending = await spotify.searchTracks(
      'florida rap hip-hop 2024 2025',
      30
    );
    pool.push(...trending.filter(t => t.popularity >= 40));
  } catch (e) {
    console.warn('[FloridaWave] Trending search failed:', e.message);
  }

  // ── Step 5: Dedupe, shuffle, pick 20 ────────────────────────────────────────
  const unique = spotify.dedupe(spotify.shuffle(pool));
  const final = unique.slice(0, TARGET_COUNT);

  console.log(`[FloridaWave] Selected ${final.length} tracks.`);
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
