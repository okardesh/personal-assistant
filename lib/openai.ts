import OpenAI from 'openai'
import { getCalendarEvents } from './calendar'
import { getEmails } from './email'
import { fetchICloudEmails } from './icloudEmail'
import { getWeather, getWeatherByCity } from './weather'
import { fetchAppleCalendarEvents, addAppleCalendarEvent } from './appleCalendar'
import { fetchOutlookCalendarEvents, addOutlookCalendarEvent } from './outlookCalendar'
import { searchNearbyEvents, searchGoogle } from './googleSearch'

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
    description: 'Get calendar events from the user\'s PERSONAL calendar (Apple Calendar or Outlook). ONLY use this when the user explicitly mentions their calendar, appointments, meetings, or schedule (e.g., "takvimim", "randevularım", "toplantılarım", "my calendar", "my appointments"). Do NOT use this for general questions about events, sports matches, concerts, or public events - use Google search instead.',
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
]

export async function chatWithOpenAI(
  messages: Message[],
  location?: Location | null
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.'
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

    // Add system message with context
    const systemMessage: Message = {
      role: 'system',
      content: `You are a helpful personal assistant. You can help users with:
- Calendar: Check their PERSONAL calendar events (ONLY when they explicitly mention "takvimim", "randevularım", "toplantılarım", "my calendar", "my appointments")
- Calendar: Add events to their calendar when they ask (e.g., "bunu takvimime ekle", "add to calendar", "takvime ekle")
- Email: Check their inbox and unread emails, summarize emails when asked
- Weather: Get current weather information for their location or any city
- Location: You have access to the user's current location if they grant permission
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
- Today is day ${now.getDay()} of the week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)

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
    - CRITICAL: You MUST read and use the snippet content to create a detailed summary
    - If the snippet is long (more than 100 characters), it contains the actual email body - READ IT CAREFULLY and USE IT
    - If snippet contains "Email Details:" header, it means body wasn't retrieved, but you STILL have subject, sender, and date - USE THEM
    - ALWAYS create a comprehensive summary based on the snippet content
    - If snippet is short or contains metadata, still create a meaningful summary using subject, sender, and date
    - Example good response: "LinkedIn'den gelen bu email, 6 yeni davetiyeniz olduğunu bildiriyor. Email içeriğinde Burak Cucu ve Göksan Kadayıfcı'nın katıldığı bir etkinlikte paylaştıkları bilgiler de yer alıyor."
    - Example bad response (FORBIDDEN - NEVER DO THIS): "E-posta içeriği hakkında daha fazla bilgiye ulaşamıyorum. Başka bir konuda yardımcı olabilir miyim?"
    - If you see this phrase in your response, DELETE IT IMMEDIATELY and replace with a summary based on available information

    Email fetching logic:
    - When user asks about emails, first check for unread emails (up to 5)
    - If no unread emails exist, fetch and summarize the latest email
    - If the email data has _metadata.noUnreadEmails = true, it means there are no unread emails
    - In that case, always inform the user: "Hiç okunmamış email yok" and then summarize the latest email
    - Show unread emails if available, otherwise show the latest email with a note that there are no unread emails

When displaying calendar events, format them nicely:
- Sort events by time
- Show time in a readable format (e.g., "14:30" or "2:30 PM")
- Include location if available: "⏰ 14:30 - Toplantı 📍 İstanbul"
- For today: "📅 Bugünkü Etkinlikleriniz:\n\n⏰ 14:30 - Toplantı 📍 İstanbul\n⏰ 16:00 - Randevu"
- For tomorrow: "📅 Yarınki Etkinlikleriniz:\n\n⏰ 10:00 - Toplantı 📍 İstanbul\n⏰ 14:00 - Randevu"
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
          
          functionResult = { events }
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
              } else {
                functionResult = { error: 'Unknown function' }
              }
            } catch (functionError: any) {
              console.error(`❌ Error executing function ${functionName}:`, functionError)
              functionResult = { 
                error: `Failed to execute ${functionName}: ${functionError.message || 'Unknown error'}` 
              }
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
            functionResult = { events: [...appleEvents, ...outlookEvents] }
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

        return thirdResponse.choices[0].message.content || 'I processed your request, but got no response.'
      }

      const responseContent = finalMessage.content
      if (responseContent) {
        return responseContent
      }
      
      // If no content, try to generate a response from the function results
      console.warn('OpenAI returned no content, generating fallback response')
      return 'I processed your request, but got no response.'
    }

    return message.content || 'I apologize, but I could not generate a response.'
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
      return 'OpenAI API key is invalid or missing. Please check your configuration.'
    }
    
    if (error.status === 400) {
      return 'Geçersiz istek. Lütfen mesajınızı kontrol edip tekrar deneyin.'
    }
    
    if (error.status === 429) {
      return 'Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.'
    }
    
    if (error.status === 500 || error.status === 502 || error.status === 503) {
      return 'Sunucu hatası oluştu. Lütfen birkaç saniye sonra tekrar deneyin.'
    }
    
    // More specific error messages
    const errorMessage = error.message || 'Bilinmeyen bir hata oluştu'
    return `Üzgünüm, bir hata oluştu: ${errorMessage}. Lütfen tekrar deneyin. Eğer sorun devam ederse, lütfen farklı bir şekilde sorunuzu ifade edin.`
  }
}

