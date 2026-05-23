require('dotenv').config();
const axios = require('axios');

const API_BASE = 'https://www.googleapis.com/youtube/v3';

let _accessToken = null;
let _tokenExpiry = 0;

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken;

  const res = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  _accessToken = res.data.access_token;
  _tokenExpiry = Date.now() + res.data.expires_in * 1000;
  return _accessToken;
}

async function api(method, endpoint, { params, data } = {}) {
  const token = await getAccessToken();
  const res = await axios({
    method,
    url: `${API_BASE}${endpoint}`,
    headers: { Authorization: `Bearer ${token}` },
    params,
    data,
  });
  return res.data;
}

async function getMyChannel() {
  return api('GET', '/channels', {
    params: { part: 'id,snippet', mine: true },
  });
}

async function createPlaylist(title, description) {
  return api('POST', '/playlists', {
    params: { part: 'snippet,status' },
    data: {
      snippet: { title, description },
      status: { privacyStatus: 'public' },
    },
  });
}

async function clearPlaylist(playlistId) {
  // Fetch all playlist items
  const items = [];
  let pageToken = undefined;

  do {
    const params = { part: 'id', playlistId, maxResults: 50 };
    if (pageToken) params.pageToken = pageToken;

    const res = await api('GET', '/playlistItems', { params });
    items.push(...(res.items || []));
    pageToken = res.nextPageToken;
  } while (pageToken);

  // Delete each item
  for (const item of items) {
    await api('DELETE', '/playlistItems', { params: { id: item.id } });
  }

  console.log(`[YouTube] Cleared ${items.length} items from playlist ${playlistId}`);
}

async function addTracksToPlaylist(playlistId, videoIds) {
  for (const videoId of videoIds) {
    await api('POST', '/playlistItems', {
      params: { part: 'snippet' },
      data: {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      },
    });
  }
}

async function searchVideo(trackName, artistName) {
  const q = `${artistName} ${trackName}`;
  try {
    const res = await api('GET', '/search', {
      params: {
        part: 'snippet',
        type: 'video',
        videoCategoryId: '10',
        q,
        maxResults: 1,
      },
    });
    const items = res.items || [];
    if (!items.length) return null;
    return items[0].id.videoId;
  } catch (e) {
    console.warn(`[YouTube] Search failed for "${q}":`, e.response?.data?.error?.message || e.message);
    return null;
  }
}

async function updatePlaylistDescription(playlistId, description) {
  // First fetch the current snippet to get the title (required for PUT)
  const current = await api('GET', '/playlists', {
    params: { part: 'snippet', id: playlistId },
  });
  const snippet = current.items?.[0]?.snippet || {};

  await api('PUT', '/playlists', {
    params: { part: 'snippet' },
    data: {
      id: playlistId,
      snippet: {
        title: snippet.title,
        description,
        defaultLanguage: snippet.defaultLanguage || 'en',
      },
    },
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  getAccessToken,
  api,
  getMyChannel,
  createPlaylist,
  clearPlaylist,
  addTracksToPlaylist,
  searchVideo,
  updatePlaylistDescription,
  sleep,
};
