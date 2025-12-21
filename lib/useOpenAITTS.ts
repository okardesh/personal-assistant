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
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const speak = async (text: string) => {
    if (!enabled || typeof window === 'undefined' || !text.trim()) return

    try {
      // Stop any ongoing speech
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

      // Create audio element
      const audio = new Audio()
      const blob = await response.blob()
      
      // Check if blob is valid
      if (!blob || blob.size === 0) {
        throw new Error('Invalid audio blob received')
      }
      
      const url = URL.createObjectURL(blob)
      audio.src = url

      // Store URL for cleanup
      const currentUrl = url

      // Handle audio events
      audio.onplay = () => {
        setIsSpeaking(true)
        setIsLoading(false)
      }

      audio.onended = () => {
        setIsSpeaking(false)
        setIsLoading(false)
        // Clean up blob URL
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl)
        }
      }

      audio.onerror = (error) => {
        console.error('Audio playback error:', error)
        setIsSpeaking(false)
        setIsLoading(false)
        // Clean up blob URL
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl)
        }
      }

      // Clean up previous audio if exists
      if (audioRef.current) {
        const prevSrc = audioRef.current.src
        audioRef.current.pause()
        audioRef.current.src = ''
        // Revoke previous blob URL if it was a blob URL
        if (prevSrc && prevSrc.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(prevSrc)
          } catch (e) {
            // Ignore errors when revoking
          }
        }
      }

      audioRef.current = audio
      
      // Play audio with error handling
      try {
        await audio.play()
      } catch (playError) {
        console.error('Error playing audio:', playError)
        setIsSpeaking(false)
        setIsLoading(false)
        URL.revokeObjectURL(currentUrl)
        throw playError
      }
    } catch (error) {
      console.error('TTS error:', error)
      setIsLoading(false)
      setIsSpeaking(false)
    }
  }

  const stop = () => {
    if (audioRef.current) {
      const src = audioRef.current.src
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
      // Clean up blob URL
      if (src && src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(src)
        } catch (e) {
          // Ignore errors when revoking
        }
      }
      setIsSpeaking(false)
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

