import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 
  `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/spotify/callback`

export async function GET(request: NextRequest) {
  if (!SPOTIFY_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Spotify Client ID not configured' },
      { status: 500 }
    )
  }

  // Determine redirect URI - use production URL if available
  // Get origin from request headers (server-side)
  const origin = request.headers.get('origin') || 
    request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
    process.env.NEXT_PUBLIC_BASE_URL || 
    'http://localhost:3000'
  
  const redirectUri = SPOTIFY_REDIRECT_URI || `${origin}/api/spotify/callback`

  console.log('🎵 Spotify auth - Redirect URI:', redirectUri)

  const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-email',
    'user-read-private',
  ].join(' ')

  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: redirectUri,
    state: Math.random().toString(36).substring(7), // Random state for security
  })}`

  console.log('🎵 Spotify auth URL generated')
  return NextResponse.json({ authUrl })
}

