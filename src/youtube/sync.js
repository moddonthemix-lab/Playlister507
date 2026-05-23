require('dotenv').config();
const youtube = require('./client');
const store = require('../store');

/**
 * Search YouTube for each track in generatorResult, create or reuse a
 * YouTube playlist, clear it, fill it with found video IDs, and return the
 * YouTube playlist ID.
 *
 * @param {string} playlistKey   - e.g. 'floridaWave'
 * @param {object} generatorResult - { name, description, tracks: [{name, artists:[{name}], ...}] }
 * @param {string|null} storedYoutubeId - existing YouTube playlist ID (if any)
 * @returns {string} YouTube playlist ID
 */
async function syncToYouTube(playlistKey, generatorResult, storedYoutubeId) {
  const { name, description, tracks } = generatorResult;
  console.log(`[YouTube] Starting sync for "${name}" (${tracks.length} tracks)`);

  // 1. Search YouTube for each track → collect video IDs (200ms delay between searches)
  const videoIds = [];
  for (const track of tracks) {
    const trackName = track.name;
    const artistName = track.artist || track.artists?.[0]?.name || '';

    const videoId = await youtube.searchVideo(trackName, artistName);
    if (videoId) {
      videoIds.push(videoId);
    } else {
      console.log(`[YouTube] No video found for: ${artistName} - ${trackName}`);
    }

    // Rate-limit: 100 units per search, 10k/day free. 200ms between calls.
    await youtube.sleep(200);
  }

  console.log(`[YouTube] Found ${videoIds.length}/${tracks.length} tracks on YouTube`);

  // 2. Create playlist if it doesn't exist yet
  let youtubePlaylistId = storedYoutubeId;
  if (!youtubePlaylistId) {
    console.log(`[YouTube] Creating new playlist: "${name}"`);
    const created = await youtube.createPlaylist(name, description);
    youtubePlaylistId = created.id;
    console.log(`[YouTube] Created playlist ${youtubePlaylistId}`);
  } else {
    console.log(`[YouTube] Using existing playlist ${youtubePlaylistId}`);
  }

  // 3. Clear existing playlist items
  await youtube.clearPlaylist(youtubePlaylistId);

  // 4. Add all found video IDs
  await youtube.addTracksToPlaylist(youtubePlaylistId, videoIds);
  console.log(`[YouTube] Added ${videoIds.length} videos to playlist`);

  // 5. Update playlist description
  try {
    await youtube.updatePlaylistDescription(youtubePlaylistId, description);
  } catch (e) {
    console.warn('[YouTube] Could not update playlist description:', e.response?.data?.error?.message || e.message);
  }

  console.log(`[YouTube] Sync complete for "${name}" — ${videoIds.length}/${tracks.length} tracks`);
  return youtubePlaylistId;
}

module.exports = { syncToYouTube };
