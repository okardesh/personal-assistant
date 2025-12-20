import { AlexaRequest, AlexaResponse } from '@/types/alexa'
import { chatWithOpenAI } from './openai'

/**
 * Process Alexa request and generate response
 */
export async function processAlexaRequest(
  alexaRequest: AlexaRequest
): Promise<AlexaResponse> {
  const requestType = alexaRequest.request.type
  const sessionAttributes = alexaRequest.session.attributes || {}

  // Handle different request types
  switch (requestType) {
    case 'LaunchRequest':
      return handleLaunchRequest(sessionAttributes)

    case 'IntentRequest':
      return handleIntentRequest(alexaRequest, sessionAttributes)

    case 'SessionEndedRequest':
      return handleSessionEndedRequest()

    default:
      return createResponse(
        'Üzgünüm, isteğinizi anlayamadım. Lütfen tekrar deneyin.',
        false
      )
  }
}

/**
 * Handle LaunchRequest - when user opens the skill
 */
function handleLaunchRequest(
  sessionAttributes: Record<string, any>
): AlexaResponse {
  const welcomeMessage =
    'Merhaba! Kişisel asistanınıza hoş geldiniz. Size nasıl yardımcı olabilirim? Takviminizi kontrol edebilir, e-postalarınızı okuyabilir, hava durumunu sorgulayabilir ve daha fazlasını yapabilirim.'

  return createResponse(welcomeMessage, false, sessionAttributes)
}

/**
 * Handle IntentRequest - when user says something
 */
async function handleIntentRequest(
  alexaRequest: AlexaRequest,
  sessionAttributes: Record<string, any>
): Promise<AlexaResponse> {
  const intent = alexaRequest.request.intent
  if (!intent) {
    return createResponse(
      'Üzgünüm, isteğinizi anlayamadım. Lütfen tekrar deneyin.',
      false,
      sessionAttributes
    )
  }

  const intentName = intent.name

  // Handle built-in intents
  if (intentName === 'AMAZON.CancelIntent' || intentName === 'AMAZON.StopIntent') {
    return createResponse('Görüşmek üzere!', true, sessionAttributes)
  }

  if (intentName === 'AMAZON.HelpIntent') {
    const helpMessage =
      'Size şunlarda yardımcı olabilirim: Takviminizi kontrol etmek için "takvimimi göster" veya "bugünkü randevularım" diyebilirsiniz. E-postalarınızı kontrol etmek için "e-postalarımı kontrol et" diyebilirsiniz. Hava durumu için "hava durumu nasıl" diyebilirsiniz. Başka bir şey sormak ister misiniz?'
    return createResponse(helpMessage, false, sessionAttributes)
  }

  // Extract user message from intent
  let userMessage = ''

  // Try to get the user's spoken text from slots
  if (intent.slots) {
    const slotValues = Object.values(intent.slots)
      .map((slot) => slot.value)
      .filter(Boolean)
      .join(' ')

    if (slotValues) {
      userMessage = slotValues
    }
  }

  // If no slots, try to construct from intent name
  if (!userMessage) {
    // Convert intent name to natural language
    userMessage = intentName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toLowerCase())
      .trim()
  }

  // If still no message, use a generic query
  if (!userMessage) {
    userMessage = 'Merhaba'
  }

  // Get conversation history from session attributes
  const conversationHistory = sessionAttributes.conversationHistory || []

  // Call OpenAI to process the message
  try {
    const messages = conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    messages.push({
      role: 'user',
      content: userMessage,
    })

    // Note: Alexa doesn't have location access, so we pass null
    const result = await chatWithOpenAI(messages, null)

    // Update conversation history (keep last 10 messages)
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: result.response },
    ].slice(-10)

    const updatedSessionAttributes = {
      ...sessionAttributes,
      conversationHistory: updatedHistory,
    }

    // Clean response for Alexa (remove markdown, emojis, etc.)
    const cleanedResponse = cleanResponseForAlexa(result.response)

    return createResponse(cleanedResponse, false, updatedSessionAttributes)
  } catch (error) {
    console.error('Error processing Alexa request:', error)
    return createResponse(
      'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
      false,
      sessionAttributes
    )
  }
}

/**
 * Handle SessionEndedRequest
 */
function handleSessionEndedRequest(): AlexaResponse {
  return createResponse('Görüşmek üzere!', true)
}

/**
 * Create Alexa response
 */
function createResponse(
  text: string,
  shouldEndSession: boolean,
  sessionAttributes?: Record<string, any>
): AlexaResponse {
  return {
    version: '1.0',
    sessionAttributes: sessionAttributes,
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: text,
      },
      shouldEndSession: shouldEndSession,
    },
  }
}

/**
 * Clean response text for Alexa (remove markdown, emojis, etc.)
 */
function cleanResponseForAlexa(text: string): string {
  return text
    .replace(/[🎵📍⏰🎤🎧📅📋✅⚠️❌⏭️🔍]/g, '') // Remove emojis
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links
    .replace(/\n\n+/g, '. ') // Replace multiple newlines with period
    .replace(/\n/g, '. ') // Replace single newlines with period
    .replace(/\.\s+\./g, '.') // Remove double periods
    .trim()
    .substring(0, 8000) // Alexa has a limit of ~8000 characters
}

