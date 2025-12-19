'use client'

import { useState, useRef, useEffect } from 'react'

// Type definitions for Speech Recognition API
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}

interface UseVoiceRecognitionOptions {
  onResult: (text: string) => void
  onError?: (error: string) => void
  language?: string
  continuous?: boolean
}

export function useVoiceRecognition({
  onResult,
  onError,
  language = 'tr-TR',
  continuous = false,
}: UseVoiceRecognitionOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      if (onError) {
        onError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      }
      return
    }

    setIsSupported(true)
    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = true // Show interim results for better UX
    recognition.lang = language

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Get all results (including interim)
      const allTranscripts = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')
      
      // Only process final results (when user pauses)
      const finalResults = Array.from(event.results)
        .filter((result) => result.isFinal)
      
      if (finalResults.length > 0) {
        const finalTranscript = finalResults
          .map((result) => result[0].transcript)
          .join('')
        
        if (finalTranscript.trim()) {
          onResult(finalTranscript)
        }
      }
      
      // Don't stop automatically - let user control it with the button
      // The recognition will continue listening until user stops it
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false)
      let errorMessage = ''
      let shouldNotify = false
      
      switch (event.error) {
        case 'no-speech':
          // Don't notify for no-speech errors - this is normal when user stops talking
          // Silently ignore
          return
        case 'aborted':
          // Don't notify for aborted - user likely stopped it manually
          // Silently ignore
          return
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.'
          shouldNotify = true
          break
        case 'network':
          // Network errors are common and transient - silently ignore
          // Speech Recognition API requires internet connection in Chrome
          return
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.'
          shouldNotify = true
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed. Please check your browser settings.'
          shouldNotify = true
          break
        default:
          // Silently ignore unknown errors
          return
      }
      
      // Only notify user for critical errors
      if (onError && shouldNotify && errorMessage) {
        onError(errorMessage)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onResult, onError, language, continuous])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error('Error starting recognition:', error)
        if (onError) {
          onError('Failed to start voice recognition')
        }
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  }
}

