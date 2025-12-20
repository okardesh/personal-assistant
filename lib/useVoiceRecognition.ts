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
  silenceTimeout?: number // Auto-stop after silence (in milliseconds)
  autoSubmit?: boolean // Automatically submit result after silence
}

export function useVoiceRecognition({
  onResult,
  onError,
  language = 'tr-TR',
  continuous = false,
  silenceTimeout = 2000, // Default 2 seconds
  autoSubmit = true, // Auto-submit after silence
}: UseVoiceRecognitionOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isResolvedRef = useRef(false)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const accumulatedTextRef = useRef<string>('')
  const lastResultTimeRef = useRef<number>(0)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRestartingRef = useRef(false)

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
    // Always use continuous=true to keep recognition active until silence timeout
    // This prevents recognition from stopping after first result
    recognition.continuous = true
    recognition.interimResults = true // Show interim results for better UX
    recognition.lang = language

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Update last result time
      lastResultTimeRef.current = Date.now()
      
      // Get all results (including interim)
      const allTranscripts = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')
      
      // Accumulate text
      accumulatedTextRef.current = allTranscripts
      
      // Clear and reset silence timeout - if no speech for silenceTimeout ms, auto-stop
      if (silenceTimeout > 0 && autoSubmit) {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
          silenceTimeoutRef.current = null
        }
        
        // Set new timeout - only stop after silence period
        silenceTimeoutRef.current = setTimeout(() => {
          // Check if we have accumulated text
          const textToSubmit = accumulatedTextRef.current.trim()
          if (textToSubmit && recognitionRef.current && isListening) {
            console.log('🛑 Auto-stopping after silence, submitting:', textToSubmit)
            isResolvedRef.current = true
            recognitionRef.current.stop()
            onResult(textToSubmit)
          } else if (recognitionRef.current && isListening) {
            // No text, just stop
            console.log('🛑 Auto-stopping after silence (no text)')
            isResolvedRef.current = true
            recognitionRef.current.stop()
          }
        }, silenceTimeout)
      }
      
      // Only process final results (when user pauses) - but don't stop immediately
      const finalResults = Array.from(event.results)
        .filter((result) => result.isFinal)
      
      if (finalResults.length > 0) {
        const finalTranscript = finalResults
          .map((result) => result[0].transcript)
          .join('')
        
        if (finalTranscript.trim() && !autoSubmit) {
          // Only call onResult if autoSubmit is false (manual mode)
          onResult(finalTranscript)
        }
        // If autoSubmit is true, wait for silence timeout to submit
      }
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
      // Clear any pending restart
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = null
      }
      
      // If we explicitly stopped it, don't restart
      if (isResolvedRef.current) {
        setIsListening(false)
        isRestartingRef.current = false
        return
      }
      
      // If not explicitly stopped and we have accumulated text, we might want to restart
      // But only if silence timeout hasn't fired yet
      // Actually, with continuous=true, onend should rarely fire
      // If it does fire, it's likely because of an error or browser limitation
      // In that case, don't restart to avoid loops
      setIsListening(false)
      isRestartingRef.current = false
    }

    recognitionRef.current = recognition

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      isResolvedRef.current = true
      isRestartingRef.current = false
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          // Ignore errors when stopping
        }
      }
    }
  }, [onResult, onError, language, continuous, silenceTimeout, autoSubmit])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        isResolvedRef.current = false
        isRestartingRef.current = false
        accumulatedTextRef.current = ''
        lastResultTimeRef.current = Date.now()
        // Clear any pending restarts
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current)
          restartTimeoutRef.current = null
        }
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
    if (recognitionRef.current) {
      isResolvedRef.current = true // Prevent auto-restart
      isRestartingRef.current = false
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = null
      }
      try {
        recognitionRef.current.stop()
      } catch (error) {
        // Ignore errors when stopping
      }
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

