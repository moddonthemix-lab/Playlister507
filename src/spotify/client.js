require('dotenv').config();
const axios = require('axios');

let _accessToken = null;
let _tokenExpiry = 0;

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken;

  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
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
    url: `https://api.spotify.com/v1${endpoint}`,
    headers: { Authorization: `Bearer ${token}` },
    params,
    data,
  });
  return res.data;
}

async function getMe() {
  return api('GET', '/me');
}

async function searchArtist(name) {
  const res = await api('GET', '/search', {
    params: { q: name, type: 'artist', limit: 1, market: 'US' },
  });
  return res.artists.items[0] || null;
}

async function getArtistTopTracks() {
  return [];
}

async function getRecommendations() {
  return [];
}

async function searchTracks(query, limit = 10) {
  limit = Math.min(limit, 10);
  const res = await api('GET', '/search', {
    params: { q: query, type: 'track', limit, market: 'US' },
  });
  return res.tracks.items;
}

async function searchArtistTracks(artistName, limit = 10) {
  const res = await api('GET', '/search', {
    params: { q: `artist:"${artistName}"`, type: 'track', limit: Math.min(limit, 10), market: 'US' },
  });
  return res.tracks?.items || [];
}

async function getNewReleases() {
  return [];
}

async function getAlbumTracks(albumId) {
  const res = await api('GET', `/albums/${albumId}/tracks`, {
    params: { limit: 5, market: 'US' },
  });
  return res.items;
}

async function getTrack(trackId) {
  return api('GET', `/tracks/${trackId}`, { params: { market: 'US' } });
}

async function getTracks(trackIds) {
  const chunks = chunkArray(trackIds, 50);
  const results = [];
  for (const chunk of chunks) {
    const res = await api('GET', '/tracks', { params: { ids: chunk.join(','), market: 'US' } });
    results.push(...res.tracks);
  }
  return results;
}

async function getAudioFeatures(trackIds) {
  const chunks = chunkArray(trackIds, 100);
  const results = [];
  for (const chunk of chunks) {
    const res = await api('GET', '/audio-features', { params: { ids: chunk.join(',') } });
    results.push(...(res.audio_features || []));
  }
  return results;
}

async function createPlaylist(userId, name, description) {
  return api('POST', `/me/playlists`, {
    data: { name, description, public: true },
  });
}

async function replacePlaylistTracks(playlistId, uris) {
  // PUT replaces all tracks; max 100 per request
  const first100 = uris.slice(0, 100);
  await api('PUT', `/playlists/${playlistId}/tracks`, { data: { uris: first100 } });
}

async function updatePlaylistDescription(playlistId, description) {
  await api('PUT', `/playlists/${playlistId}`, { data: { description } });
}

async function getUserPlaylists(userId) {
  const playlists = [];
  let url = `/users/${userId}/playlists`;
  while (url) {
    const res = await api('GET', url, { params: { limit: 50 } });
    playlists.push(...res.items);
    url = res.next ? res.next.replace('https://api.spotify.com/v1', '') : null;
  }
  return playlists;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dedupe(tracks) {
  const seen = new Set();
  return tracks.filter(t => {
    if (!t || !t.uri) return false;
    if (seen.has(t.uri)) return false;
    seen.add(t.uri);
    return true;
  });
}

module.exports = {
  getMe,
  searchArtist,
  getArtistTopTracks,
  getRecommendations,
  searchTracks,
  getNewReleases,
  getAlbumTracks,
  getTrack,
  getTracks,
  getAudioFeatures,
  createPlaylist,
  replacePlaylistTracks,
  updatePlaylistDescription,
  getUserPlaylists,
  shuffle,
  dedupe,
};
