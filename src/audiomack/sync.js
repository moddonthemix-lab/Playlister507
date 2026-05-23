require('dotenv').config();
const audiomack = require('./client');

// Map internal playlist keys to Audiomack genre taxonomy
const GENRE_MAP = {
  floridaWave: 'Hip-Hop',
  gaming: 'Electronic',
  underground: 'Hip-Hop',
};

/**
 * Search Audiomack for each track in generatorResult, create or reuse an
 * Audiomack playlist, clear it, fill it with found music IDs, and return
 * the stored Audiomack identifiers.
 *
 * @param {string} playlistKey        - e.g. 'floridaWave'
 * @param {object} generatorResult    - { name, description, tracks: [{name, artists:[{name}], ...}] }
 * @param {object|null} storedIds     - { playlistId } or null
 * @returns {{ playlistId: string }}
 */
async function syncToAudiomack(playlistKey, generatorResult, storedIds) {
  const { name, tracks } = generatorResult;
  console.log(`[Audiomack] Starting sync for "${name}" (${tracks.length} tracks)`);

  const genre = GENRE_MAP[playlistKey] || 'Hip-Hop';

  // 1. Search Audiomack for each track → collect music IDs (200ms delay between searches)
  const musicIds = [];
  for (const track of tracks) {
    const trackName = track.name;
    const artistName = track.artists?.[0]?.name || '';

    const musicId = await audiomack.searchTrack(trackName, artistName);
    if (musicId) {
      musicIds.push(musicId);
    } else {
      console.log(`[Audiomack] No track found for: ${artistName} - ${trackName}`);
    }

    await audiomack.sleep(200);
  }

  console.log(`[Audiomack] Found ${musicIds.length}/${tracks.length} tracks on Audiomack`);

  // 2. Create playlist if it doesn't exist yet
  let playlistId = storedIds?.playlistId || null;
  if (!playlistId) {
    console.log(`[Audiomack] Creating new playlist: "${name}" (genre: ${genre})`);
    const created = await audiomack.createPlaylist(name, genre);
    playlistId = String(created.id);
    console.log(`[Audiomack] Created playlist ${playlistId}`);
  } else {
    console.log(`[Audiomack] Using existing playlist ${playlistId}`);
  }

  // 3. Clear existing playlist tracks
  await audiomack.clearPlaylist(playlistId);
  console.log(`[Audiomack] Cleared existing tracks from playlist ${playlistId}`);

  // 4. Add all found music IDs in batches of 20
  await audiomack.addTracksToPlaylist(playlistId, musicIds);
  console.log(`[Audiomack] Added ${musicIds.length} tracks to playlist`);

  console.log(`[Audiomack] Sync complete for "${name}" — ${musicIds.length}/${tracks.length} tracks`);
  return { playlistId };
}

module.exports = { syncToAudiomack };
