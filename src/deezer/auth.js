// One-time OAuth setup for Deezer. Run once: `npm run auth:deezer`
// Opens a browser → you log in to Deezer → access token is saved to .env.
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PORT = 8890;

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
  const appId = process.env.DEEZER_APP_ID;
  const secret = process.env.DEEZER_SECRET;
  const redirectUri = process.env.DEEZER_REDIRECT_URI || `http://127.0.0.1:${PORT}/callback`;

  if (!appId || !secret) {
    console.error('\n[Auth:Deezer] ERROR: DEEZER_APP_ID and DEEZER_SECRET must be set in .env\n');
    console.error('  1. Go to https://developers.deezer.com/myapps');
    console.error('  2. Create a new application');
    console.error(`  3. Set Redirect URL to: ${redirectUri}`);
    console.error('  4. Copy App ID and Secret Key into your .env file\n');
    process.exit(1);
  }

  const app = express();

  const authUrl =
    `https://connect.deezer.com/oauth/auth.php?` +
    new URLSearchParams({
      app_id: appId,
      redirect_uri: redirectUri,
      perms: 'manage_library,offline_access',
      response_type: 'code',
    });

  app.get('/callback', async (req, res) => {
    const { code, error_reason } = req.query;

    if (error_reason || !code) {
      res.send('<h2>Auth failed or was denied. Close this tab and try again.</h2>');
      process.exit(1);
    }

    try {
      const tokenRes = await axios.get(
        'https://connect.deezer.com/oauth/access_token.php',
        {
          params: {
            app_id: appId,
            secret,
            code,
            output: 'json',
          },
        }
      );

      const { access_token, expires } = tokenRes.data;

      if (!access_token) {
        console.error('[Auth:Deezer] No access token returned. Response:', tokenRes.data);
        res.send('<h2>No access token returned. Check terminal for details.</h2>');
        process.exit(1);
      }

      // Save credentials to .env (write APP_ID and SECRET if not already there)
      if (!process.env.DEEZER_APP_ID) updateEnvFile('DEEZER_APP_ID', appId);
      if (!process.env.DEEZER_SECRET) updateEnvFile('DEEZER_SECRET', secret);
      updateEnvFile('DEEZER_ACCESS_TOKEN', access_token);

      const expiryNote = expires === 0 ? 'never expires' : `expires in ${expires}s`;
      console.log(`\n[Auth:Deezer] Access token saved to .env (${expiryNote})`);
      console.log('[Auth:Deezer] You can now run `npm run update` to sync playlists to Deezer.\n');

      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>Authenticated with Deezer!</h2>
          <p>Access token saved (${expiryNote}). You can close this tab.</p>
          <p>Run <code>npm run update</code> to sync your playlists to Deezer now.</p>
        </body></html>
      `);

      setTimeout(() => process.exit(0), 1000);
    } catch (e) {
      console.error('[Auth:Deezer] Token exchange failed:', e.response?.data || e.message);
      res.send('<h2>Token exchange failed. Check terminal for details.</h2>');
      process.exit(1);
    }
  });

  const server = app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   Playlister507 — Deezer Auth Setup      ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log('  Opening Deezer login in your browser...\n');
    openBrowser(authUrl);
  });
}

main();
