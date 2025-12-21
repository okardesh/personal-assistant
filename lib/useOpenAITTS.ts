'use client'

import { useRef, useState } from 'react'

interface UseOpenAITTSOptions {
  enabled?: boolean
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
}

export function useOpenAITTS({
  enabled = true,
  voice = 'nova', // 'nova' is OpenAI's most natural-sounding voice
}: UseOpenAITTSOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null) // Track current blob URL
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const speak = async (text: string) => {
    if (!enabled || typeof window === 'undefined' || !text.trim()) return

    try {
      // Stop any ongoing speech and clean up
      stop()

      setIsLoading(true)

      // Call TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
        }),
      })

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`)
      }

      // Get blob
      const blob = await response.blob()
      
      // Check if blob is valid
      if (!blob || blob.size === 0) {
        throw new Error('Invalid audio blob received')
      }
      
      // Create new blob URL
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      // Create new audio element (don't reuse old one)
      const audio = new Audio()
      audio.src = url

      // Handle audio events
      audio.onplay = () => {
        setIsSpeaking(true)
        setIsLoading(false)
      }

      audio.onended = () => {
        setIsSpeaking(false)
        setIsLoading(false)
        // Clean up blob URL
        if (blobUrlRef.current) {
          try {
            URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = null
          } catch (e) {
            console.warn('Error revoking blob URL on ended:', e)
          }
        }
      }

      audio.onerror = (error) => {
        console.error('Audio playback error:', error)
        setIsSpeaking(false)
        setIsLoading(false)
        // Clean up blob URL
        if (blobUrlRef.current) {
          try {
            URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = null
          } catch (e) {
            console.warn('Error revoking blob URL on error:', e)
          }
        }
      }

      // Store audio reference
      audioRef.current = audio
      
      // Play audio with error handling
      try {
        await audio.play()
      } catch (playError) {
        console.error('Error playing audio:', playError)
        setIsSpeaking(false)
        setIsLoading(false)
        // Clean up on play error
        if (blobUrlRef.current) {
          try {
            URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = null
          } catch (e) {
            console.warn('Error revoking blob URL on play error:', e)
          }
        }
        throw playError
      }
    } catch (error) {
      console.error('TTS error:', error)
      setIsLoading(false)
      setIsSpeaking(false)
      // Clean up on any error
      if (blobUrlRef.current) {
        try {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      // Don't set src to '' here - let onended/onerror handle cleanup
      setIsSpeaking(false)
    }
    // Clean up blob URL if exists
    if (blobUrlRef.current) {
      try {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      } catch (e) {
        console.warn('Error revoking blob URL in stop:', e)
      }
    }
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsSpeaking(false)
    }
  }

  const resume = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsSpeaking(true)
    }
  }

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isLoading,
  }
}

