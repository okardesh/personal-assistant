'use client'

import { useRef, useEffect } from 'react'

interface UseTextToSpeechOptions {
  enabled?: boolean
  language?: string
  rate?: number
  pitch?: number
  volume?: number
}

export function useTextToSpeech({
  enabled = true,
  language = 'tr-TR',
  rate = 1.0,
  pitch = 1.0,
  volume = 1.0,
}: UseTextToSpeechOptions = {}) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = (text: string) => {
    if (!enabled || typeof window === 'undefined') return

    // Check if browser supports Speech Synthesis
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis is not supported in this browser')
      return
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel()

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onerror = (event) => {
      // Speech synthesis errors are usually non-critical
      // Silently ignore all errors - text-to-speech is optional
      // Most errors (not-allowed, synthesis-failed) are browser-specific and don't affect functionality
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const stop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  const pause = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause()
    }
  }

  const resume = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume()
    }
  }

  const isSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking
    }
    return false
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
  }
}

