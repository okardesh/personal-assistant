import { NextRequest, NextResponse } from 'next/server'
import { chatWithOpenAI } from '@/lib/openai'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, location, conversationHistory } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Convert conversation history to OpenAI format
    const messages = (conversationHistory || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    })

    // Use OpenAI for intelligent responses
    const response = await chatWithOpenAI(messages, location)

    // Parse response for Spotify actions
    let spotifyAction = null
    let cleanResponse = response
    
    try {
      // Check if response contains Spotify action in function result format
      // OpenAI might return: {"spotifyAction": {...}, "message": "..."}
      const jsonMatch = response.match(/\{"spotifyAction":\s*\{[^}]+\}[^}]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.spotifyAction) {
          spotifyAction = parsed.spotifyAction
          cleanResponse = parsed.message || response.replace(jsonMatch[0], '').trim()
        }
      }
    } catch (error) {
      // Ignore parsing errors, use original response
    }

    return NextResponse.json({ 
      response: cleanResponse,
      spotifyAction 
    })
  } catch (error) {
    console.error('Assistant API error:', error)
    return NextResponse.json(
      { error: 'Failed to process command' },
      { status: 500 }
    )
  }
}

