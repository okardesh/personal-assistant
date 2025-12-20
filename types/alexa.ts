// Alexa Skills Kit request/response types

export interface AlexaRequest {
  version: string
  session: {
    sessionId: string
    application: {
      applicationId: string
    }
    user: {
      userId: string
      accessToken?: string
    }
    new: boolean
    attributes?: Record<string, any>
  }
  context: {
    System: {
      application: {
        applicationId: string
      }
      user: {
        userId: string
        accessToken?: string
      }
      device: {
        deviceId: string
        supportedInterfaces: Record<string, any>
      }
    }
  }
  request: {
    type: 'LaunchRequest' | 'IntentRequest' | 'SessionEndedRequest'
    requestId: string
    timestamp: string
    locale: string
    intent?: {
      name: string
      slots?: Record<string, {
        name: string
        value?: string
        confirmationStatus?: string
      }>
    }
    reason?: string
    error?: {
      type: string
      message: string
    }
  }
}

export interface AlexaResponse {
  version: string
  sessionAttributes?: Record<string, any>
  response: {
    outputSpeech?: {
      type: 'PlainText' | 'SSML'
      text?: string
      ssml?: string
    }
    card?: {
      type: 'Simple' | 'Standard' | 'LinkAccount'
      title?: string
      content?: string
      text?: string
      image?: {
        smallImageUrl?: string
        largeImageUrl?: string
      }
    }
    reprompt?: {
      outputSpeech: {
        type: 'PlainText' | 'SSML'
        text?: string
        ssml?: string
      }
    }
    shouldEndSession: boolean
  }
}

