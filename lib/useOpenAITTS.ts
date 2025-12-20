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
      const url = URL.createObjectURL(blob)
      audio.src = url

      // Handle audio events
      audio.onplay = () => {
        setIsSpeaking(true)
        setIsLoading(false)
      }

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
      }

      audio.onerror = (error) => {
        console.error('Audio playback error:', error)
        setIsSpeaking(false)
        setIsLoading(false)
        URL.revokeObjectURL(url)
      }

      audioRef.current = audio
      await audio.play()
    } catch (error) {
      console.error('TTS error:', error)
      setIsLoading(false)
      setIsSpeaking(false)
    }
  }

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
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

