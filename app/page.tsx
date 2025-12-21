'use client'

import { useState, useRef, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import { Message } from '@/types/chat'
import { getClientLocation } from '@/lib/locationClient'
import { useSpotify } from '@/lib/useSpotify'
import { 
  saveMessages, 
  loadMessages, 
  loadUserContext, 
  updateUserContext,
  extractUserInfoFromMessages,
  StoredMessage 
} from '@/lib/storage'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [userContext, setUserContext] = useState(loadUserContext())
  
  // Load messages and user context on mount
  useEffect(() => {
    const storedMessages = loadMessages()
    if (storedMessages.length > 0) {
      // Convert stored messages to Message format
      const loadedMessages: Message[] = storedMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        spotifyAction: msg.spotifyAction,
      }))
      setMessages(loadedMessages)
      console.log('📚 Loaded', loadedMessages.length, 'messages from storage')
    }
    
    // Load user context
    const context = loadUserContext()
    if (context) {
      setUserContext(context)
      console.log('👤 Loaded user context:', context)
    }
  }, [])
  
  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const messagesToSave: StoredMessage[] = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        spotifyAction: msg.spotifyAction,
      }))
      saveMessages(messagesToSave)
      
      // Extract user info from messages and update context
      const extractedInfo = extractUserInfoFromMessages(messagesToSave)
      if (extractedInfo.name && (!userContext || userContext.name !== extractedInfo.name)) {
        updateUserContext(extractedInfo)
        setUserContext(prev => ({ ...prev, ...extractedInfo }))
      }
    }
  }, [messages, userContext])

  // Spotify integration
  const spotify = useSpotify()

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Check if location is needed (OpenAI will handle this intelligently, but we can pre-fetch)
    const lowerContent = content.toLowerCase()
    const needsLocation = lowerContent.includes('location') || 
                         lowerContent.includes('where am i') || 
                         lowerContent.includes('weather') ||
                         lowerContent.includes('hava') ||
                         lowerContent.includes('nearby') ||
                         lowerContent.includes('etrafımda') ||
                         lowerContent.includes('çevremde') ||
                         lowerContent.includes('yakınımda') ||
                         lowerContent.includes('around me') ||
                         lowerContent.includes('near me') ||
                         lowerContent.includes('nasıl giderim') ||
                         lowerContent.includes('nasıl gideerim') || // typo variant
                         lowerContent.includes('yol tarifi') ||
                         lowerContent.includes('directions') ||
                         lowerContent.includes('ne kadar sürer') ||
                         lowerContent.includes('how to get') ||
                         lowerContent.includes('gideceğinizi') ||
                         lowerContent.includes('gidebilirim') ||
                         lowerContent.includes('ulaşabilirim') ||
                         lowerContent.includes('gideerim') || // typo variant
                         lowerContent.includes('gidebilir miyim')

    let location = null
    if (needsLocation) {
      // Check if permission was previously denied
      const permissionDenied = typeof window !== 'undefined' && 
        localStorage.getItem('location-permission-denied') === 'true'
      
      if (!permissionDenied) {
        // Try to get location - this will prompt the user for permission if needed
        // If permission was previously granted, it will use cached location
        try {
          console.log('📍 Requesting location...')
          // Check if we have a valid cached location
          const hasCache = typeof window !== 'undefined' && 
            localStorage.getItem('personal-assistant-location') !== null
          
          // For directions queries, always try to get fresh location if no cache
          // This ensures the permission prompt appears if needed
          const forceRefresh = !hasCache
          console.log('📍 Force refresh:', forceRefresh, 'Has cache:', hasCache)
          
          location = await getClientLocation(forceRefresh)
          if (location) {
            console.log('✅ Location obtained:', location.latitude, location.longitude)
          } else {
            console.log('⚠️ Location not available - permission may be needed')
            // If location is null, it might be because permission wasn't granted
            // Clear the denied flag to allow retry
            if (typeof window !== 'undefined') {
              const denied = localStorage.getItem('location-permission-denied')
              console.log('📍 Permission denied flag:', denied)
            }
          }
        } catch (error) {
          console.error('❌ Location error:', error)
          // Continue without location - OpenAI will handle it
        }
      } else {
        console.log('📍 Location permission was previously denied - clearing flag to allow retry')
        // Clear the denied flag to allow user to try again
        if (typeof window !== 'undefined') {
          localStorage.removeItem('location-permission-denied')
        }
      }
    }

    // Prepare conversation history (last 10 messages for context)
    const recentMessages = messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    // Send to API with conversation history
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: content, 
          location,
          conversationHistory: recentMessages,
          userContext: userContext || null,
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an error processing your request.',
        timestamp: new Date(),
        spotifyAction: data.spotifyAction, // Pass Spotify action to message
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Handle Spotify actions
      if (data.spotifyAction) {
        handleSpotifyAction(data.spotifyAction)
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleSpotifyAction = async (action: any) => {
    if (!spotify.isAuthenticated) {
      // Show message to authenticate
      const authMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Spotify\'a bağlanmak için Spotify hesabınızla giriş yapmanız gerekiyor. Spotify Premium hesabınız olmalı. Yönlendiriliyorsunuz...',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, authMessage])
      
      try {
        await spotify.authenticate()
      } catch (error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Spotify bağlantı hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}. Lütfen tekrar deneyin.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
      return
    }

    try {
      if (action.action === 'play' && action.query) {
        await spotify.searchAndPlay(action.query)
      } else if (action.action === 'control') {
        switch (action.control) {
          case 'play':
            await spotify.play()
            break
          case 'pause':
            await spotify.pause()
            break
          case 'next':
            await spotify.nextTrack()
            break
          case 'previous':
            await spotify.previousTrack()
            break
          case 'volume_up':
            // Get current volume and increase
            await spotify.setVolume(75)
            break
          case 'volume_down':
            await spotify.setVolume(25)
            break
        }
      }
    } catch (error) {
      console.error('Spotify action error:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Spotify hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Background decoration with high contrast */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-400/40 dark:bg-amber-800/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-400/40 dark:bg-rose-800/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-400/30 dark:bg-orange-800/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-1/4 right-1/3 w-72 h-72 bg-violet-400/25 dark:bg-violet-800/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>
      
      <div className="w-full max-w-5xl relative z-10">
        {/* Header with Logo */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="/logo.svg" 
              alt="Wise Assistant Logo" 
              className="w-16 h-16 animate-in fade-in slide-in-from-top-4"
              style={{ animationDelay: '0.2s' }}
            />
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent dark:from-amber-400 dark:via-orange-400 dark:to-rose-400 drop-shadow-lg">
              Wise Assistant
            </h1>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-lg font-medium">
            AI destekli kişisel asistanınız
          </p>
        </div>
        
        <ChatInterface messages={messages} onSendMessage={handleSendMessage} />
      </div>
    </main>
  )
}

