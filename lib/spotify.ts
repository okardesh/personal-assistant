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

// Get available devices
export interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

export async function getSpotifyDevices(): Promise<SpotifyDevice[]> {
  const token = await getSpotifyToken()
  if (!token) {
    throw new Error('Spotify not authenticated')
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const data = await response.json()
    return data.devices || []
  } catch (error) {
    console.error('Error getting Spotify devices:', error)
    throw error
  }
}

// Transfer playback to a device
export async function transferSpotifyPlayback(deviceId: string, play = false): Promise<void> {
  const token = await getSpotifyToken()
  if (!token) {
    throw new Error('Spotify not authenticated')
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: play,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to transfer playback: ${error}`)
    }
  } catch (error) {
    console.error('Error transferring Spotify playback:', error)
    throw error
  }
}

// Find and transfer to "this computer/phone" device
export async function transferToThisDevice(): Promise<string | null> {
  try {
    const devices = await getSpotifyDevices()
    console.log('🎵 Available Spotify devices:', devices)
    
    // Look for devices that are likely "this computer/phone"
    // These are typically: Computer, iPhone, iPad, Mac, Windows, Chrome, etc.
    const thisDeviceKeywords = [
      'computer', 'iphone', 'ipad', 'mac', 'windows', 'chrome', 
      'safari', 'firefox', 'edge', 'desktop', 'laptop', 'mobile'
    ]
    
    // First, try to find an active device that matches keywords
    let targetDevice = devices.find(device => 
      device.is_active && 
      thisDeviceKeywords.some(keyword => 
        device.name.toLowerCase().includes(keyword.toLowerCase())
      )
    )
    
    // If no active device matches, find any device that matches keywords
    if (!targetDevice) {
      targetDevice = devices.find(device => 
        thisDeviceKeywords.some(keyword => 
          device.name.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    }
    
    // If still no match, use the first available device
    if (!targetDevice && devices.length > 0) {
      targetDevice = devices[0]
    }
    
    if (targetDevice) {
      console.log('🎵 Transferring to device:', targetDevice.name, targetDevice.id)
      await transferSpotifyPlayback(targetDevice.id, false) // Don't auto-play
      return targetDevice.id
    }
    
    console.warn('🎵 No suitable device found for transfer')
    return null
  } catch (error) {
    console.error('Error transferring to this device:', error)
    throw error
  }
}

