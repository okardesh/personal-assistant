# Spotify Integration Setup

## Requirements

1. **Spotify Developer Account** (free)
   - Go to https://developer.spotify.com/dashboard
   - Sign in with your Spotify account

2. **Spotify Premium Account** (required for Web Playback SDK)
   - Web Playback SDK only works with Premium accounts

## Setup Steps

### 1. Create Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Click **"Create App"**
3. Fill in:
   - **App Name**: `Personal Assistant`
   - **App Description**: `AI-powered personal assistant with music playback`
   - **Website**: Your Vercel URL (e.g., `https://your-app.vercel.app`)
   - **Redirect URI**: 
     - For local: `http://localhost:3000/api/spotify/callback`
     - For production: `https://your-app.vercel.app/api/spotify/callback`
4. Click **"Save"**
5. Copy your **Client ID** and **Client Secret**

### 2. Add Environment Variables

Add to `.env.local`:

```env
SPOTIFY_CLIENT_ID=your-client-id-here
SPOTIFY_CLIENT_SECRET=your-client-secret-here
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
```

For production (Vercel), add the same variables in Vercel dashboard:
- Settings → Environment Variables

**Important**: Update `SPOTIFY_REDIRECT_URI` to your production URL:
```env
SPOTIFY_REDIRECT_URI=https://your-app.vercel.app/api/spotify/callback
```

### 3. Features

The integration supports:

- **Play Music**: "Spotify'da [song name] çal", "play [artist]"
- **Control Playback**: 
  - "müziği durdur" / "pause"
  - "devam et" / "resume"
  - "sonraki şarkı" / "next song"
  - "önceki şarkı" / "previous"
  - "sesi aç" / "volume up"
  - "sesi kıs" / "volume down"

### 4. How It Works

1. User asks to play music
2. OpenAI detects the request and calls `play_spotify_track` function
3. System searches Spotify for the track
4. If user is not authenticated, redirects to Spotify OAuth
5. After authentication, initializes Spotify Web Playback SDK
6. Plays the track in the browser

### 5. Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Firefox
- ❌ Safari (not supported by Web Playback SDK)

### 6. Troubleshooting

**"Spotify not authenticated"**
- Make sure you've completed OAuth flow
- Check that tokens are stored in localStorage

**"Player not ready"**
- Wait a few seconds after authentication
- Refresh the page
- Make sure you have Spotify Premium

**"Failed to play track"**
- Check browser console for errors
- Verify Spotify Premium subscription
- Try a different browser (Chrome recommended)

## Notes

- Tokens are currently stored in `localStorage` (client-side)
- For production, consider storing tokens server-side with httpOnly cookies
- Web Playback SDK requires active Spotify Premium subscription
- Only one device can play at a time (Spotify limitation)

