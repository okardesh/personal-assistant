import { NextRequest, NextResponse } from 'next/server'
import { chatWithOpenAI } from '@/lib/openai'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, location, conversationHistory, userContext } = await request.json()

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
    const result = await chatWithOpenAI(messages, location, userContext)

    return NextResponse.json({ 
      response: result.response,
      spotifyAction: result.spotifyAction 
    })
  } catch (error) {
    console.error('Assistant API error:', error)
    return NextResponse.json(
      { error: 'Failed to process command' },
      { status: 500 }
    )
  }
}

