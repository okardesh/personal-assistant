'use client'

import { useState, useRef, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import { Message } from '@/types/chat'
import { getClientLocation } from '@/lib/locationClient'
import { useSpotify } from '@/lib/useSpotify'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI-powered personal assistant, powered by ChatGPT. I can help you with your calendar, emails, location-based tasks, and answer your questions. What would you like to do?",
      timestamp: new Date(),
    },
  ])

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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
          Personal Assistant
        </h1>
        <ChatInterface messages={messages} onSendMessage={handleSendMessage} />
      </div>
    </main>
  )
}

