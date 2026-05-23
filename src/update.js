// Manual trigger: `npm run update` — runs all three playlists immediately.
// Also used internally by the scheduler.
require('dotenv').config();
const spotify = require('./spotify/client');
const { updatePlaylist } = require('./playlists/manager');
const store = require('./store');

const floridaWave = require('./playlists/floridaWave');
const gaming = require('./playlists/gaming');
const underground = require('./playlists/underground');

const PLAYLISTS = {
  floridaWave,
  gaming,
  underground,
};

async function runAll(targetKey = null) {
  console.log('\n══════════════════════════════════════════');
  console.log(' Playlister507 — Update Starting');
  console.log(`  ${new Date().toLocaleString()}`);
  console.log('══════════════════════════════════════════\n');

  let me;
  try {
    me = await spotify.getMe();
    console.log(`[Auth] Logged in as ${me.display_name} (${me.id})\n`);
  } catch (e) {
    console.error('[Auth] Failed to authenticate with Spotify:', e.message);
    console.error('→ Run `npm run auth` to complete OAuth setup first.');
    process.exit(1);
  }

  const keys = targetKey ? [targetKey] : Object.keys(PLAYLISTS);

  for (const key of keys) {
    if (!PLAYLISTS[key]) {
      console.warn(`[Update] Unknown playlist key: ${key}`);
      continue;
    }
    try {
      const result = await updatePlaylist(key, PLAYLISTS[key], me.id);
      console.log(`  ✓ ${result.name} — ${result.trackCount} tracks → https://open.spotify.com/playlist/${result.playlistId}\n`);
    } catch (e) {
      console.error(`[Update] Failed to update ${key}:`, e.message);
    }
  }

  store.setLastRun(new Date().toISOString());

  console.log('══════════════════════════════════════════');
  console.log(' Update Complete');
  console.log('══════════════════════════════════════════\n');
}

// Allow running specific playlist: `node src/update.js floridaWave`
if (require.main === module) {
  const targetKey = process.argv[2] || null;
  runAll(targetKey).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runAll };
