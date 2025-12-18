'use client'

import { useState, useRef, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import { Message } from '@/types/chat'
import { getClientLocation } from '@/lib/locationClient'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI-powered personal assistant, powered by ChatGPT. I can help you with your calendar, emails, location-based tasks, and answer your questions. What would you like to do?",
      timestamp: new Date(),
    },
  ])

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
                         lowerContent.includes('nearby') ||
                         lowerContent.includes('etrafımda') ||
                         lowerContent.includes('çevremde') ||
                         lowerContent.includes('yakınımda') ||
                         lowerContent.includes('around me') ||
                         lowerContent.includes('near me')

    let location = null
    if (needsLocation) {
      // Try to get location - this will prompt the user for permission
      try {
        console.log('📍 Requesting location permission...')
        location = await getClientLocation()
        if (location) {
          console.log('✅ Location obtained:', location.latitude, location.longitude)
        } else {
          console.log('⚠️ Location permission denied or unavailable')
        }
      } catch (error) {
        console.error('❌ Location error:', error)
        // Continue without location - OpenAI will handle it
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
      }

      setMessages((prev) => [...prev, assistantMessage])
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

