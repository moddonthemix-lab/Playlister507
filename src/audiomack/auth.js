// One-time OAuth 1.0a setup for Audiomack. Run once: `npm run auth:audiomack`
// Opens a browser → you log in to Audiomack → tokens are saved to .env.
require('dotenv').config();
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PORT = 8891;

const REQUEST_TOKEN_URL = 'https://api.audiomack.com/v1/request_token';
const AUTHORIZE_URL = 'https://audiomack.com/oauth/authenticate';
const ACCESS_TOKEN_URL = 'https://api.audiomack.com/v1/access_token';
const CALLBACK_URL = `http://127.0.0.1:${PORT}/callback`;

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
  const consumerKey = process.env.AUDIOMACK_CONSUMER_KEY;
  const consumerSecret = process.env.AUDIOMACK_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    console.error('\n[Auth:Audiomack] ERROR: AUDIOMACK_CONSUMER_KEY and AUDIOMACK_CONSUMER_SECRET must be set in .env\n');
    console.error('  1. Go to https://audiomack.com/data-api/user-authentication');
    console.error('  2. Register your application to get a Consumer Key and Consumer Secret');
    console.error('  3. Copy them into your .env file\n');
    process.exit(1);
  }

  const oauth = OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });

  // Step 1: Get a request token (sign with consumer only — empty token)
  const requestTokenRequestData = {
    url: REQUEST_TOKEN_URL,
    method: 'POST',
    data: { oauth_callback: CALLBACK_URL },
  };
  const requestTokenAuthHeader = oauth.toHeader(
    oauth.authorize(requestTokenRequestData, { key: '', secret: '' })
  );

  let requestToken;
  let requestTokenSecret;

  try {
    const res = await axios.post(
      REQUEST_TOKEN_URL,
      new URLSearchParams({ oauth_callback: CALLBACK_URL }).toString(),
      {
        headers: {
          ...requestTokenAuthHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const parsed = new URLSearchParams(res.data);
    requestToken = parsed.get('oauth_token');
    requestTokenSecret = parsed.get('oauth_token_secret');

    if (!requestToken) {
      console.error('[Auth:Audiomack] No request token returned. Response:', res.data);
      process.exit(1);
    }
  } catch (e) {
    console.error('[Auth:Audiomack] Failed to get request token:', e.response?.data || e.message);
    process.exit(1);
  }

  // Step 2: Redirect user to Audiomack authorization URL
  const authorizeUrl = `${AUTHORIZE_URL}?oauth_token=${requestToken}`;

  const app = express();

  app.get('/callback', async (req, res) => {
    const { oauth_token, oauth_verifier } = req.query;

    if (!oauth_token || !oauth_verifier) {
      res.send('<h2>Auth failed or was denied. Close this tab and try again.</h2>');
      process.exit(1);
    }

    // Step 3: Exchange for access token
    const accessTokenRequestData = {
      url: ACCESS_TOKEN_URL,
      method: 'POST',
      data: { oauth_verifier },
    };
    const accessTokenAuthHeader = oauth.toHeader(
      oauth.authorize(accessTokenRequestData, { key: oauth_token, secret: requestTokenSecret })
    );

    try {
      const tokenRes = await axios.post(
        ACCESS_TOKEN_URL,
        new URLSearchParams({ oauth_verifier }).toString(),
        {
          headers: {
            ...accessTokenAuthHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const parsed = new URLSearchParams(tokenRes.data);
      const accessToken = parsed.get('oauth_token');
      const accessTokenSecret = parsed.get('oauth_token_secret');

      if (!accessToken || !accessTokenSecret) {
        console.error('[Auth:Audiomack] No access token returned. Response:', tokenRes.data);
        res.send('<h2>No access token returned. Check terminal for details.</h2>');
        process.exit(1);
      }

      // Step 4: Save tokens to .env
      updateEnvFile('AUDIOMACK_ACCESS_TOKEN', accessToken);
      updateEnvFile('AUDIOMACK_ACCESS_TOKEN_SECRET', accessTokenSecret);

      console.log('\n[Auth:Audiomack] Access token and secret saved to .env');
      console.log('[Auth:Audiomack] You can now run `npm run update` to sync playlists to Audiomack.\n');

      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>Authenticated with Audiomack!</h2>
          <p>Access token saved. You can close this tab.</p>
          <p>Run <code>npm run update</code> to sync your playlists to Audiomack now.</p>
        </body></html>
      `);

      setTimeout(() => process.exit(0), 1000);
    } catch (e) {
      console.error('[Auth:Audiomack] Token exchange failed:', e.response?.data || e.message);
      res.send('<h2>Token exchange failed. Check terminal for details.</h2>');
      process.exit(1);
    }
  });

  const server = app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Playlister507 — Audiomack Auth Setup    ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log('  Opening Audiomack login in your browser...\n');
    openBrowser(authorizeUrl);
  });
}

main();
