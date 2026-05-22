# Playlister507

Auto-updating Spotify playlists that refresh every two weeks. Each update measures which tracks gained the most traction and seeds the next cycle from those winners.

## Playlists

| Playlist | Vibe | Artists |
|---|---|---|
| **Fresh Florida Wave** | Florida rap only | Rick Ross, Rod Wave, Kodak Black, Denzel Curry, YNW Melly, and more |
| **Unstoppable Gaming** | All genres, high energy | EDM, metal, hip-hop, synthwave |
| **The Slept On Underground** | Emerging & rising artists | Popularity 20–65, new releases, trending underground |

Each playlist gets **20 tracks**, updated every **2 weeks on Monday at 9 AM ET**.

## How It Works

1. Every 2 weeks, each generator builds a fresh pool of tracks via Spotify Search + Recommendations
2. Tracks from the previous cycle are re-measured for popularity gain
3. The top-gaining tracks seed the next round of recommendations — the playlist "learns" what listeners respond to
4. 20 final tracks are selected, shuffled, and pushed to Spotify

## Setup

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Set **Redirect URI** to `http://localhost:8888/callback`
4. Copy your **Client ID** and **Client Secret**

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
```

### 3. Install dependencies

```bash
npm install
```

### 4. Authenticate (one time only)

```bash
npm run auth
```

This opens a browser window. Log in with the Spotify account that will own the playlists. Your refresh token is saved to `.env` automatically — you never need to do this again.

### 5. Generate playlists now

```bash
npm run update
```

### 6. Start the scheduler (keeps playlists updating automatically)

```bash
npm start
```

Run this on a server or cloud VM so the process stays alive. It fires every Monday but only actually updates if 14+ days have passed.

## Commands

```bash
npm run update              # Update all 3 playlists immediately
npm run update:florida      # Update Fresh Florida Wave only
npm run update:gaming       # Update Unstoppable Gaming only
npm run update:underground  # Update The Slept On Underground only
npm start                   # Start bi-weekly scheduler
npm run auth                # Re-run OAuth (only needed once)
```

## Own Artists (The Slept On Underground)

Add your own artist names to `.env` to have them included in the Underground playlist:

```
OWN_ARTIST_NAMES=Your Artist Name,Another Artist
```

Names must match exactly as they appear on Spotify.

## Files

```
src/
├── index.js          Bi-weekly scheduler (npm start)
├── auth.js           One-time OAuth setup
├── spotify.js        Spotify API client (auto token refresh)
├── playlists.js      Playlist manager + traction measurement
├── store.js          Persistent state (playlist IDs + track data)
├── update.js         Manual update runner
├── generators/
│   ├── floridaWave.js    Fresh Florida Wave logic
│   ├── gaming.js         Unstoppable Gaming logic
│   └── underground.js    Slept On Underground logic
└── data/
    └── floridaArtists.js Florida rap artist list

data/
└── playlists.json    Local state (gitignored — auto-created)
```
