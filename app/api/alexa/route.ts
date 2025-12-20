import { NextRequest, NextResponse } from 'next/server'
import { processAlexaRequest } from '@/lib/alexa'
import { AlexaRequest } from '@/types/alexa'

/**
 * Alexa Skills Kit webhook endpoint
 * 
 * This endpoint receives requests from Amazon Alexa and processes them
 * using the existing assistant API.
 * 
 * To set up:
 * 1. Create an Alexa Skill in the Amazon Developer Console
 * 2. Set the endpoint URL to: https://your-domain.com/api/alexa
 * 3. Configure the skill with appropriate intents
 */
export async function POST(request: NextRequest) {
  try {
    // Parse Alexa request
    const alexaRequest: AlexaRequest = await request.json()

    // Validate request
    if (!alexaRequest || !alexaRequest.request) {
      return NextResponse.json(
        { error: 'Invalid Alexa request' },
        { status: 400 }
      )
    }

    // Optional: Verify the request is from Amazon
    // In production, you should verify the request signature
    // For now, we'll skip this for development

    // Process the request
    const alexaResponse = await processAlexaRequest(alexaRequest)

    // Return Alexa response
    return NextResponse.json(alexaResponse)
  } catch (error) {
    console.error('Alexa API error:', error)

    // Return error response in Alexa format
    return NextResponse.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        },
        shouldEndSession: true,
      },
    })
  }
}

// Handle GET requests (for health checks)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Alexa Skills Kit endpoint is running',
    timestamp: new Date().toISOString(),
  })
}

