import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Lazy initialize OpenAI client
let openaiInstance: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiInstance = new OpenAI({
      apiKey: apiKey,
    })
  }
  return openaiInstance
}

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy' } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Clean text - remove emojis and markdown
    const cleanText = text
      .replace(/[🎵📍⏰🎤🎧📅📋✅⚠️❌⏭️]/g, '') // Remove emojis
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links
      .trim()

    if (!cleanText) {
      return NextResponse.json(
        { error: 'No text to speak after cleaning' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    
    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // or 'tts-1-hd' for higher quality (more expensive)
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: cleanText,
      response_format: 'mp3',
      speed: 1.0, // Normal speed
    })

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer())

    // Return audio as MP3
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}

