'use client'

// Spotify Web Playback SDK integration
// This requires Spotify Premium account

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

interface SpotifyPlayer {
  connect: () => Promise<void>
  disconnect: () => void
  addListener: (event: string, callback: (state: any) => void) => void
  getCurrentState: () => Promise<any>
  setName: (name: string) => Promise<void>
  getVolume: () => Promise<number>
  setVolume: (volume: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  togglePlay: () => Promise<void>
  seek: (positionMs: number) => Promise<void>
  previousTrack: () => Promise<void>
  nextTrack: () => Promise<void>
  activateElement: () => Promise<void>
}

export class SpotifyWebPlayback {
  private player: SpotifyPlayer | null = null
  private deviceId: string | null = null
  private accessToken: string | null = null
  private isReady = false

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Spotify Web Playback SDK requires browser environment')
    }

    // Load Spotify Web Playback SDK
    if (!window.Spotify) {
      await this.loadSDK()
    }

    return new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        this.player = new window.Spotify.Player({
          name: 'Personal Assistant',
          getOAuthToken: (cb: (token: string) => void) => {
            if (this.accessToken) {
              cb(this.accessToken)
            }
          },
          volume: 0.5,
        })

        if (!this.player) {
          reject(new Error('Failed to create Spotify player'))
          return
        }

        this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('🎵 Spotify player ready with device ID:', device_id)
          this.deviceId = device_id
          this.isReady = true
          resolve()
        })

        this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('🎵 Spotify player not ready:', device_id)
          this.isReady = false
        })

        this.player.addListener('player_state_changed', (state: any) => {
          if (state) {
            console.log('🎵 Player state changed:', {
              track: state.track_window.current_track.name,
              isPlaying: !state.paused,
            })
          }
        })

        this.player.connect()
      }

      // If SDK is already loaded
      if (window.Spotify) {
        window.onSpotifyWebPlaybackSDKReady()
      }
    })
  }

  private async loadSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      script.onload = () => {
        resolve()
      }
      script.onerror = () => {
        reject(new Error('Failed to load Spotify Web Playback SDK'))
      }
      document.head.appendChild(script)
    })
  }

  async playTrack(uri: string): Promise<void> {
    if (!this.isReady || !this.deviceId || !this.accessToken) {
      throw new Error('Spotify player not ready')
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [uri],
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to play track: ${error}`)
      }
    } catch (error) {
      console.error('Error playing track:', error)
      throw error
    }
  }

  async pause(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }
    await this.player.pause()
  }

  async resume(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }
    await this.player.resume()
  }

  async nextTrack(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }
    await this.player.nextTrack()
  }

  async previousTrack(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }
    await this.player.previousTrack()
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }
    await this.player.setVolume(volume / 100) // Spotify uses 0-1 range
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect()
      this.player = null
      this.isReady = false
      this.deviceId = null
    }
  }

  isPlayerReady(): boolean {
    return this.isReady
  }
}

