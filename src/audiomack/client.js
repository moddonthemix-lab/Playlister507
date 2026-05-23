require('dotenv').config();
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');

const API_BASE = 'https://api.audiomack.com/v1';

const oauth = OAuth({
  consumer: {
    key: process.env.AUDIOMACK_CONSUMER_KEY,
    secret: process.env.AUDIOMACK_CONSUMER_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

function getToken() {
  return {
    key: process.env.AUDIOMACK_ACCESS_TOKEN,
    secret: process.env.AUDIOMACK_ACCESS_TOKEN_SECRET,
  };
}

async function api(method, endpoint, params = {}) {
  const url = `${API_BASE}${endpoint}`;
  const requestData = { url, method };
  if (method === 'GET') requestData.data = params;

  const authHeader = oauth.toHeader(oauth.authorize(requestData, getToken()));

  const config = {
    method,
    url,
    headers: { ...authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
  };
  if (method === 'GET') {
    config.params = params;
  } else {
    config.data = new URLSearchParams(params).toString();
  }

  const res = await axios(config);
  return res.data;
}

async function getMe() {
  return api('GET', '/me');
}

async function searchTrack(trackName, artistName) {
  const q = `${artistName}+${trackName}`;
  try {
    const res = await api('GET', '/search', { q, type: 'song', limit: 1 });
    const results = res.results || [];
    if (!results.length) return null;
    return results[0].id;
  } catch (e) {
    console.warn(
      `[Audiomack] Search failed for "${artistName} - ${trackName}":`,
      e.response?.data?.message || e.message
    );
    return null;
  }
}

async function createPlaylist(title, genre) {
  const res = await api('POST', '/playlist', { title, genre });
  return res;
}

async function addTracksToPlaylist(playlistId, musicIds) {
  if (!musicIds.length) return;
  const BATCH_SIZE = 20;
  for (let i = 0; i < musicIds.length; i += BATCH_SIZE) {
    const batch = musicIds.slice(i, i + BATCH_SIZE);
    await api('POST', `/playlist/${playlistId}/track`, { music_id: batch.join(',') });
  }
}

async function clearPlaylist(playlistId) {
  const playlist = await getPlaylist(playlistId);
  const tracks = playlist.tracks || [];
  for (const track of tracks) {
    const musicId = track.id;
    if (musicId) {
      try {
        await api('DELETE', `/playlist/${playlistId}/${musicId}`);
      } catch (e) {
        console.warn(`[Audiomack] Could not delete track ${musicId} from playlist:`, e.message);
      }
    }
  }
}

async function getPlaylist(playlistId) {
  return api('GET', `/playlist/${playlistId}`);
}

async function updatePlaylist(playlistId, params) {
  return api('PUT', `/playlist/${playlistId}`, params);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = {
  api,
  getMe,
  searchTrack,
  createPlaylist,
  addTracksToPlaylist,
  clearPlaylist,
  getPlaylist,
  updatePlaylist,
  sleep,
};
