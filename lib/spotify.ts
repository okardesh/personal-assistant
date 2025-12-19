// Spotify Web API integration

interface SpotifyToken {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
}

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: { name: string; images: Array<{ url: string }> }
  uri: string
  duration_ms: number
}

interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[]
  }
}

// Get Spotify access token from server
export async function getSpotifyToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/spotify/token')
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data.access_token || null
  } catch (error) {
    console.error('Error getting Spotify token:', error)
    return null
  }
}

// Search for tracks
export async function searchSpotifyTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken()
  if (!token) {
    throw new Error('Spotify not authenticated')
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const data: SpotifySearchResult = await response.json()
    return data.tracks.items
  } catch (error) {
    console.error('Error searching Spotify:', error)
    throw error
  }
}

// Get track by ID
export async function getSpotifyTrack(trackId: string): Promise<SpotifyTrack | null> {
  const token = await getSpotifyToken()
  if (!token) {
    throw new Error('Spotify not authenticated')
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting Spotify track:', error)
    return null
  }
}

