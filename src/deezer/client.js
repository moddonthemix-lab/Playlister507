require('dotenv').config();
const axios = require('axios');

const API_BASE = 'https://api.deezer.com';

async function api(method, endpoint, { params = {}, data } = {}) {
  const accessToken = process.env.DEEZER_ACCESS_TOKEN;

  const res = await axios({
    method,
    url: `${API_BASE}${endpoint}`,
    params: {
      ...params,
      access_token: accessToken,
      output: 'json',
    },
    data,
    headers:
      method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'DELETE'
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : undefined,
  });
  return res.data;
}

async function getMe() {
  return api('GET', '/user/me');
}

async function searchTrack(trackName, artistName) {
  const q = `${artistName} ${trackName}`;
  try {
    const res = await api('GET', '/search/track', {
      params: { q, limit: 1 },
    });
    const results = res.data || [];
    if (!results.length) return null;
    return results[0].id;
  } catch (e) {
    console.warn(`[Deezer] Search failed for "${q}":`, e.response?.data?.error?.message || e.message);
    return null;
  }
}

async function createPlaylist(userId, title) {
  const res = await api('POST', `/user/${userId}/playlists`, {
    data: new URLSearchParams({ title }),
  });
  return res.id;
}

async function getPlaylistTracks(playlistId) {
  const res = await api('GET', `/playlist/${playlistId}/tracks`);
  const items = res.data || [];
  return items.map(t => t.id);
}

async function deletePlaylistTracks(playlistId, trackIds) {
  if (!trackIds.length) return;
  await api('DELETE', `/playlist/${playlistId}/tracks`, {
    params: { songs: trackIds.join(',') },
  });
}

async function addTracksToPlaylist(playlistId, trackIds) {
  if (!trackIds.length) return;
  await api('POST', `/playlist/${playlistId}/tracks`, {
    data: new URLSearchParams({ songs: trackIds.join(',') }),
  });
}

async function updatePlaylist(playlistId, { title, description } = {}) {
  const fields = {};
  if (title !== undefined) fields.title = title;
  if (description !== undefined) fields.description = description;
  await api('POST', `/playlist/${playlistId}`, {
    data: new URLSearchParams(fields),
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  api,
  getMe,
  searchTrack,
  createPlaylist,
  getPlaylistTracks,
  deletePlaylistTracks,
  addTracksToPlaylist,
  updatePlaylist,
  sleep,
};
