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
  const lastErrorRef = useRef<string | null>(null)

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
      console.log('🎤 [VoiceRecognition] onstart - Recognition started')
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('🎤 [VoiceRecognition] onresult - Received result', {
        resultCount: event.results.length,
        isResolved: isResolvedRef.current,
        isListening,
      })
      
      // Update last result time
      lastResultTimeRef.current = Date.now()
      
      // Get all results (including interim)
      const allTranscripts = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')
      
      console.log('🎤 [VoiceRecognition] Accumulated text:', allTranscripts)
      
      // Accumulate text
      accumulatedTextRef.current = allTranscripts
      
      // Clear and reset silence timeout - if no speech for silenceTimeout ms, auto-stop
      if (silenceTimeout > 0 && autoSubmit) {
        if (silenceTimeoutRef.current) {
          console.log('🎤 [VoiceRecognition] Clearing existing silence timeout')
          clearTimeout(silenceTimeoutRef.current)
          silenceTimeoutRef.current = null
        }
        
        // Set new timeout - only stop after silence period
        console.log(`🎤 [VoiceRecognition] Setting silence timeout: ${silenceTimeout}ms`)
        silenceTimeoutRef.current = setTimeout(() => {
          // Check if we have accumulated text
          const textToSubmit = accumulatedTextRef.current.trim()
          console.log('🎤 [VoiceRecognition] Silence timeout fired', {
            textToSubmit,
            isListening,
            isResolved: isResolvedRef.current,
          })
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
        
        console.log('🎤 [VoiceRecognition] Final transcript:', finalTranscript)
        
        if (finalTranscript.trim() && !autoSubmit) {
          // Only call onResult if autoSubmit is false (manual mode)
          onResult(finalTranscript)
        }
        // If autoSubmit is true, wait for silence timeout to submit
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log('🎤 [VoiceRecognition] onerror', {
        error: event.error,
        message: event.message,
        isResolved: isResolvedRef.current,
        isListening,
      })
      
      let errorMessage = ''
      let shouldNotify = false
      let shouldStop = false
      
      switch (event.error) {
        case 'no-speech':
          // Don't notify for no-speech errors - this is normal when user stops talking
          // But don't stop recognition - let it continue
          console.log('🎤 [VoiceRecognition] No speech detected - continuing...')
          return // Don't stop, don't notify
        case 'aborted':
          // Don't notify for aborted - user likely stopped it manually
          // Silently ignore
          console.log('🎤 [VoiceRecognition] Recognition aborted')
          return // Don't stop, don't notify
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.'
          shouldNotify = true
          shouldStop = true
          break
        case 'network':
          // Network errors are common and transient - don't stop recognition
          // Speech Recognition API requires internet connection in Chrome
          console.log('🎤 [VoiceRecognition] Network error - will restart on onend...')
          // Store the error so we can restart in onend
          lastErrorRef.current = 'network'
          // Don't stop recognition for network errors - they're often transient
          return // Don't stop, don't notify
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.'
          shouldNotify = true
          shouldStop = true
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed. Please check your browser settings.'
          shouldNotify = true
          shouldStop = true
          break
        default:
          // Log unknown errors but don't stop - might be transient
          console.log('🎤 [VoiceRecognition] Unknown error:', event.error, '- continuing...')
          return // Don't stop for unknown errors
      }
      
      // Only stop for critical errors
      if (shouldStop) {
        console.log('🎤 [VoiceRecognition] Stopping due to critical error:', event.error)
        setIsListening(false)
        isResolvedRef.current = true
      }
      
      // Only notify user for critical errors
      if (onError && shouldNotify && errorMessage) {
        onError(errorMessage)
      }
    }

    recognition.onend = () => {
      console.log('🎤 [VoiceRecognition] onend', {
        isResolved: isResolvedRef.current,
        isListening,
        accumulatedText: accumulatedTextRef.current,
        hasSilenceTimeout: !!silenceTimeoutRef.current,
        lastError: lastErrorRef.current,
      })
      
      // Clear any pending restart
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = null
      }
      
      // If we explicitly stopped it, don't restart
      if (isResolvedRef.current) {
        console.log('🎤 [VoiceRecognition] onend - Explicitly stopped, not restarting')
        setIsListening(false)
        isRestartingRef.current = false
        lastErrorRef.current = null
        return
      }
      
      // If it ended due to a network error, try to restart
      if (lastErrorRef.current === 'network' && recognitionRef.current && !isRestartingRef.current) {
        console.log('🎤 [VoiceRecognition] onend - Network error detected, restarting...')
        isRestartingRef.current = true
        lastErrorRef.current = null
        
        // Restart after a short delay
        restartTimeoutRef.current = setTimeout(() => {
          try {
            if (recognitionRef.current && !isResolvedRef.current) {
              console.log('🎤 [VoiceRecognition] Restarting after network error...')
              recognitionRef.current.start()
              isRestartingRef.current = false
            } else {
              isRestartingRef.current = false
            }
          } catch (error) {
            console.error('🎤 [VoiceRecognition] Error restarting after network error:', error)
            isRestartingRef.current = false
            setIsListening(false)
          }
        }, 500) // Wait 500ms before restarting
        return
      }
      
      // With continuous=true, onend should rarely fire
      // If it does fire unexpectedly, log it but don't restart to avoid loops
      console.warn('🎤 [VoiceRecognition] onend - Unexpected end event (continuous mode)')
      setIsListening(false)
      isRestartingRef.current = false
      lastErrorRef.current = null
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
    console.log('🎤 [VoiceRecognition] startListening called', {
      hasRecognition: !!recognitionRef.current,
      isListening,
    })
    
    if (recognitionRef.current && !isListening) {
      try {
        isResolvedRef.current = false
        isRestartingRef.current = false
        lastErrorRef.current = null
        accumulatedTextRef.current = ''
        lastResultTimeRef.current = Date.now()
        // Clear any pending restarts
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current)
          restartTimeoutRef.current = null
        }
        // Clear silence timeout if exists
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
          silenceTimeoutRef.current = null
        }
        console.log('🎤 [VoiceRecognition] Starting recognition...')
        recognitionRef.current.start()
      } catch (error) {
        console.error('🎤 [VoiceRecognition] Error starting recognition:', error)
        if (onError) {
          onError('Failed to start voice recognition')
        }
      }
    } else {
      console.log('🎤 [VoiceRecognition] Cannot start - recognition not ready or already listening')
    }
  }

  const stopListening = () => {
    console.log('🎤 [VoiceRecognition] stopListening called')
    
    if (recognitionRef.current) {
      isResolvedRef.current = true // Prevent auto-restart
      isRestartingRef.current = false
      if (silenceTimeoutRef.current) {
        console.log('🎤 [VoiceRecognition] Clearing silence timeout')
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = null
      }
      try {
        console.log('🎤 [VoiceRecognition] Stopping recognition...')
        recognitionRef.current.stop()
      } catch (error) {
        console.error('🎤 [VoiceRecognition] Error stopping recognition:', error)
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

