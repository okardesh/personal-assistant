import OpenAI from 'openai'
import { getCalendarEvents } from './calendar'
import { getEmails } from './email'
import {
  getHomeAssistantDevices,
  searchDevices,
  turnOnDevice,
  turnOffDevice,
  setBrightness,
  getDeviceState,
  startVacuum,
  pauseVacuum,
  stopVacuum,
  returnVacuumToBase,
  controlMediaPlayer,
} from './homeAssistant'
import { fetchICloudEmails } from './icloudEmail'
import { getWeather, getWeatherByCity } from './weather'
import { fetchAppleCalendarEvents, addAppleCalendarEvent } from './appleCalendar'
import { fetchOutlookCalendarEvents, addOutlookCalendarEvent } from './outlookCalendar'
import { searchNearbyEvents, searchGoogle } from './googleSearch'
import { getBestRoute, Route } from './googleMaps'

// Lazy initialize OpenAI client to avoid build-time errors
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

interface Location {
  latitude: number
  longitude: number
  address?: string
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
}

// Define functions that OpenAI can call
const functions = [
  {
    name: 'get_calendar_events',
    description: 'Get calendar events from BOTH the user\'s Apple Calendar (iCloud) AND Outlook Calendar (work calendar). This function returns events from BOTH calendars combined. Use this when the user asks about their calendar, appointments, meetings, schedule, or "what\'s next" (e.g., "takvimim", "randevularım", "toplantılarım", "sırada ne var", "sonraki etkinlik", "bugun takvimde sirada ne var", "my calendar", "my appointments", "what\'s next", "next event"). CRITICAL: The response includes events from BOTH calendars - you MUST show ALL events from both Apple Calendar and Outlook Calendar. Do NOT filter or exclude any events. IMPORTANT: When user asks "sırada ne var" or "what\'s next", you MUST get today\'s events and filter to show only the next event after current time. Do NOT use this for general questions about events, sports matches, concerts, or public events - use Google search instead.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'tomorrow', 'week'],
          description: 'The time period to get events for',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_emails',
    description: 'Get emails from the user\'s inbox. Use this when the user asks about their emails, inbox, or mail.',
    parameters: {
      type: 'object',
      properties: {
        unread: {
          type: 'boolean',
          description: 'Whether to get only unread emails',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of emails to return',
        },
      },
    },
  },
  {
    name: 'get_weather',
    description: 'Get current weather information. Use this when the user asks about weather, temperature, or climate. You can use coordinates (latitude/longitude) or city name.',
    parameters: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          description: 'Latitude coordinate (use if user location is available)',
        },
        longitude: {
          type: 'number',
          description: 'Longitude coordinate (use if user location is available)',
        },
        city: {
          type: 'string',
          description: 'City name (use if coordinates are not available or user asks for specific city)',
        },
      },
    },
  },
  {
    name: 'search_nearby_events',
    description: 'Search for events, activities, or places near the user\'s location using Google. Use this when the user asks about events around them, nearby activities, or what\'s happening nearby. Requires user location.',
    parameters: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          description: 'Latitude coordinate of user\'s location',
        },
        longitude: {
          type: 'number',
          description: 'Longitude coordinate of user\'s location',
        },
        query: {
          type: 'string',
          description: 'Search query (e.g., "events", "activities", "concerts", "restaurants"). Default: "events"',
        },
      },
      required: ['latitude', 'longitude'],
    },
  },
  {
    name: 'search_google',
    description: 'Search Google for general information, news, events, sports matches, concerts, or any public information. Use this for questions like "Fenerbahçe\'nin maçı var mı?", "Bu hafta sonu konser var mı?", or any general knowledge questions. Do NOT use this for the user\'s personal calendar - use get_calendar_events instead.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query (e.g., "Fenerbahçe maçı bu hafta sonu", "Istanbul konserler", "events this weekend")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_calendar_event',
    description: 'Add an event to the user\'s personal calendar (Apple Calendar or Outlook). Use this when the user asks to add, create, or schedule an event, appointment, or meeting in their calendar (e.g., "bunu takvimime ekle", "takvime ekle", "randevu oluştur", "add to calendar").',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title or name of the event',
        },
        startDateTime: {
          type: 'string',
          description: 'Start date and time in ISO 8601 format (e.g., "2023-10-21T21:30:00")',
        },
        endDateTime: {
          type: 'string',
          description: 'End date and time in ISO 8601 format (e.g., "2023-10-21T23:30:00"). If not provided, default to 1 hour after start.',
        },
        location: {
          type: 'string',
          description: 'Location of the event (optional)',
        },
        description: {
          type: 'string',
          description: 'Description or notes for the event (optional)',
        },
        calendar: {
          type: 'string',
          enum: ['personal', 'work'],
          description: 'Which calendar to add to: "personal" for Apple Calendar, "work" for Outlook Calendar. Default: "personal"',
        },
      },
      required: ['title', 'startDateTime'],
    },
  },
  {
    name: 'play_spotify_track',
    description: 'Play a song on Spotify. Use this when the user asks to play music, a song, or an artist (e.g., "Spotify\'da şarkı çal", "müzik aç", "play music", "play [song name]", "play [artist name]"). IMPORTANT: Always try to play on "this computer/phone" device, not on "Personal Assistant" device. The system will automatically transfer playback to the user\'s computer/phone if available.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The song name, artist name, or search query (e.g., "Shape of You", "Ed Sheeran", "jazz music")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'control_spotify_playback',
    description: 'Control Spotify playback (play, pause, next, previous, volume). Use this when the user asks to control music playback (e.g., "müziği durdur", "pause", "next song", "previous", "sesi aç", "volume up").',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['play', 'pause', 'next', 'previous', 'volume_up', 'volume_down'],
          description: 'The playback action to perform',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'get_directions',
    description: 'Get directions to a place. Use this when the user asks how to get somewhere, travel time, or route information (e.g., "X\'e nasıl giderim", "X\'e ne kadar sürer", "X\'e gitmek için yol tarifi", "how to get to X", "directions to X"). The user\'s current location will be automatically used as the origin if available. You do NOT need to ask for location - it will be provided automatically.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'The destination place name or address (e.g., "Kadıköy", "Taksim Meydanı", "Istanbul Airport")',
        },
        mode: {
          type: 'string',
          enum: ['driving', 'walking', 'transit', 'bicycling'],
          description: 'Transportation mode. Default: "driving". Use "walking" for short distances, "transit" for public transport, "bicycling" for bike routes.',
        },
      },
      required: ['destination'],
    },
  },
  {
    name: 'list_controllable_devices',
    description: 'List all controllable smart home devices available in Home Assistant. Use this when the user asks "hangi cihazları kontrol edebiliyorsun?", "cihazları listele", "ne tür cihazlar var?", "what devices can you control?", "list devices", "show me available devices". This function returns a list of all controllable devices (lights, switches, vacuum cleaners, media players, etc.) with their names and entity IDs.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'control_homekit_device',
    description: 'Control smart home devices (lights, switches, thermostats, vacuum cleaners like Roomba, media players, etc.) through Home Assistant. Use this when the user asks to control home devices. Examples: "lambayı aç", "ışığı kapat", "Roomba\'yı başlat", "süpürgeyi durdur", "müziği çal", "TV\'yi kapat", "turn on the light", "start Roomba", "play music". First search for the device by name, then control it. For vacuum cleaners (Roomba), use start/pause/stop/return_to_base actions. For media players, use play/pause/stop/next_track/previous_track actions.',
    parameters: {
      type: 'object',
      properties: {
        deviceName: {
          type: 'string',
          description: 'The name of the device to control (e.g., "living room light", "bedroom lamp", "kitchen switch", "Roomba", "vacuum", "TV", "bedroom speaker"). If exact entity_id is known, use that instead.',
        },
        action: {
          type: 'string',
          enum: ['turn_on', 'turn_off', 'set_brightness', 'toggle', 'start', 'pause', 'stop', 'return_to_base', 'play', 'next_track', 'previous_track'],
          description: 'The action to perform on the device. For lights/switches: turn_on, turn_off, toggle. For vacuum (Roomba): start, pause, stop, return_to_base. For media players: play, pause, stop, next_track, previous_track.',
        },
        brightness: {
          type: 'number',
          description: 'Brightness level (0-100) for lights. Only used when action is set_brightness.',
        },
        entityId: {
          type: 'string',
          description: 'Exact Home Assistant entity_id (e.g., "light.living_room", "vacuum.roomba", "media_player.tv"). If provided, deviceName will be ignored.',
        },
      },
      required: ['action'],
    },
  },
]

