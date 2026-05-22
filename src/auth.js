// One-time OAuth setup. Run once: `npm run auth`
// Opens a browser → you log in to Spotify → refresh token is saved to .env.
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
  'user-read-email',
].join(' ');

async function openBrowser(url) {
  try {
    const { default: open } = await import('open');
    await open(url);
  } catch {
    console.log(`  → Could not auto-open browser. Open manually:\n  ${url}\n`);
  }
}

function updateEnvFile(key, value) {
  const envPath = path.join(process.cwd(), '.env');
  let content = '';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }

  fs.writeFileSync(envPath, content.trim() + '\n');
}

async function main() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${PORT}/callback`;

  if (!clientId || !clientSecret) {
    console.error('\n[Auth] ERROR: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env\n');
    console.error('  1. Go to https://developer.spotify.com/dashboard');
    console.error('  2. Create an app');
    console.error(`  3. Add Redirect URI: ${redirectUri}`);
    console.error('  4. Copy Client ID and Client Secret into your .env file\n');
    process.exit(1);
  }

  const app = express();

  const state = Math.random().toString(36).slice(2);
  const authUrl =
    `https://accounts.spotify.com/authorize?` +
    new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
    });

  app.get('/callback', async (req, res) => {
    const { code, state: returnedState, error } = req.query;

    if (error || returnedState !== state) {
      res.send('<h2>Auth failed or state mismatch. Close this tab and try again.</h2>');
      process.exit(1);
    }

    try {
      const tokenRes = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        }
      );

      const { refresh_token, access_token } = tokenRes.data;

      updateEnvFile('SPOTIFY_REFRESH_TOKEN', refresh_token);

      console.log('\n[Auth] ✓ Refresh token saved to .env');
      console.log('[Auth] You can now run `npm start` or `npm run update`\n');

      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>✅ Authenticated!</h2>
          <p>Refresh token saved. You can close this tab.</p>
          <p>Run <code>npm run update</code> to generate your playlists now.</p>
        </body></html>
      `);

      setTimeout(() => process.exit(0), 1000);
    } catch (e) {
      console.error('[Auth] Token exchange failed:', e.response?.data || e.message);
      res.send('<h2>Token exchange failed. Check terminal for details.</h2>');
      process.exit(1);
    }
  });

  const server = app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║     Playlister507 — Spotify Auth Setup   ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log('  Opening Spotify login in your browser...\n');
    openBrowser(authUrl);
  });
}

main();
