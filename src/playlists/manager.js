const spotify = require('../spotify/client');
const store = require('../store');
const { syncToYouTube } = require('../youtube/sync');
const { syncToDeezer } = require('../deezer/sync');
const { syncToAudiomack } = require('../audiomack/sync');

// ── Traction measurement ────────────────────────────────────────────────────────
// Re-fetches popularity for each track from the previous cycle and computes the gain.
// Higher popularityGain → that track pulled more listeners → seed the next cycle with it.

async function measureTraction(previousTracks = []) {
  if (!previousTracks.length) return [];

  const ids = previousTracks.map(t => t.id).filter(Boolean);
  if (!ids.length) return previousTracks;

  try {
    const freshData = await spotify.getTracks(ids);
    return previousTracks.map((prev, i) => {
      const fresh = freshData.find(f => f && f.id === prev.id);
      const freshPop = fresh?.popularity ?? prev.popularity;
      return {
        ...prev,
        popularityGain: freshPop - (prev.popularity || 0),
        popularity: freshPop,
      };
    });
  } catch (e) {
    console.warn('[Traction] Could not measure traction:', e.message);
    return previousTracks.map(t => ({ ...t, popularityGain: 0 }));
  }
}

// ── Ensure playlist exists (create once, reuse forever) ────────────────────────

async function ensurePlaylist(userId, key, name, description) {
  const existing = store.getPlaylist(key);
  if (existing?.id) {
    console.log(`[Playlists] Using existing "${name}" (${existing.id})`);
    return existing.id;
  }

  console.log(`[Playlists] Creating new playlist: "${name}"`);
  const playlist = await spotify.createPlaylist(userId, name, description);
  store.setPlaylist(key, { id: playlist.id, tracks: [], lastUpdated: null });
  return playlist.id;
}

// ── Full update for a single playlist ─────────────────────────────────────────

async function updatePlaylist(key, generator, userId) {
  const stored = store.getPlaylist(key) || {};
  const previousTracks = stored.tracks || [];

  // Measure how previous tracks performed
  const measuredTracks = await measureTraction(previousTracks);
  const topGainers = [...measuredTracks]
    .sort((a, b) => b.popularityGain - a.popularityGain)
    .slice(0, 5);

  if (topGainers.length) {
    console.log(
      `[Playlists] Top gainers for ${key}: ${topGainers.map(t => `${t.name} (+${t.popularityGain})`).join(', ')}`
    );
  }

  // Generate new track list, informed by traction data
  const result = await generator.generate(measuredTracks);

  // Resolve or create the Spotify playlist
  const playlistId = await ensurePlaylist(userId, key, result.name, result.description);

  // Push tracks to Spotify
  const uris = result.tracks.map(t => t.uri);
  await spotify.replacePlaylistTracks(playlistId, uris);
  await spotify.updatePlaylistDescription(playlistId, result.description);

  // Persist new track state (keep any existing youtubeId / deezer / audiomack fields)
  const existingStored = store.getPlaylist(key) || {};
  store.setPlaylist(key, {
    id: playlistId,
    youtubeId: existingStored.youtubeId || null,
    deezerUserId: existingStored.deezerUserId || null,
    deezerId: existingStored.deezerId || null,
    audiomackId: existingStored.audiomackId || null,
    tracks: result.tracks,
    lastUpdated: new Date().toISOString(),
  });

  console.log(`[Playlists] ✓ "${result.name}" updated with ${result.tracks.length} tracks.`);

  // Optional: sync to YouTube if credentials are configured
  if (process.env.YOUTUBE_REFRESH_TOKEN) {
    try {
      const stored = store.getPlaylist(key) || {};
      const youtubeId = await syncToYouTube(key, result, stored.youtubeId || null);
      // Persist the YouTube playlist ID
      store.setPlaylist(key, { ...store.getPlaylist(key), youtubeId });
      console.log(`[Playlists] ✓ YouTube sync complete for "${result.name}" (${youtubeId})`);
    } catch (e) {
      console.warn(`[Playlists] YouTube sync failed for "${result.name}":`, e.message);
    }
  }

  // Optional: sync to Deezer if access token is configured
  if (process.env.DEEZER_ACCESS_TOKEN) {
    try {
      const stored = store.getPlaylist(key) || {};
      const storedDeezerIds = stored.deezerId
        ? { userId: stored.deezerUserId, playlistId: stored.deezerId }
        : null;
      const { userId: deezerUserId, playlistId: deezerId } = await syncToDeezer(key, result, storedDeezerIds);
      // Persist the Deezer user ID and playlist ID
      store.setPlaylist(key, { ...store.getPlaylist(key), deezerUserId, deezerId });
      console.log(`[Playlists] ✓ Deezer sync complete for "${result.name}" (${deezerId})`);
    } catch (e) {
      console.warn(`[Playlists] Deezer sync failed for "${result.name}":`, e.message);
    }
  }

  // Optional: sync to Audiomack if access token is configured
  if (process.env.AUDIOMACK_ACCESS_TOKEN) {
    try {
      const stored = store.getPlaylist(key) || {};
      const storedAudiomackIds = stored.audiomackId ? { playlistId: stored.audiomackId } : null;
      const { playlistId: audiomackId } = await syncToAudiomack(key, result, storedAudiomackIds);
      // Persist the Audiomack playlist ID
      store.setPlaylist(key, { ...store.getPlaylist(key), audiomackId });
      console.log(`[Playlists] ✓ Audiomack sync complete for "${result.name}" (${audiomackId})`);
    } catch (e) {
      console.warn(`[Playlists] Audiomack sync failed for "${result.name}":`, e.message);
    }
  }

  return { playlistId, trackCount: result.tracks.length, name: result.name };
}

module.exports = { updatePlaylist };
