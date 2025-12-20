'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types/chat'
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { format } from 'date-fns'
import { useVoiceRecognition } from '@/lib/useVoiceRecognition'
import { useTextToSpeech } from '@/lib/useTextToSpeech'
import { useOpenAITTS } from '@/lib/useOpenAITTS'
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
    continuous: false, // Don't keep listening - auto-stop after silence
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
    <div className="flex flex-col h-[80vh] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user'
                    ? 'text-blue-100'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {format(message.timestamp, 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        {/* Voice Controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isVoiceSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
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
              <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Listening...
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
            className={`p-2 rounded-lg transition-colors ${
              autoSpeak
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
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
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Type your command or question..."}
            className="flex-1 resize-none rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
            rows={1}
            disabled={isLoading || isListening}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isListening}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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

