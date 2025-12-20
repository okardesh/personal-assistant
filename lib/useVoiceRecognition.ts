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
  const networkErrorCountRef = useRef<number>(0)
  const lastNetworkErrorTimeRef = useRef<number>(0)

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
    
    // Detect Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                     /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    // Safari has different behavior - continuous mode may not work the same way
    // Safari may need continuous=false and manual restart handling
    if (isSafari) {
      console.log('🎤 [VoiceRecognition] Safari detected - using Safari-specific settings')
      // Safari may have issues with continuous=true
      // Try continuous=false first, and we'll handle restart manually
      recognition.continuous = false
      recognition.interimResults = true
    } else {
      // Chrome/Edge
      recognition.continuous = true
      recognition.interimResults = true
    }
    
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
      
      // Reset network error count on successful result
      if (networkErrorCountRef.current > 0) {
        console.log('🎤 [VoiceRecognition] Resetting network error count - got result')
        networkErrorCountRef.current = 0
      }
      
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
          // "no-speech" error means browser stopped recognition because no speech was detected
          // This is normal when user hasn't started speaking yet
          // We should restart recognition to keep it active
          console.log('🎤 [VoiceRecognition] No speech detected - will restart on onend...')
          // Store the error so we can restart in onend
          lastErrorRef.current = 'no-speech'
          // Don't change isListening state - let onend handle restart
          return // Don't stop, don't notify
        case 'aborted':
          // "aborted" error in Safari often means recognition failed to start properly
          // In Safari, we should try to restart
          const isSafariAbort = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                                /iPad|iPhone|iPod/.test(navigator.userAgent)
          
          if (isSafariAbort) {
            console.log('🎤 [VoiceRecognition] Safari: Recognition aborted - will restart on onend...', {
              message: event.message,
            })
            // Store the error so we can restart in onend
            lastErrorRef.current = 'aborted'
            return // Don't stop, don't notify, but mark for restart
          } else {
            // For other browsers, aborted usually means user stopped it manually
            console.log('🎤 [VoiceRecognition] Recognition aborted')
            return // Don't stop, don't notify
          }
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.'
          shouldNotify = true
          shouldStop = true
          break
        case 'network':
          // Network errors are common and transient - don't stop recognition
          // Speech Recognition API requires internet connection in Chrome
          // Safari may have different network error behavior
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                           /iPad|iPhone|iPod/.test(navigator.userAgent)
          
          const now = Date.now()
          // Reset counter if last error was more than 10 seconds ago
          if (now - lastNetworkErrorTimeRef.current > 10000) {
            networkErrorCountRef.current = 0
          }
          networkErrorCountRef.current++
          lastNetworkErrorTimeRef.current = now
          
          console.log('🎤 [VoiceRecognition] Network error - will restart on onend...', {
            errorCount: networkErrorCountRef.current,
            isSafari,
          })
          
          // Safari may have persistent network errors - be more lenient
          const maxNetworkErrors = isSafari ? 5 : 3
          
          // If too many network errors in a short time, stop trying
          if (networkErrorCountRef.current >= maxNetworkErrors) {
            console.error('🎤 [VoiceRecognition] Too many network errors, stopping recognition', {
              errorCount: networkErrorCountRef.current,
              isSafari,
            })
            setIsListening(false)
            isResolvedRef.current = true
            lastErrorRef.current = null // Clear error ref to prevent restart
            if (onError) {
              if (isSafari) {
                onError('Safari\'de speech recognition için internet bağlantısı gereklidir. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.')
              } else {
                onError('Speech recognition service is unavailable. Please check your internet connection and try again.')
              }
            }
            return
          }
          
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
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                       /iPad|iPhone|iPod/.test(navigator.userAgent)
      
      console.log('🎤 [VoiceRecognition] onend', {
        isResolved: isResolvedRef.current,
        isListening,
        accumulatedText: accumulatedTextRef.current,
        hasSilenceTimeout: !!silenceTimeoutRef.current,
        lastError: lastErrorRef.current,
        isSafari,
      })
      
      // Clear any pending restart
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = null
      }
      
      // Safari-specific: If aborted error occurred, reset isResolved to allow restart
      // Safari's "aborted" error with "Corrupt" message is often recoverable
      // IMPORTANT: Check this BEFORE checking isResolved, so we can reset it
      if (isSafari && lastErrorRef.current === 'aborted') {
        console.log('🎤 [VoiceRecognition] Safari: aborted error detected, resetting isResolved to allow restart', {
          isResolved: isResolvedRef.current,
        })
        isResolvedRef.current = false // Reset to allow restart
      }
      
      // Safari-specific: If onend fires immediately after start (before onstart),
      // it means recognition failed to start. Try to restart.
      // Even if isResolved is true, we should try to restart in Safari
      if (isSafari && lastErrorRef.current === null && accumulatedTextRef.current === '' && !isRestartingRef.current) {
        console.log('🎤 [VoiceRecognition] Safari: onend fired without onstart - recognition may have failed to start, will retry...', {
          isResolved: isResolvedRef.current,
        })
        // This is likely a Safari quirk - recognition didn't actually start
        // Reset and try again, even if isResolved is true
        isRestartingRef.current = true
        isResolvedRef.current = false // Reset to allow restart
        lastErrorRef.current = 'no-speech' // Treat as no-speech to trigger restart
        
        // Immediately trigger restart logic below
        // Don't return here - let it fall through to restart logic
      }
      
      // If it ended due to a network error or no-speech, try to restart
      // Network errors and no-speech are transient and should trigger a restart
      // But only if we haven't exceeded the error limit
      // IMPORTANT: Check lastError BEFORE checking isResolved, and don't clear it until after restart
      const maxNetworkErrors = isSafari ? 5 : 3
      
      const shouldRestart = 
        (lastErrorRef.current === 'network' && networkErrorCountRef.current < maxNetworkErrors) ||
        (lastErrorRef.current === 'no-speech' && !isResolvedRef.current) ||
        (lastErrorRef.current === 'aborted' && isSafari && !isResolvedRef.current)
      
      if (shouldRestart && recognitionRef.current && !isRestartingRef.current) {
        const errorType = lastErrorRef.current === 'network' ? 'Network' : 
                          lastErrorRef.current === 'aborted' ? 'Aborted' : 'No-speech'
        console.log(`🎤 [VoiceRecognition] onend - ${errorType} error detected, restarting...`, {
          errorCount: networkErrorCountRef.current,
          errorType: lastErrorRef.current,
        })
        isRestartingRef.current = true
        // Reset isResolved so we can restart
        isResolvedRef.current = false
        // DON'T clear lastErrorRef here - we need it for the restart check
        // lastErrorRef.current = null
        
        // Restart after a longer delay to avoid rapid restarts
        restartTimeoutRef.current = setTimeout(() => {
          try {
            // For no-speech and aborted (Safari), always try to restart if not resolved
            // For network, only restart if error count is below threshold
            const canRestart = 
              (lastErrorRef.current === 'no-speech' && !isResolvedRef.current) ||
              (lastErrorRef.current === 'aborted' && isSafari && !isResolvedRef.current) ||
              (lastErrorRef.current === 'network' && !isResolvedRef.current && networkErrorCountRef.current < maxNetworkErrors)
            
            if (recognitionRef.current && canRestart) {
              console.log(`🎤 [VoiceRecognition] Restarting after ${lastErrorRef.current} error...`)
              recognitionRef.current.start()
              isRestartingRef.current = false
              // Only clear lastError after successful restart
              lastErrorRef.current = null
            } else {
              console.log('🎤 [VoiceRecognition] Cannot restart - too many errors or recognition resolved', {
                errorCount: networkErrorCountRef.current,
                errorType: lastErrorRef.current,
              })
              isRestartingRef.current = false
              setIsListening(false)
              isResolvedRef.current = true
              lastErrorRef.current = null
              if (onError && lastErrorRef.current === 'network' && networkErrorCountRef.current >= maxNetworkErrors) {
                if (isSafari) {
                  onError('Safari\'de speech recognition için internet bağlantısı gereklidir. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.')
                } else {
                  onError('Speech recognition service is unavailable. Please check your internet connection and try again.')
                }
              }
            }
          } catch (error) {
            console.error(`🎤 [VoiceRecognition] Error restarting after ${lastErrorRef.current} error:`, error)
            isRestartingRef.current = false
            setIsListening(false)
            isResolvedRef.current = true
            lastErrorRef.current = null
          }
        }, lastErrorRef.current === 'no-speech' ? 300 : 
           lastErrorRef.current === 'aborted' ? 500 : 
           (isSafari ? 500 : 1000)) // Faster restart for no-speech (300ms), aborted (500ms), Safari network (500ms), Chrome network (1s)
        return
      } else if (lastErrorRef.current === 'network' && networkErrorCountRef.current >= maxNetworkErrors) {
        console.error('🎤 [VoiceRecognition] Too many network errors, not restarting', {
          errorCount: networkErrorCountRef.current,
        })
        setIsListening(false)
        isResolvedRef.current = true
        lastErrorRef.current = null
        if (onError) {
          onError('Speech recognition service is unavailable. Please check your internet connection and try again.')
        }
        return
      }
      
      // If we explicitly stopped it (and it's not a restartable error), don't restart
      // IMPORTANT: Check restartable errors BEFORE checking isResolved
      const isRestartableError = lastErrorRef.current === 'network' || 
                                 lastErrorRef.current === 'no-speech' || 
                                 (lastErrorRef.current === 'aborted' && isSafari)
      
      // If it's a restartable error, we've already handled it above, so skip this check
      if (!isRestartableError && isResolvedRef.current) {
        console.log('🎤 [VoiceRecognition] onend - Explicitly stopped, not restarting', {
          lastError: lastErrorRef.current,
          isSafari,
          isRestartableError,
        })
        setIsListening(false)
        isRestartingRef.current = false
        lastErrorRef.current = null
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
        // Reset network error count when manually starting
        networkErrorCountRef.current = 0
        lastNetworkErrorTimeRef.current = 0
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

