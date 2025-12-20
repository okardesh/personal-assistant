'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types/chat'
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { format } from 'date-fns'
import { useVoiceRecognition } from '@/lib/useVoiceRecognition'
import { useTextToSpeech } from '@/lib/useTextToSpeech'
import { useOpenAITTS } from '@/lib/useOpenAITTS'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => void
}

export default function ChatInterface({ messages, onSendMessage }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastAssistantMessageRef = useRef<string>('')

  // Voice recognition
  const { isListening, isSupported: isVoiceSupported, toggleListening, stopListening } = useVoiceRecognition({
    onResult: (text) => {
      // Auto-submit after silence
      if (text.trim()) {
        setInput(text.trim())
        // Auto-submit the message
        setTimeout(() => {
          onSendMessage(text.trim())
          setInput('')
        }, 100)
      }
    },
    onError: (error) => {
      // Only log important errors - network errors are often transient
      if (!error.includes('Network error') && !error.includes('No speech detected')) {
        console.warn('Voice recognition error:', error)
        // You could show a toast notification here for important errors
      }
    },
    language: 'tr-TR',
    continuous: false, // Set to false to prevent infinite restart loops - silence timeout will handle stopping
    silenceTimeout: 2000, // 2 seconds of silence before auto-stop
    autoSubmit: true, // Auto-submit after silence
  })

  // Text-to-speech - Use OpenAI TTS for more natural voice
  const { 
    speak: speakOpenAI, 
    stop: stopSpeaking, 
    isSpeaking,
    isLoading: isTTSLoading 
  } = useOpenAITTS({
    enabled: autoSpeak,
    voice: 'nova', // Most natural-sounding voice
  })

  // Fallback to Web Speech API if OpenAI TTS fails
  const { speak: speakFallback } = useTextToSpeech({
    enabled: false, // Disabled by default, only used as fallback
    language: 'tr-TR',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  })

  // Use OpenAI TTS, fallback to Web Speech API
  const speak = async (text: string) => {
    try {
      await speakOpenAI(text)
    } catch (error) {
      console.warn('OpenAI TTS failed, using fallback:', error)
      speakFallback(text)
    }
  }

  // Auto-speak assistant responses
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (
        lastMessage.role === 'assistant' &&
        lastMessage.content !== lastAssistantMessageRef.current &&
        autoSpeak &&
        !isLoading
      ) {
        lastAssistantMessageRef.current = lastMessage.content
        // Clean the text (remove markdown, links, emojis, etc. for better speech)
        const cleanText = lastMessage.content
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links
          .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
          .replace(/\*([^*]+)\*/g, '$1') // Remove italic
          .replace(/#{1,6}\s+/g, '') // Remove headers
          .replace(/\n{2,}/g, '. ') // Replace multiple newlines with period
          // Remove emojis (common emoji patterns)
          .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '') // Emoji surrogates
          .replace(/[\u2600-\u27BF]/g, '') // Miscellaneous Symbols and Dingbats
          .replace(/[\uFE00-\uFE0F]/g, '') // Variation Selectors
          .replace(/[\u200D]/g, '') // Zero Width Joiner
          .replace(/[\u200C]/g, '') // Zero Width Non-Joiner
          .replace(/[\uFEFF]/g, '') // Zero Width No-Break Space
          // Remove common emoji patterns (like 🎵, 📍, ⏰, etc.)
          .replace(/[🎵📍⏰🎶🎤🎧🎨🎭🎪🎬🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🏋🏌🏍🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏱🏲🏳🏴🏵🏶🏷🏸🏹🏺🏻🏼🏽🏾🏿]/g, '')
          .trim()

        if (cleanText) {
          // Small delay to ensure UI is updated
          setTimeout(() => {
            speak(cleanText)
          }, 300)
        }
      }
    }
  }, [messages, autoSpeak, isLoading, speak])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      await onSendMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleVoiceSubmit = async (text: string) => {
    if (!text.trim() || isLoading) return

    setInput('')
    setIsLoading(true)
    stopListening()

    try {
      await onSendMessage(text.trim())
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceToggle = () => {
    if (isListening) {
      toggleListening()
      // If there's text in input, submit it
      if (input.trim()) {
        handleVoiceSubmit(input)
      }
    } else {
      toggleListening()
    }
  }

  return (
    <div className="flex flex-col h-[85vh] bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-lg ${
              message.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                : 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-200'
            }`}>
              {message.role === 'user' ? 'S' : 'AI'}
            </div>
            
            {/* Message Bubble */}
            <div className={`flex flex-col gap-1 max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-5 py-3 shadow-lg transition-all duration-300 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                    : 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 rounded-tl-sm backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{message.content}</p>
              </div>
              <p
                className={`text-xs px-2 ${
                  message.role === 'user'
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {format(message.timestamp, 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-200 shadow-lg">
              AI
            </div>
            <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl rounded-tl-sm px-5 py-3 shadow-lg border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4">
        {/* Voice Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isVoiceSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={isLoading}
                className={`p-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                  isListening
                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
            {isListening && (
              <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Dinleniyor...
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setAutoSpeak(!autoSpeak)
              if (autoSpeak && isSpeaking) {
                stopSpeaking()
              }
            }}
            className={`p-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
              autoSpeak
                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
            title={autoSpeak ? 'Disable auto-speak' : 'Enable auto-speak'}
          >
            {autoSpeak ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Dinleniyor..." : "Mesajınızı yazın veya soru sorun..."}
              className="w-full resize-none rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 max-h-32 shadow-sm"
              rows={1}
              disabled={isLoading || isListening}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isListening}
            className="px-6 py-3.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100 font-medium"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

