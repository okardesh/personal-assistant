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
      // Only set listening to false if we explicitly stopped it
      if (isResolvedRef.current) {
        setIsListening(false)
        return
      }
      
      // If not explicitly stopped, check if we should restart
      // For continuous mode OR when using silence timeout (to keep listening until timeout)
      if (recognitionRef.current && !isResolvedRef.current) {
        // Check if we're in continuous mode OR if we have accumulated text (user was speaking)
        const shouldRestart = continuous || (accumulatedTextRef.current.trim().length > 0 && silenceTimeout > 0)
        
        if (shouldRestart) {
          // Small delay before restarting to avoid rapid restarts
          setTimeout(() => {
            try {
              if (recognitionRef.current && !isResolvedRef.current) {
                console.log('🔄 Restarting speech recognition')
                recognitionRef.current.start()
              }
            } catch (error) {
              // Ignore errors when restarting (might already be started)
              console.log('Speech recognition restart:', error instanceof Error ? error.message : 'unknown')
              // If restart fails, set listening to false
              setIsListening(false)
            }
          }, 100)
        } else {
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onResult, onError, language, continuous, silenceTimeout, autoSubmit])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        isResolvedRef.current = false
        accumulatedTextRef.current = ''
        lastResultTimeRef.current = Date.now()
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
      isResolvedRef.current = true // Prevent auto-restart
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
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