export async function chatWithOpenAI(
  messages: Message[],
  location?: Location | null,
  userContext?: { name?: string; preferences?: any; metadata?: any } | null
): Promise<{ response: string; spotifyAction?: any }> {
  if (!process.env.OPENAI_API_KEY) {
    return { response: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.' }
  }

  let spotifyAction: any = null

  // Check if user is asking about available devices - handle directly without OpenAI function calling
  const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''
  const previousMessages = messages.slice(-3).map(m => m.content?.toLowerCase() || '').join(' ')
  const allMessages = (lastUserMessage + ' ' + previousMessages).toLowerCase()
  
  const deviceListKeywords = [
    'hangi cihazları kontrol edebiliyorsun',
    'hangi cihazları kontrol edebiliyosun',
    'hangi cihazları kontrol edebilirsin',
    'cihazları listele',
    'cihaz listesi',
    'ne tür cihazlar var',
    'what devices can you control',
    'list devices',
    'show me available devices',
    'hangi cihazlar var',
    'evdeki eşyaları kontrol',
    'evdeki hangi eşyaları',
    'hangi eşyaları kontrol',
    'evdeki cihazlar',
    'akıllı cihazlar',
    'smart devices',
    'home devices',
    'evdeki hangi',
  ]
  
  // Also check for "try again" or "retry" after device-related context
  const retryKeywords = ['tekrar dene', 'yine dene', 'tekrar dener misin', 'try again', 'retry']
  const isRetryAfterDeviceQuery = retryKeywords.some(keyword => lastUserMessage.includes(keyword)) &&
    (allMessages.includes('cihaz') || allMessages.includes('device') || allMessages.includes('eşya') || allMessages.includes('evdeki'))
  
  if (deviceListKeywords.some(keyword => lastUserMessage.includes(keyword)) || isRetryAfterDeviceQuery) {
    try {
      console.log('🏠 [OpenAI] Fetching Home Assistant devices...')
      const devices = await getHomeAssistantDevices(true) // Filter to only controllable devices
      console.log('🏠 [OpenAI] Found', devices.length, 'controllable devices')
      
      if (devices.length === 0) {
        return {
          response: 'Şu anda kontrol edebileceğim cihaz bulunmuyor. Home Assistant\'ınızda kontrol edilebilir cihazlar (ışıklar, anahtarlar, termostatlar, vb.) yapılandırılmış olmalı. Home Assistant bağlantınızı ve cihaz yapılandırmanızı kontrol edin.'
        }
      }
      
      // Group devices by type
      const devicesByType: Record<string, any[]> = {}
      
      devices.forEach((device: any) => {
        const domain = device.entity_id.split('.')[0]
        if (!devicesByType[domain]) {
          devicesByType[domain] = []
        }
        devicesByType[domain].push({
          entity_id: device.entity_id,
          name: device.attributes.friendly_name || device.entity_id,
          state: device.state,
        })
      })
      
      // Format for user-friendly display
      const deviceTypes: Record<string, string> = {
        light: 'Işıklar',
        switch: 'Anahtarlar',
        cover: 'Perdeler',
        climate: 'Termostatlar',
        fan: 'Fanlar',
        lock: 'Kilitler',
        media_player: 'Medya Oynatıcılar',
        vacuum: 'Süpürgeler',
        scene: 'Sahneler',
        script: 'Scriptler',
        input_boolean: 'Boolean Girişler',
        input_number: 'Sayısal Girişler',
        input_select: 'Seçim Girişleri',
        input_text: 'Metin Girişleri',
      }
      
      // Build response - show specific device names instead of grouped by type
      let response = `Kontrol edebileceğim ${devices.length} cihaz var:\n\n`
      
      // Sort devices by name for better readability
      const allDevices = devices.map((device: any) => ({
        name: device.attributes.friendly_name || device.entity_id,
        entity_id: device.entity_id,
        state: device.state,
        domain: device.entity_id.split('.')[0],
      })).sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'))
      
      allDevices.forEach((device: any) => {
        const stateEmoji = device.state === 'on' ? '🟢' : device.state === 'off' ? '🔴' : device.state === 'playing' ? '▶️' : device.state === 'docked' ? '🔌' : '⚪'
        response += `${stateEmoji} **${device.name}** (${device.state})\n`
      })
      
      response += `\nBu cihazları kontrol etmek için cihaz adını söyleyebilirsiniz (ör: "lambayı aç", "ışığı kapat", "termostatı ayarla").`
      
      return { response: response.trim() }
    } catch (error) {
      console.error('🏠 [OpenAI] Error fetching device list:', error)
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
      
      // Check if it's a configuration error
      if (errorMessage.includes('not configured') || errorMessage.includes('HOME_ASSISTANT')) {
        return {
          response: 'Home Assistant yapılandırılmamış görünüyor. Home Assistant URL ve erişim token\'ınızın doğru yapılandırıldığından emin olun. Eğer Home Assistant kullanmıyorsanız, bu özellik şu anda kullanılamıyor.'
        }
      }
      
      return { 
        response: `Cihaz listesini alırken bir hata oluştu: ${errorMessage}. Home Assistant bağlantınızı ve yapılandırmanızı kontrol edin.` 
      }
    }
  }

  try {
    // Get current date and time
    const now = new Date()
    const currentDate = now.toLocaleDateString('tr-TR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const currentTime = now.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    const currentDateISO = now.toISOString().split('T')[0] // YYYY-MM-DD format

    // Build user context string for system message
    let userContextString = ''
    if (userContext) {
      if (userContext.name) {
        userContextString += `\n\nUSER INFORMATION:\n- User's name: ${userContext.name}\n- Always address the user by their name when appropriate. Remember their name and use it naturally in conversations.`
        console.log('👤 [OpenAI] User context includes name:', userContext.name)
      }
      if (userContext.preferences) {
        const prefs = Object.entries(userContext.preferences)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n')
        if (prefs) {
          userContextString += `\n- User preferences:\n${prefs}`
        }
      }
      if (userContext.metadata) {
        const metadata = Object.entries(userContext.metadata)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n')
        if (metadata) {
          userContextString += `\n- Additional context:\n${metadata}`
        }
      }
    } else {
      console.log('👤 [OpenAI] No user context provided')
    }
    
    // Also try to extract name from conversation history if not in context
    if (!userContextString.includes('User\'s name:')) {
      for (const msg of messages) {
        if (msg.role === 'user') {
          const nameMatch = msg.content.match(/(?:benim adım|adım|merhaba ben|ben) (.+?)(?:\.|$|,|\s|$)/i)
          if (nameMatch && nameMatch[1]) {
            const extractedName = nameMatch[1].trim()
            if (extractedName.length > 1 && extractedName.length < 50) {
              userContextString += `\n\nUSER INFORMATION:\n- User's name: ${extractedName}\n- Always address the user by their name when appropriate. Remember their name and use it naturally in conversations.`
              console.log('👤 [OpenAI] Extracted name from conversation:', extractedName)
              break
            }
          }
        }
      }
    }

    // Add system message with context
    const systemMessage: Message = {
      role: 'system',
      content: `You are a helpful personal assistant. You can help users with:
- Calendar: Check their PERSONAL calendar events (ONLY when they explicitly mention "takvimim", "randevularım", "toplantılarım", "my calendar", "my appointments")
- Calendar: Add events to their calendar when they ask (e.g., "bunu takvimime ekle", "add to calendar", "takvime ekle")
- Email: Check their inbox and unread emails, summarize emails when asked
- Weather: Get current weather information for their location or any city
- Location: You have access to the user's current location if they grant permission
- Spotify: Play music, control playback (play, pause, next, previous, volume). Use play_spotify_track when user asks to play music (e.g., "Spotify'da şarkı çal", "müzik aç", "play [song name]"). Use control_spotify_playback for playback control (e.g., "müziği durdur", "pause", "next song").
- Directions: Get directions and travel time to places. Use get_directions when user asks how to get somewhere or travel time (e.g., "Kadıköy'e nasıl giderim", "Taksim'e ne kadar sürer", "how to get to X"). IMPORTANT: The user's current location will be automatically used as the origin - you do NOT need to ask for location permission. If location is not available, the function will return an error, but you should still try to use it if the user asks for directions.
- HomeKit Devices: Control smart home devices (lights, switches, thermostats, vacuum cleaners like Roomba, media players, etc.) through Home Assistant. Use control_homekit_device when user asks to control home devices. Examples: "lambayı aç", "ışığı kapat", "Roomba'yı başlat", "süpürgeyi durdur", "Roomba'yı üsse gönder", "müziği çal", "TV'yi kapat", "turn on the light", "start Roomba", "play music". For vacuum cleaners (Roomba): use "start" to start cleaning, "pause" to pause, "stop" to stop, "return_to_base" to return to charging dock. For media players: use "play", "pause", "stop", "next_track", "previous_track". The function will search for devices by name if entity_id is not provided. IMPORTANT: Home Assistant must be configured with HOME_ASSISTANT_URL and HOME_ASSISTANT_ACCESS_TOKEN environment variables.
  CRITICAL FORMATTING RULES:
  - ALWAYS start your response with the travel time FIRST (e.g., "Boğaziçi Üniversitesi'ne yaklaşık 25 dakika sürer" or "En hızlı yol araba ile 30 dakika")
  - Then IMMEDIATELY mention traffic conditions:
    * If traffic_info.has_heavy_traffic is true: "Yoğun trafik var, normalden [X] dakika daha uzun sürebilir"
    * If traffic_delay is 1-5 minutes: "Hafif trafik var"
    * If traffic_delay is 0 or very small: "Trafik normal" or "Trafik yoğun değil"
    * Compare base_duration vs traffic_duration to assess traffic impact
  - After stating time and traffic, provide route details and alternative modes if faster
  - Always show the fastest route option and compare different transportation modes
  - Format: "📍 [Destination]'e [duration] sürer. [Traffic comment with delay info]. [Route details]"
- General questions: Answer questions, have conversations, and provide helpful information
- Google Search: Search Google for general information, sports matches, concerts, events, news, etc.

When showing Google Search results for events, concerts, or activities:
- CRITICAL: You MUST extract specific event information from the search result data provided to you
- Look at the "title", "description", and "location" fields in the googleResults array
- Parse the description/snippet text carefully to extract: event name, date, time, location/venue
- Format each result EXACTLY as: "🎵 [Event Name]\n📍 [Location/Venue]\n⏰ [Date and Time]"
- Show ONLY 2-3 most relevant results that have clear event information
- Do NOT provide generic venue descriptions or links
- Do NOT say "visit this page" or "check this link" - extract the actual information
- If a search result only contains a venue name without specific event details, SKIP it and look for results with actual concert/event names
- If date/time is not in the search results, show: "⏰ Tarih bilgisi mevcut değil" but still show event name and location
- Example format:
  🎵 Gökhan Türkmen Konseri
  📍 Dorock XL, Kadıköy
  ⏰ 21 Ekim 2023, 21:30

CURRENT DATE AND TIME:
- Today's date: ${currentDate} (${currentDateISO})
- Current time: ${currentTime}
- Today is day ${now.getDay()} of the week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)${userContextString}

CRITICAL MEMORY INSTRUCTIONS:
- You MUST remember the user's name if it was mentioned in previous messages or provided in USER INFORMATION above
- When the user asks "benim adim ne?" / "benim adım ne?" / "adım ne?" / "what is my name?" / "benim adimi hatirliyor musun?" / "do you remember my name?", you MUST answer with their name if you know it from USER INFORMATION above
- If the user's name is in USER INFORMATION, you MUST say their name directly (e.g., "Adınız [NAME]" or "Your name is [NAME]")
- NEVER say "I don't know your name" or "Üzgünüm, sizin adınızı bilmiyorum" if the name is provided in USER INFORMATION above
- Always use the user's name naturally in conversations when you know it
- Remember information shared in previous messages in this conversation
- Be consistent with information shared in previous messages
- If the user's name is provided in USER INFORMATION above, you MUST use it and remember it throughout the conversation`

CRITICAL: When answering questions about dates and days of the week:
- ALWAYS calculate the day of the week using the CURRENT DATE as reference
- Use JavaScript Date object logic: new Date(year, month-1, day).getDay()
- For example, to find what day December 22, 2025 is:
  - Create a Date object: new Date(2025, 11, 22) // month is 0-indexed (11 = December)
  - Use getDay() to get the day of week
  - 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
- NEVER guess or use outdated training data for date calculations
- If you're unsure, calculate it step by step using the current date as reference

IMPORTANT: 
- Use get_calendar_events ONLY when the user explicitly mentions their personal calendar/appointments/meetings
- Use add_calendar_event when the user asks to add an event to their calendar (e.g., "bunu takvimime ekle", "add this to my calendar")
- For general questions about events, sports, concerts, or public information (e.g., "Fenerbahçe'nin maçı var mı?", "Bu hafta sonu konser var mı?"), use search_google function
- Do NOT use get_calendar_events for general event questions - use Google search instead

When adding events to calendar:
- Extract title, date/time, location, and description from the user's message or from Google search results
- If the user says "bunu takvimime ekle" (add this to my calendar), look for event information in the conversation context
- Default to "personal" calendar unless user specifies "work" calendar
- If end time is not specified, default to 1 hour after start time

    When the user asks about their calendar, emails, or weather, use the appropriate function. For weather queries, use the user's location coordinates if available, otherwise ask for a city name or use the get_weather function with coordinates.

    When the user asks about emails or to summarize an email:
    - CRITICAL RULE: You MUST NEVER say "E-posta içeriği hakkında daha fazla bilgiye ulaşamıyorum" or "daha fazla bilgiye ulaşamıyorum" or any variation of this phrase
    - CRITICAL RULE: You MUST NEVER say you cannot access email content - you ALWAYS have access to the snippet field
    - The email data will be provided in the "emails" array with a "snippet" field
    - The snippet contains the FULL email body text when available (can be 1000+ characters)
    - CRITICAL: You MUST read and use the snippet content to create a SHORT, CONCISE summary
    - EMAIL SUMMARY FORMAT: ONE SENTENCE ONLY. Format: "[Gönderen]'den: [Ana mesaj tek cümle]"
    - Example good response: "Amazon'dan paketiniz bugün 10:59'da teslim edildi."
    - Example good response: "LinkedIn'den 6 yeni davetiyeniz var."
    - Example good response: "Bankadan hesap özetiniz hazır."
    - FORBIDDEN - NEVER INCLUDE:
      * "Gönderen:", "Tarih:", "Konu:", "Özet:" headers
      * "Son e-posta, X'den geldi. İşte özeti:" introductory phrases
      * "İşte özeti:", "Özet:" phrases
      * Links (URLs, markdown links, etc.)
      * "Eğer başka bir şeyle yardımcı olmamı isterseniz" closing phrases
      * Multiple sentences - ONLY ONE SENTENCE
      * Bold/italic formatting (**text**, *text*)
      * Line breaks or paragraph separations
    - Just state the essential information in ONE sentence: sender name (short, like "Amazon'dan" not "Amazon.com.tr'den") and the main message
    - Extract the key information: what happened, when (if relevant), and any important details
    - If the snippet is long (more than 100 characters), it contains the actual email body - READ IT CAREFULLY and extract the MAIN POINT in one sentence
    - If snippet contains "Email Details:" header, it means body wasn't retrieved, but you STILL have subject, sender, and date - USE THEM to create a short one-sentence summary
    - Example bad response (FORBIDDEN - NEVER DO THIS): "E-posta içeriği hakkında daha fazla bilgiye ulaşamıyorum. Başka bir konuda yardımcı olabilir miyim?"
    - Example bad response (TOO VERBOSE - FORBIDDEN): "Son e-posta, Amazon.com.tr'den geldi. İşte özeti: **Gönderen:** Amazon.com.tr <siparis-bilgisi@amazon.com.tr> **Tarih:** 20 Aralık 2025, 10:59 **Konu:** Paketiniz teslim edildi! **Özet:** Paketiniz bugün teslim edildi..."
    - If you see ANY formatting, headers, links, or multiple sentences in your response, DELETE IT IMMEDIATELY and replace with a single sentence summary

    Email fetching logic:
    - When user asks about emails, first check for unread emails (up to 5)
    - If no unread emails exist, fetch and summarize the latest email
    - If the email data has _metadata.noUnreadEmails = true, it means there are no unread emails
    - In that case, always inform the user: "Hiç okunmamış email yok" and then summarize the latest email
    - Show unread emails if available, otherwise show the latest email with a note that there are no unread emails

When displaying calendar events, format them nicely:
- IMPORTANT: Show events from BOTH Apple Calendar (iCloud) AND Outlook Calendar (work calendar)
- The get_calendar_events function returns events from both calendars combined
- Sort events by time (all calendars together)
- Show time in a readable format (e.g., "14:30" or "2:30 PM")
- Include location if available: "⏰ 14:30 - Toplantı 📍 İstanbul"
- For today: "📅 Bugünkü Etkinlikleriniz:\n\n⏰ 14:30 - Toplantı 📍 İstanbul\n⏰ 16:00 - Randevu"
- For tomorrow: "📅 Yarınki Etkinlikleriniz:\n\n⏰ 10:00 - Toplantı 📍 İstanbul\n⏰ 14:00 - Randevu"
- DO NOT filter or exclude any calendar - show ALL events from both calendars

CRITICAL: When user asks "sırada ne var", "sonraki etkinlik", "what's next", "next event", "bugun takvimde sirada ne var", or similar questions about what's coming up:
- ALWAYS check the CURRENT TIME first (provided above in CURRENT DATE AND TIME section)
- Get today's calendar events using get_calendar_events with period='today'
- The response will include a "currentTime" field (e.g., "10:36") - USE THIS to filter events
- Filter events to find the NEXT event that starts AFTER the current time
- Compare event times (in "time" field, format "HH:mm") with currentTime
- If current time is 10:36, find events that start after 10:36 today (e.g., 13:00, 19:00)
- Show ONLY the next upcoming event, not all events
- Format: "⏰ [Time] - [Event Title] 📍 [Location if available]"
- If no events remain today, check tomorrow's events using period='tomorrow' and show the first event
- Example: If current time is 10:36 and today's events are [07:30, 13:00, 19:00], show only "⏰ 13:00 - Çocuk Tiyatrosu 📍 Caddebostan Kültür Merkezi"
- DO NOT show past events (events before current time)
- DO NOT show all events - only the NEXT one
- For week: Include date for each event: "📅 Bu Haftaki Etkinlikleriniz:\n\n📆 Pazartesi, 18 Aralık\n⏰ 14:30 - Toplantı 📍 İstanbul\n\n📆 Salı, 19 Aralık\n⏰ 10:00 - Randevu"
- Do NOT include description/notes in the response
- Keep it clean and organized

When the user asks about events "around me" or "nearby" (e.g., "Etrafımda bir event var mı?"):
- FIRST, check if location is available. If NOT available, ask the user to enable location permissions
- If location IS available:
  1. FIRST, use search_nearby_events function to search Google for events/activities near their location
  2. THEN, check today's calendar events using get_calendar_events function
  3. Combine and show both results:
     - "🔍 Yakınınızdaki Etkinlikler (Google):\n\n..."
     - "📅 Takviminizdeki Etkinlikler:\n\n..."
- Always prioritize Google search results first, then show calendar events
- If Google search returns no results, still show calendar events

Be conversational, helpful, and concise. If you need to call a function, do so.`,
    }

    const messagesWithSystem = [systemMessage, ...messages]

    // Add location context if available
    if (location) {
      const locationContext: Message = {
        role: 'system',
        content: `User's current location: ${location.address || `${location.latitude}, ${location.longitude}`}`,
      }
      messagesWithSystem.splice(1, 0, locationContext)
    }

    const response = await getOpenAIClient().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messagesWithSystem as any,
      tools: functions.map(fn => ({
        type: 'function' as const,
        function: fn,
      })),
      tool_choice: 'auto',
      temperature: 0.7,
    })

    const message = response.choices[0].message

    // If OpenAI wants to call a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Handle all tool calls
      const toolResults: any[] = []
      
          for (const toolCall of message.tool_calls) {
            const functionName = toolCall.function.name
            let functionArgs: any = {}
            
            try {
              functionArgs = JSON.parse(toolCall.function.arguments || '{}')
            } catch (parseError) {
              console.error('❌ Failed to parse function arguments:', parseError)
              toolResults.push({
                role: 'tool' as const,
                content: JSON.stringify({ error: 'Invalid function arguments' }),
                tool_call_id: toolCall.id,
              })
              continue
            }

            let functionResult: any

            try {
              if (functionName === 'get_calendar_events') {
          // Server-side: call calendar functions directly
          // Client-side: use API route
          const period = functionArgs.period || 'today'
          let events: any[] = []
          
            if (typeof window === 'undefined') {
            // Server-side: call functions directly
            console.log('🍎 Server-side: Fetching calendar events directly...')
            const [appleEvents, outlookEvents] = await Promise.all([
              fetchAppleCalendarEvents(period),
              fetchOutlookCalendarEvents(period).catch(() => []),
            ])
            events = [...appleEvents, ...outlookEvents]
          } else {
            // Client-side: use API route
            events = await getCalendarEvents(period)
          }
          
          // Sort events by time
          events.sort((a, b) => {
            const timeA = a.time || '00:00'
            const timeB = b.time || '00:00'
            return timeA.localeCompare(timeB)
          })
          
          // Add current time to events data for filtering
          const now = new Date()
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()
          const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
          
          functionResult = { 
            events,
            currentTime: currentTimeStr,
            currentDate: now.toISOString().split('T')[0],
          }
        } else if (functionName === 'get_emails') {
          console.log('📧 [OpenAI] get_emails called', { args: functionArgs })
          
          // New logic: First try unread emails, if none, get latest email
          let emails: any[] = []
          let hasUnread = false
          
          if (typeof window === 'undefined') {
            console.log('📧 [OpenAI] Server-side: Fetching emails directly')
            try {
              // First, get all emails (up to 10) to check for unread ones
              const allEmails = await fetchICloudEmails({
                unread: false,
                limit: 10, // Get more to find unread ones
              })
              
              console.log('📧 [OpenAI] All emails fetched', { 
                total: allEmails.length,
                unreadDetails: allEmails.map(e => ({ subject: e.subject, unread: e.unread }))
              })
              
              // Filter for unread emails
              const unreadEmails = allEmails.filter(e => e.unread === true).slice(0, 5)
              console.log('📧 [OpenAI] Unread emails check', { 
                total: allEmails.length, 
                unread: unreadEmails.length
              })
              
              if (unreadEmails.length > 0) {
                emails = unreadEmails
                hasUnread = true
                console.log('📧 [OpenAI] Using unread emails', { count: emails.length })
              } else {
                // No unread emails, get the latest email
                console.log('📧 [OpenAI] No unread emails, using latest email')
                if (allEmails.length > 0) {
                  emails = [allEmails[0]] // Already sorted newest first
                  console.log('📧 [OpenAI] Latest email selected', { 
                    subject: emails[0].subject,
                    date: emails[0].date 
                  })
                } else {
                  // Fallback: fetch just one
                  console.log('📧 [OpenAI] No emails found, fetching one more')
                  emails = await fetchICloudEmails({
                    unread: false,
                    limit: 1,
                  })
                }
                hasUnread = false
                console.log('📧 [OpenAI] Final email list', { 
                  count: emails.length, 
                  hasUnread,
                  emails: emails.map(e => ({
                    subject: e.subject,
                    snippetLength: e.snippet?.length || 0,
                    hasSnippet: !!e.snippet,
                    snippetPreview: e.snippet?.substring(0, 200) || 'NO SNIPPET'
                  }))
                })
              }
            } catch (error) {
              console.error('📧 [OpenAI] Server-side: Error fetching emails', { error: error instanceof Error ? error.message : 'Unknown' })
              emails = []
            }
          } else {
            // Client-side: use API route
            console.log('📧 [OpenAI] Client-side: Using API route')
            // First try unread
            let unreadEmails = await getEmails({
              unread: true,
              limit: 5,
            })
            
            if (unreadEmails.length > 0) {
              emails = unreadEmails
              hasUnread = true
            } else {
              // No unread, get latest
              emails = await getEmails({
                unread: false,
                limit: 1,
              })
              hasUnread = false
            }
            console.log('📧 [OpenAI] Client-side: Emails fetched', { count: emails.length, hasUnread })
          }
          
          console.log('📧 [OpenAI] get_emails result', { count: emails.length, hasUnread })
          
          // Add metadata to emails for OpenAI to understand context
          if (emails.length > 0 && !hasUnread) {
            // Mark that these are not unread, so OpenAI can inform user
            emails[0]._metadata = { noUnreadEmails: true }
          }
          
          // ALWAYS try to fetch email body if we have emails, especially for latest email
          // This ensures we have content for summarization
          const userMessage = messages[messages.length - 1]?.content || ''
          const allMessages = messages.map(m => m.content || '').join(' ').toLowerCase()
          const needsSummary = userMessage.toLowerCase().includes('özetle') || 
                              userMessage.toLowerCase().includes('summarize') ||
                              userMessage.toLowerCase().includes('özet') ||
                              userMessage.toLowerCase().includes('en son') ||
                              userMessage.toLowerCase().includes('latest') ||
                              userMessage.toLowerCase().includes('son email') ||
                              allMessages.includes('özetle') ||
                              allMessages.includes('summarize') ||
                              allMessages.includes('özet') ||
                              // If no unread emails and we're showing latest, always try to get body for summary
                              (!hasUnread && emails.length > 0)
          
          console.log('📧 [OpenAI] Summary check', { 
            needsSummary, 
            userMessage: userMessage.substring(0, 100),
            hasUnread,
            emailCount: emails.length,
            checkResults: {
              hasOzetle: userMessage.toLowerCase().includes('özetle'),
              hasSummarize: userMessage.toLowerCase().includes('summarize'),
              hasOzet: userMessage.toLowerCase().includes('özet'),
              hasEnSon: userMessage.toLowerCase().includes('en son'),
              hasSonEmail: userMessage.toLowerCase().includes('son email'),
              noUnread: !hasUnread && emails.length > 0
            }
          })
          
          // ALWAYS fetch email body if we have emails (especially for latest email or if summary requested)
          if (emails.length > 0) {
            const latestEmail = emails[0]
            const shouldFetchBody = needsSummary || (!hasUnread && emails.length === 1)
            
            console.log('📧 [OpenAI] Email body fetch decision', { 
              shouldFetchBody,
              needsSummary,
              hasUnread,
              emailCount: emails.length,
              emailId: latestEmail.id,
              hasSnippet: !!latestEmail.snippet
            })
            
            if (shouldFetchBody && latestEmail.id && !latestEmail.snippet) {
              console.log('📧 [OpenAI] ✅ Fetching email body', { 
                emailId: latestEmail.id, 
                subject: latestEmail.subject,
                reason: needsSummary ? 'summary requested' : 'latest email, no unread'
              })
              // Import fetchICloudEmailBody dynamically to avoid circular dependency
              const { fetchICloudEmailBody } = await import('./icloudEmail')
              try {
                console.log('📧 [OpenAI] Starting email body fetch', { 
                  emailId: latestEmail.id, 
                  subject: latestEmail.subject,
                  timestamp: new Date().toISOString()
                })
                // Add timeout for email body fetch
                const bodyPromise = fetchICloudEmailBody(latestEmail.id)
                const timeoutPromise = new Promise<string | null>((resolve) => {
                  setTimeout(() => {
                    console.warn('📧 [OpenAI] ⏰ Email body fetch timeout after 15 seconds')
                    resolve(null)
                  }, 15000) // 15 seconds timeout
                })
                
                console.log('📧 [OpenAI] Waiting for email body...')
                const emailBody = await Promise.race([bodyPromise, timeoutPromise])
                console.log('📧 [OpenAI] Email body fetch completed', { 
                  hasBody: !!emailBody,
                  bodyLength: emailBody?.length || 0
                })
                
                if (emailBody && emailBody.length > 0) {
                  latestEmail.snippet = emailBody.substring(0, 3000) // Include more content for summarization
                  console.log('📧 [OpenAI] Email body fetched for summary', { 
                    length: emailBody.length, 
                    snippetLength: latestEmail.snippet.length,
                    preview: emailBody.substring(0, 100)
                  })
                } else {
                  console.warn('📧 [OpenAI] Email body is empty or null', { emailId: latestEmail.id })
                  // Always create a snippet with available info for summarization
                  latestEmail.snippet = `Email Details:
Subject: ${latestEmail.subject}
From: ${latestEmail.from}
Date: ${latestEmail.date}

Note: Email body text was not retrieved, but you MUST create a comprehensive summary based on the subject "${latestEmail.subject}" and sender "${latestEmail.from}". Analyze what you can infer from this information. NEVER say "daha fazla bilgiye ulaşamıyorum" or similar phrases.`
                }
              } catch (error) {
                console.error('📧 [OpenAI] ❌ Error fetching email body:', { 
                  error: error instanceof Error ? error.message : 'Unknown',
                  stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
                  emailId: latestEmail.id
                })
                // Fallback: use basic info with strong instruction
                latestEmail.snippet = `Email Details:
Subject: ${latestEmail.subject}
From: ${latestEmail.from}
Date: ${latestEmail.date}

Note: Email body fetch encountered an error, but you MUST create a comprehensive summary based on the subject "${latestEmail.subject}" and sender "${latestEmail.from}". Analyze what you can infer from this information. NEVER say "daha fazla bilgiye ulaşamıyorum" or similar phrases.`
              }
            } else {
              console.warn('📧 [OpenAI] ⚠️ Email ID is missing, cannot fetch body', { 
                email: latestEmail,
                hasId: !!latestEmail.id,
                emailKeys: Object.keys(latestEmail)
              })
              // Even without ID, create snippet for summary
              if (latestEmail && !latestEmail.snippet) {
                latestEmail.snippet = `Email Details:
Subject: ${latestEmail.subject}
From: ${latestEmail.from}
Date: ${latestEmail.date}

Note: Email ID not available, but you MUST create a comprehensive summary based on the subject "${latestEmail.subject}" and sender "${latestEmail.from}". Analyze what you can infer from this information. NEVER say "daha fazla bilgiye ulaşamıyorum" or similar phrases.`
              }
            }
          } else {
            console.log('📧 [OpenAI] ⏭️ Skipping email body fetch', { 
              emailCount: emails.length,
              shouldFetchBody: false,
              needsSummary,
              hasUnread
            })
            
            // Even if not fetching body, ensure snippet exists for latest email
            if (emails.length > 0 && !hasUnread) {
              const latestEmail = emails[0]
              if (!latestEmail.snippet) {
                latestEmail.snippet = `Email information:
Subject: ${latestEmail.subject}
From: ${latestEmail.from}
Date: ${latestEmail.date}
Note: Email body not retrieved, but provide information based on available details.`
              }
            }
          }
          
          functionResult = { emails }
        } else if (functionName === 'get_weather') {
          let weather = null
          if (functionArgs.latitude && functionArgs.longitude) {
            weather = await getWeather(functionArgs.latitude, functionArgs.longitude)
          } else if (functionArgs.city) {
            weather = await getWeatherByCity(functionArgs.city)
          } else if (location) {
            // Use user's current location if available
            weather = await getWeather(location.latitude, location.longitude)
          }
          
          if (weather) {
            functionResult = { weather }
          } else {
            functionResult = { error: 'Could not fetch weather information. Please provide location permissions or specify a city name.' }
          }
        } else if (functionName === 'search_nearby_events') {
          const searchLat = functionArgs.latitude || location?.latitude
          const searchLng = functionArgs.longitude || location?.longitude
          const searchQuery = functionArgs.query || 'events'
          
          if (searchLat && searchLng) {
            const nearbyEvents = await searchNearbyEvents(searchLat, searchLng, searchQuery)
            functionResult = { nearbyEvents }
          } else {
            functionResult = { error: 'Location is required to search for nearby events. Please enable location permissions.' }
          }
        } else if (functionName === 'search_google') {
          const searchQuery = functionArgs.query || ''
          if (searchQuery) {
            const googleResults = await searchGoogle(searchQuery)
            // Format results for better parsing by OpenAI
            const formattedResults = googleResults.map(result => ({
              title: result.title,
              location: result.location,
              description: result.description,
              link: result.link,
              // Add a note to help OpenAI parse
              note: 'Extract event name, date, time, and location from the title and description fields above. If this is a venue page without specific event info, skip it.'
            }))
            functionResult = { 
              googleResults: formattedResults,
              instruction: 'Parse these search results and extract specific event/concert information. Show only results with actual event names, dates, times, and locations. Format as: 🎵 [Event Name] 📍 [Location] ⏰ [Date and Time]'
            }
          } else {
            functionResult = { error: 'Search query is required' }
          }
        } else if (functionName === 'add_calendar_event') {
          const title = functionArgs.title
          const startDateTime = functionArgs.startDateTime
          const endDateTime = functionArgs.endDateTime
          const location = functionArgs.location
          const description = functionArgs.description
          const calendar = functionArgs.calendar || 'personal'

          if (!title || !startDateTime) {
            functionResult = { error: 'Title and start date/time are required' }
          } else {
            try {
              const start = new Date(startDateTime)
              const end = endDateTime ? new Date(endDateTime) : new Date(start.getTime() + 60 * 60 * 1000) // Default: 1 hour later

              if (isNaN(start.getTime())) {
                functionResult = { error: 'Invalid start date/time format' }
              } else {
                const params = {
                  title,
                  start,
                  end,
                  location,
                  description,
                  calendar: calendar as 'personal' | 'work',
                }

                if (calendar === 'work') {
                  const result = await addOutlookCalendarEvent(params)
                  functionResult = result
                } else {
                  const result = await addAppleCalendarEvent(params)
                  functionResult = result
                }
              }
            } catch (error) {
              functionResult = { error: error instanceof Error ? error.message : 'Failed to parse date/time' }
            }
          }
        } else if (functionName === 'play_spotify_track') {
          const query = functionArgs.query
          if (!query) {
            functionResult = { error: 'Search query is required' }
          } else {
            // Return Spotify action for client-side handling
            functionResult = { 
              spotifyAction: {
                action: 'play',
                query: query,
              },
              message: `Searching for "${query}" on Spotify...`
            }
          }
        } else if (functionName === 'control_spotify_playback') {
          const action = functionArgs.action
          if (!action) {
            functionResult = { error: 'Action is required' }
          } else {
            // Return Spotify action for client-side handling
            functionResult = { 
              spotifyAction: {
                action: 'control',
                control: action,
              },
              message: `Controlling Spotify: ${action}`
            }
          }
        } else {
          functionResult = { error: 'Unknown function' }
        }
            } catch (functionError: any) {
              console.error(`❌ Error executing function ${functionName}:`, functionError)
              functionResult = { 
                error: `Failed to execute ${functionName}: ${functionError.message || 'Unknown error'}` 
              }
            }

            // Check if function result contains Spotify action
            if (functionResult && functionResult.spotifyAction) {
              spotifyAction = functionResult.spotifyAction
            }

            // Ensure content is always a string
            const content = functionResult ? JSON.stringify(functionResult) : JSON.stringify({ error: 'No result' })
            toolResults.push({
              role: 'tool' as const,
              content: content,
              tool_call_id: toolCall.id,
            })
          }

      // Call OpenAI again with all function results
      const functionMessages: any[] = [
        ...messagesWithSystem,
        {
          role: 'assistant',
          content: '',
          tool_calls: message.tool_calls,
        },
        ...toolResults,
      ]

      const secondResponse = await getOpenAIClient().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: functionMessages,
        tools: functions.map(fn => ({
          type: 'function' as const,
          function: fn,
        })),
        tool_choice: 'auto',
        temperature: 0.7,
      })

      const finalMessage = secondResponse.choices[0].message
      
      // If there are more tool calls, handle them (max 1 more level to avoid infinite loops)
      if (finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
        const recursiveToolResults: any[] = []
        
        for (const toolCall of finalMessage.tool_calls) {
          const functionName = toolCall.function.name
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}')
          let functionResult: any

          if (functionName === 'get_calendar_events') {
            const period = functionArgs.period || 'today'
            const [appleEvents, outlookEvents] = await Promise.all([
              fetchAppleCalendarEvents(period),
              fetchOutlookCalendarEvents(period).catch(() => []),
            ])
            const allEvents = [...appleEvents, ...outlookEvents]
            
            // Sort events by time
            allEvents.sort((a, b) => {
              const timeA = a.time || '00:00'
              const timeB = b.time || '00:00'
              return timeA.localeCompare(timeB)
            })
            
            // Add current time to events data for filtering
            const now = new Date()
            const currentHour = now.getHours()
            const currentMinute = now.getMinutes()
            const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
            
            functionResult = { 
              events: allEvents,
              currentTime: currentTimeStr,
              currentDate: now.toISOString().split('T')[0],
            }
          } else if (functionName === 'search_nearby_events') {
            const searchLat = functionArgs.latitude || location?.latitude
            const searchLng = functionArgs.longitude || location?.longitude
            const searchQuery = functionArgs.query || 'events'
            if (searchLat && searchLng) {
              const nearbyEvents = await searchNearbyEvents(searchLat, searchLng, searchQuery)
              functionResult = { nearbyEvents }
            } else {
              functionResult = { error: 'Location is required' }
            }
          } else if (functionName === 'search_google') {
            const searchQuery = functionArgs.query || ''
            if (searchQuery) {
              const googleResults = await searchGoogle(searchQuery)
              functionResult = { googleResults }
            } else {
              functionResult = { error: 'Search query is required' }
            }
          } else if (functionName === 'get_weather') {
            let weather = null
            if (functionArgs.latitude && functionArgs.longitude) {
              weather = await getWeather(functionArgs.latitude, functionArgs.longitude)
            } else if (functionArgs.city) {
              weather = await getWeatherByCity(functionArgs.city)
            } else if (location) {
              weather = await getWeather(location.latitude, location.longitude)
            }
            functionResult = weather ? { weather } : { error: 'Could not fetch weather' }
          } else if (functionName === 'play_spotify_track') {
            const query = functionArgs.query
            if (!query) {
              functionResult = { error: 'Search query is required' }
            } else {
              functionResult = { 
                spotifyAction: {
                  action: 'play',
                  query: query,
                },
                message: `Searching for "${query}" on Spotify...`
              }
            }
          } else if (functionName === 'control_spotify_playback') {
            const action = functionArgs.action
            if (!action) {
              functionResult = { error: 'Action is required' }
            } else {
              functionResult = { 
                spotifyAction: {
                  action: 'control',
                  control: action,
                },
                message: `Controlling Spotify: ${action}`
              }
            }
          } else if (functionName === 'get_directions') {
            const destination = functionArgs.destination
            const mode = functionArgs.mode || 'driving'
            
            if (!destination) {
              functionResult = { error: 'Destination is required' }
            } else if (!location) {
              functionResult = { error: 'Location is required for directions. Please enable location permissions.' }
            } else {
              try {
                // Use user's current location
                const origin = { lat: location.latitude, lng: location.longitude }
                
                console.log('📍 Getting directions from', origin, 'to', destination)
                
                // Get best route with all modes to show fastest option
                const routes = await getBestRoute(origin, destination)
                
                if (!routes || Object.keys(routes).length === 0) {
                  functionResult = { 
                    error: `Could not find route to "${destination}". Please check the destination name.` 
                  }
                } else {
                  // Find the fastest route
                  const routeEntries = Object.entries(routes) as Array<[string, Route]>
                  const fastestRoute = routeEntries.reduce((fastest, [routeMode, route]) => {
                    if (!fastest || route.duration.value < fastest.route.duration.value) {
                      return { mode: routeMode, route }
                    }
                    return fastest
                  }, null as { mode: string; route: Route } | null)
                  
                  // Calculate traffic info for fastest route
                  const fastestTrafficInfo = fastestRoute && fastestRoute.route.traffic_delay 
                    ? {
                        delay_seconds: fastestRoute.route.traffic_delay,
                        delay_minutes: Math.round(fastestRoute.route.traffic_delay / 60),
                        has_heavy_traffic: fastestRoute.route.traffic_delay > 300, // More than 5 minutes
                        base_duration: fastestRoute.route.duration_base?.text || fastestRoute.route.duration.text,
                        traffic_duration: fastestRoute.route.duration.text,
                      }
                    : null

                  functionResult = {
                    destination,
                    routes,
                    fastest: fastestRoute ? {
                      mode: fastestRoute.mode,
                      duration: fastestRoute.route.duration.text,
                      distance: fastestRoute.route.distance.text,
                      traffic_info: fastestTrafficInfo,
                    } : null,
                    selectedMode: mode,
                    selectedRoute: routes[mode as keyof typeof routes] || null,
                  }
                }
              } catch (error) {
                console.error('Error getting directions:', error)
                functionResult = { 
                  error: error instanceof Error ? error.message : 'Failed to get directions' 
                }
              }
            }
          } else if (functionName === 'list_controllable_devices') {
            try {
              const devices = await getHomeAssistantDevices(true) // Filter to only controllable devices
              
              // Group devices by type
              const devicesByType: Record<string, any[]> = {}
              
              devices.forEach((device: any) => {
                const domain = device.entity_id.split('.')[0]
                if (!devicesByType[domain]) {
                  devicesByType[domain] = []
                }
                devicesByType[domain].push({
                  entity_id: device.entity_id,
                  name: device.attributes.friendly_name || device.entity_id,
                  state: device.state,
                })
              })
              
              // Format for user-friendly display
              const deviceTypes: Record<string, string> = {
                light: 'Işıklar',
                switch: 'Anahtarlar',
                cover: 'Perdeler',
                climate: 'Termostatlar',
                fan: 'Fanlar',
                lock: 'Kilitler',
                media_player: 'Medya Oynatıcılar',
                vacuum: 'Süpürgeler',
                scene: 'Sahneler',
                script: 'Scriptler',
                input_boolean: 'Boolean Girişler',
                input_number: 'Sayısal Girişler',
                input_select: 'Seçim Girişleri',
                input_text: 'Metin Girişleri',
              }
              
              const formattedDevices = Object.entries(devicesByType).map(([domain, deviceList]) => ({
                type: deviceTypes[domain] || domain,
                domain: domain,
                count: deviceList.length,
                devices: deviceList,
              }))
              
              functionResult = {
                totalDevices: devices.length,
                deviceTypes: formattedDevices,
                summary: `Toplam ${devices.length} kontrol edilebilir cihaz bulundu.`,
              }
            } catch (error) {
              console.error('Error listing devices:', error)
              functionResult = {
                error: error instanceof Error ? error.message : 'Failed to list devices',
              }
            }
          } else if (functionName === 'control_homekit_device') {
            const action = functionArgs.action
            const deviceName = functionArgs.deviceName
            const entityId = functionArgs.entityId
            const brightness = functionArgs.brightness

            if (!action) {
              functionResult = { error: 'Action is required' }
            } else {
              // Declare targetEntityId outside try block so it's accessible in catch
              let targetEntityId: string | undefined = entityId
              
              try {

                // If entity_id not provided, search for device by name
                if (!targetEntityId && deviceName) {
                  console.log(`🔍 Searching for device: ${deviceName}`)
                  const devices = await searchDevices(deviceName)
                  
                  if (devices.length === 0) {
                    functionResult = { 
                      error: `Device "${deviceName}" not found. Please check the device name or use the exact entity_id.` 
                    }
                  } else if (devices.length === 1) {
                    targetEntityId = devices[0].entity_id
                    console.log(`✅ Found device: ${targetEntityId}`)
                  } else {
                    // Multiple devices found, use the first one or return list
                    targetEntityId = devices[0].entity_id
                    console.log(`⚠️ Multiple devices found, using: ${targetEntityId}`)
                    functionResult = {
                      warning: `Multiple devices found for "${deviceName}". Using: ${targetEntityId}`,
                      availableDevices: devices.map(d => ({
                        entity_id: d.entity_id,
                        name: d.attributes.friendly_name || d.entity_id,
                        state: d.state,
                      })),
                    }
                  }
                }

                if (!targetEntityId) {
                  functionResult = { error: 'Device name or entity_id is required' }
                } else {
                  // Perform the action
                  let success = false
                  let message = ''

                  // Determine device type from entity_id
                  const domain = targetEntityId.split('.')[0]
                  
                  switch (action) {
                    case 'turn_on':
                      success = await turnOnDevice(targetEntityId)
                      message = `Turned on ${targetEntityId}`
                      break

                    case 'turn_off':
                      success = await turnOffDevice(targetEntityId)
                      message = `Turned off ${targetEntityId}`
                      break

                    case 'set_brightness':
                      if (typeof brightness !== 'number' || brightness < 0 || brightness > 100) {
                        functionResult = { error: 'Brightness must be a number between 0 and 100' }
                        break
                      }
                      success = await setBrightness(targetEntityId, brightness)
                      message = `Set brightness of ${targetEntityId} to ${brightness}%`
                      break

                    case 'toggle':
                      // Get current state and toggle
                      const currentState = await getDeviceState(targetEntityId)
                      if (currentState === 'on') {
                        success = await turnOffDevice(targetEntityId)
                        message = `Turned off ${targetEntityId}`
                      } else {
                        success = await turnOnDevice(targetEntityId)
                        message = `Turned on ${targetEntityId}`
                      }
                      break

                    // Vacuum (Roomba) actions
                    case 'start':
                      if (domain === 'vacuum') {
                        success = await startVacuum(targetEntityId)
                        message = `Started ${targetEntityId}`
                      } else {
                        success = await turnOnDevice(targetEntityId)
                        message = `Turned on ${targetEntityId}`
                      }
                      break

                    case 'pause':
                      if (domain === 'vacuum') {
                        success = await pauseVacuum(targetEntityId)
                        message = `Paused ${targetEntityId}`
                      } else if (domain === 'media_player') {
                        success = await controlMediaPlayer(targetEntityId, 'pause')
                        message = `Paused ${targetEntityId}`
                      } else {
                        functionResult = { error: `Pause action not supported for ${domain} devices` }
                      }
                      break

                    case 'stop':
                      if (domain === 'vacuum') {
                        success = await stopVacuum(targetEntityId)
                        message = `Stopped ${targetEntityId}`
                      } else if (domain === 'media_player') {
                        success = await controlMediaPlayer(targetEntityId, 'stop')
                        message = `Stopped ${targetEntityId}`
                      } else {
                        success = await turnOffDevice(targetEntityId)
                        message = `Turned off ${targetEntityId}`
                      }
                      break

                    case 'return_to_base':
                      if (domain === 'vacuum') {
                        success = await returnVacuumToBase(targetEntityId)
                        message = `Returned ${targetEntityId} to base`
                      } else {
                        functionResult = { error: `Return to base action only supported for vacuum devices` }
                      }
                      break

                    // Media player actions
                    case 'play':
                      if (domain === 'media_player') {
                        success = await controlMediaPlayer(targetEntityId, 'play')
                        message = `Playing ${targetEntityId}`
                      } else {
                        success = await turnOnDevice(targetEntityId)
                        message = `Turned on ${targetEntityId}`
                      }
                      break

                    case 'next_track':
                      if (domain === 'media_player') {
                        success = await controlMediaPlayer(targetEntityId, 'next_track')
                        message = `Next track on ${targetEntityId}`
                      } else {
                        functionResult = { error: `Next track action only supported for media players` }
                      }
                      break

                    case 'previous_track':
                      if (domain === 'media_player') {
                        success = await controlMediaPlayer(targetEntityId, 'previous_track')
                        message = `Previous track on ${targetEntityId}`
                      } else {
                        functionResult = { error: `Previous track action only supported for media players` }
                      }
                      break

                    default:
                      functionResult = { error: `Unknown action: ${action}` }
                      break
                  }

                  if (success !== undefined) {
                    functionResult = {
                      success,
                      message,
                      entityId: targetEntityId,
                      action,
                    }
                  }
                }
              } catch (error) {
                console.error('Error controlling HomeKit device:', error)
                const errorMessage = error instanceof Error ? error.message : 'Failed to control device'
                
                // Provide more helpful error messages
                let userFriendlyError = errorMessage
                
                if (errorMessage.includes('not configured')) {
                  userFriendlyError = 'Home Assistant yapılandırılmamış. Lütfen environment variables\'ların doğru eklendiğinden emin olun.'
                } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                  userFriendlyError = 'Home Assistant yetkilendirme hatası. Token\'ın geçerli olduğundan emin olun.'
                } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                  const deviceIdentifier = targetEntityId || entityId || deviceName || 'bilinmiyor'
                  userFriendlyError = `Cihaz bulunamadı. Entity ID'yi kontrol edin: ${deviceIdentifier}`
                } else if (errorMessage.includes('Connection') || errorMessage.includes('Network')) {
                  userFriendlyError = 'Home Assistant\'a bağlanılamıyor. URL\'nin doğru olduğundan emin olun.'
                }
                
                functionResult = {
                  error: userFriendlyError,
                  technicalError: errorMessage, // Keep technical error for debugging
                }
              }
            }
          }

          // Check if function result contains Spotify action
          if (functionResult && functionResult.spotifyAction) {
            spotifyAction = functionResult.spotifyAction
          }

          // Ensure content is always a string
          const content = functionResult ? JSON.stringify(functionResult) : JSON.stringify({ error: 'No result' })
          recursiveToolResults.push({
            role: 'tool',
            content: content,
            tool_call_id: toolCall.id,
          })
        }

        const recursiveMessages = [
          ...functionMessages,
          {
            role: 'assistant',
            content: '',
            tool_calls: finalMessage.tool_calls,
          },
          ...recursiveToolResults,
        ]

        const thirdResponse = await getOpenAIClient().chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: recursiveMessages,
          temperature: 0.7,
        })

        return { 
          response: thirdResponse.choices[0].message.content || 'I processed your request, but got no response.',
          spotifyAction 
        }
      }

      const responseContent = finalMessage.content
      if (responseContent) {
        return { response: responseContent, spotifyAction }
      }
      
      // If no content, try to generate a response from the function results
      console.warn('OpenAI returned no content, generating fallback response')
      return { response: 'I processed your request, but got no response.', spotifyAction }
    }

    return { response: message.content || 'I apologize, but I could not generate a response.' }
  } catch (error: any) {
    console.error('❌ OpenAI API error:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      stack: error.stack?.substring(0, 500),
    })
    
    if (error.message?.includes('API key')) {
      return { response: 'OpenAI API key is invalid or missing. Please check your configuration.' }
    }
    
    if (error.status === 400) {
      return { response: 'Geçersiz istek. Lütfen mesajınızı kontrol edip tekrar deneyin.' }
    }
    
    if (error.status === 429) {
      return { response: 'Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.' }
    }
    
    if (error.status === 500 || error.status === 502 || error.status === 503) {
      return { response: 'Sunucu hatası oluştu. Lütfen birkaç saniye sonra tekrar deneyin.' }
    }
    
    // More specific error messages
    const errorMessage = error.message || 'Bilinmeyen bir hata oluştu'
    return { response: `Üzgünüm, bir hata oluştu: ${errorMessage}. Lütfen tekrar deneyin. Eğer sorun devam ederse, lütfen farklı bir şekilde sorunuzu ifade edin.` }
  }
}

