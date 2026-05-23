// One-time OAuth setup for YouTube. Run once: `npm run auth:youtube`
// Opens a browser → you log in to Google → refresh token is saved to .env.
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PORT = 8889;
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
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
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = `http://localhost:${PORT}/callback`;

  if (!clientId || !clientSecret) {
    console.error('\n[Auth:YouTube] ERROR: YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set in .env\n');
    console.error('  1. Go to https://console.cloud.google.com/apis/credentials');
    console.error('  2. Create an OAuth 2.0 Client ID (type: Web application)');
    console.error(`  3. Add Authorized Redirect URI: ${redirectUri}`);
    console.error('  4. Enable the YouTube Data API v3 in your project');
    console.error('  5. Copy Client ID and Client Secret into your .env file\n');
    process.exit(1);
  }

  const app = express();

  const state = Math.random().toString(36).slice(2);
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

  app.get('/callback', async (req, res) => {
    const { code, state: returnedState, error } = req.query;

    if (error || returnedState !== state) {
      res.send('<h2>Auth failed or state mismatch. Close this tab and try again.</h2>');
      process.exit(1);
    }

    try {
      const tokenRes = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { refresh_token } = tokenRes.data;

      if (!refresh_token) {
        console.error('[Auth:YouTube] No refresh token returned. Make sure you use prompt=consent and access_type=offline.');
        res.send('<h2>No refresh token returned. Check terminal for details.</h2>');
        process.exit(1);
      }

      updateEnvFile('YOUTUBE_REFRESH_TOKEN', refresh_token);

      console.log('\n[Auth:YouTube] Refresh token saved to .env');
      console.log('[Auth:YouTube] You can now run `npm run update` to sync playlists to YouTube.\n');

      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>Authenticated with YouTube!</h2>
          <p>Refresh token saved. You can close this tab.</p>
          <p>Run <code>npm run update</code> to sync your playlists to YouTube now.</p>
        </body></html>
      `);

      setTimeout(() => process.exit(0), 1000);
    } catch (e) {
      console.error('[Auth:YouTube] Token exchange failed:', e.response?.data || e.message);
      res.send('<h2>Token exchange failed. Check terminal for details.</h2>');
      process.exit(1);
    }
  });

  const server = app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   Playlister507 — YouTube Auth Setup     ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log('  Opening Google login in your browser...\n');
    openBrowser(authUrl);
  });
}

main();
