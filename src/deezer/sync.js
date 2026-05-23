require('dotenv').config();
const deezer = require('./client');

/**
 * Search Deezer for each track in generatorResult, create or reuse a
 * Deezer playlist, clear it, fill it with found track IDs, and return
 * the stored Deezer identifiers.
 *
 * @param {string} playlistKey       - e.g. 'floridaWave'
 * @param {object} generatorResult   - { name, description, tracks: [{name, artists:[{name}], ...}] }
 * @param {object|null} storedDeezerIds - { userId, playlistId } or null
 * @returns {{ userId: string, playlistId: string }}
 */
async function syncToDeezer(playlistKey, generatorResult, storedDeezerIds) {
  const { name, description, tracks } = generatorResult;
  console.log(`[Deezer] Starting sync for "${name}" (${tracks.length} tracks)`);

  // 1. Resolve userId (fetch once, then reuse)
  let userId = storedDeezerIds?.userId || null;
  if (!userId) {
    const me = await deezer.getMe();
    userId = String(me.id);
    console.log(`[Deezer] Resolved user ID: ${userId}`);
  }

  // 2. Search Deezer for each track → collect track IDs (200ms delay between searches)
  const trackIds = [];
  for (const track of tracks) {
    const trackName = track.name;
    const artistName = track.artists?.[0]?.name || '';

    const trackId = await deezer.searchTrack(trackName, artistName);
    if (trackId) {
      trackIds.push(trackId);
    } else {
      console.log(`[Deezer] No track found for: ${artistName} - ${trackName}`);
    }

    await deezer.sleep(200);
  }

  console.log(`[Deezer] Found ${trackIds.length}/${tracks.length} tracks on Deezer`);

  // 3. Create playlist if it doesn't exist yet
  let playlistId = storedDeezerIds?.playlistId || null;
  if (!playlistId) {
    console.log(`[Deezer] Creating new playlist: "${name}"`);
    playlistId = String(await deezer.createPlaylist(userId, name));
    console.log(`[Deezer] Created playlist ${playlistId}`);
  } else {
    console.log(`[Deezer] Using existing playlist ${playlistId}`);
  }

  // 4. Fetch current tracks in playlist and delete them all
  const currentTrackIds = await deezer.getPlaylistTracks(playlistId);
  if (currentTrackIds.length) {
    await deezer.deletePlaylistTracks(playlistId, currentTrackIds);
    console.log(`[Deezer] Cleared ${currentTrackIds.length} tracks from playlist ${playlistId}`);
  }

  // 5. Add all found track IDs
  await deezer.addTracksToPlaylist(playlistId, trackIds);
  console.log(`[Deezer] Added ${trackIds.length} tracks to playlist`);

  // 6. Update playlist description
  try {
    await deezer.updatePlaylist(playlistId, { description });
  } catch (e) {
    console.warn('[Deezer] Could not update playlist description:', e.response?.data?.error?.message || e.message);
  }

  console.log(`[Deezer] Sync complete for "${name}" — ${trackIds.length}/${tracks.length} tracks`);
  return { userId, playlistId };
}

module.exports = { syncToDeezer };
