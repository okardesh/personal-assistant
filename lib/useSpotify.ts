'use client'

import { useState, useEffect, useRef } from 'react'
import { SpotifyWebPlayback } from './spotifyPlayback'

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: { name: string; images: Array<{ url: string }> }
  uri: string
  duration_ms: number
}

export function useSpotify() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const playerRef = useRef<SpotifyWebPlayback | null>(null)
  const accessTokenRef = useRef<string | null>(null)

  useEffect(() => {
    // Check if we have Spotify token in localStorage
    const token = localStorage.getItem('spotify_access_token')
    if (token) {
      accessTokenRef.current = token
      setIsAuthenticated(true)
      initializePlayer(token)
    }
  }, [])

  // Check for Spotify auth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('spotify_success') === '1') {
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const expiresIn = params.get('expires_in')

      if (accessToken && refreshToken && expiresIn) {
        // Store tokens
        localStorage.setItem('spotify_access_token', accessToken)
        localStorage.setItem('spotify_refresh_token', refreshToken)
        localStorage.setItem('spotify_token_expires_at', String(Date.now() + parseInt(expiresIn) * 1000))
        
        accessTokenRef.current = accessToken
        setIsAuthenticated(true)
        
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
        
        // Initialize player
        initializePlayer(accessToken)
      }
    }
  }, [])

  const initializePlayer = async (token: string) => {
    try {
      const player = new SpotifyWebPlayback(token)
      await player.initialize()
      playerRef.current = player
      setIsPlayerReady(true)
      console.log('🎵 Spotify player initialized')
    } catch (error) {
      console.error('Error initializing Spotify player:', error)
    }
  }

  const authenticate = async () => {
    try {
      const response = await fetch('/api/spotify/auth')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.authUrl) {
        console.log('🎵 Redirecting to Spotify OAuth:', data.authUrl)
        window.location.href = data.authUrl
      } else if (data.error) {
        throw new Error(data.error)
      } else {
        throw new Error('No auth URL received from server')
      }
    } catch (error) {
      console.error('Error starting Spotify auth:', error)
      throw error
    }
  }

  const searchAndPlay = async (query: string) => {
    if (!accessTokenRef.current) {
      await authenticate()
      return
    }

    try {
      // Search for track
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=1`, {
        headers: {
          Authorization: `Bearer ${accessTokenRef.current}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to search Spotify')
      }

      const data = await response.json()
      const tracks = data.tracks?.items || []

      if (tracks.length === 0) {
        throw new Error(`No tracks found for "${query}"`)
      }

      const track = tracks[0]
      setCurrentTrack(track)

      // Play track
      if (playerRef.current && playerRef.current.isPlayerReady()) {
        await playerRef.current.playTrack(track.uri)
        setIsPlaying(true)
      } else {
        throw new Error('Spotify player not ready. Please wait a moment and try again.')
      }

      return track
    } catch (error) {
      console.error('Error searching/playing Spotify:', error)
      throw error
    }
  }

  const play = async () => {
    if (playerRef.current) {
      await playerRef.current.resume()
      setIsPlaying(true)
    }
  }

  const pause = async () => {
    if (playerRef.current) {
      await playerRef.current.pause()
      setIsPlaying(false)
    }
  }

  const nextTrack = async () => {
    if (playerRef.current) {
      await playerRef.current.nextTrack()
    }
  }

  const previousTrack = async () => {
    if (playerRef.current) {
      await playerRef.current.previousTrack()
    }
  }

  const setVolume = async (volume: number) => {
    if (playerRef.current) {
      await playerRef.current.setVolume(volume)
    }
  }

  const disconnect = () => {
    if (playerRef.current) {
      playerRef.current.disconnect()
      playerRef.current = null
      setIsPlayerReady(false)
      setIsAuthenticated(false)
      localStorage.removeItem('spotify_access_token')
      localStorage.removeItem('spotify_refresh_token')
      localStorage.removeItem('spotify_token_expires_at')
    }
  }

  return {
    isAuthenticated,
    isPlayerReady,
    currentTrack,
    isPlaying,
    authenticate,
    searchAndPlay,
    play,
    pause,
    nextTrack,
    previousTrack,
    setVolume,
    disconnect,
  }
}

