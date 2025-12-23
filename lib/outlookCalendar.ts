// Outlook Calendar integration using Microsoft Graph API

interface CalendarEvent {
  title: string
  date: string
  time: string
  calendar: 'personal' | 'work'
  start: Date
  end?: Date
  description?: string
  location?: string
}

interface MicrosoftTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

async function getMicrosoftAccessToken(): Promise<string | null> {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'
  const refreshToken = process.env.OUTLOOK_REFRESH_TOKEN

  if (!clientId || !clientSecret) {
    console.warn('Outlook credentials not configured')
    return null
  }

  try {
    // If we have a refresh token, use it
    if (refreshToken) {
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Mail.Read offline_access',
      })

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (response.ok) {
        const data: MicrosoftTokenResponse = await response.json()
        console.log('✅ Outlook token refreshed successfully')
        return data.access_token
      } else {
        const errorText = await response.text()
        console.error('❌ Outlook token refresh failed:', response.status, response.statusText, errorText)
        return null
      }
    }

    // For initial setup, user needs to authenticate via OAuth
    // This is a placeholder - in production, you'd implement OAuth flow
    console.warn('Outlook OAuth token required. Please implement OAuth flow or provide refresh token.')
    return null
  } catch (error) {
    console.error('Error getting Microsoft access token:', error)
    return null
  }
}

export async function fetchOutlookCalendarEvents(
  period: 'today' | 'tomorrow' | 'week'
): Promise<CalendarEvent[]> {
  console.log('📧 [Outlook] Starting to fetch calendar events for period:', period)
  const accessToken = await getMicrosoftAccessToken()

  if (!accessToken) {
    console.warn('⚠️ [Outlook] No access token available, returning empty array')
    return []
  }
  
  console.log('✅ [Outlook] Access token obtained, fetching events...')

  try {
    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    } else if (period === 'tomorrow') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)
    } else {
      // week
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
    }

    // Format dates for Microsoft Graph API
    const formatDate = (date: Date) => {
      return date.toISOString()
    }

    const start = formatDate(startDate)
    const end = formatDate(endDate)

    // Microsoft Graph API endpoint
    const graphUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start}&endDateTime=${end}&$select=subject,start,end,bodyPreview,location&$orderby=start/dateTime`

    const response = await fetch(graphUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 401) {
        console.error('❌ [Outlook] Authentication failed. Token may be expired. Status:', response.status, 'Error:', errorText)
      } else {
        console.error('❌ [Outlook] Microsoft Graph API request failed. Status:', response.status, response.statusText, 'Error:', errorText)
      }
      return []
    }

    const data = await response.json()
    console.log('📧 [Outlook] Graph API response received, events count:', data.value?.length || 0)
    const events: CalendarEvent[] = []

    for (const item of data.value || []) {
      // Microsoft Graph API returns dateTime in ISO 8601 format
      // The dateTime might be in UTC (ending with Z) or without timezone info
      // We need to ensure it's treated as UTC and converted to Turkish time (Europe/Istanbul, UTC+3)
      let startDateTimeStr = item.start.dateTime
      let endDateTimeStr = item.end?.dateTime
      
      // If dateTime doesn't end with Z or timezone offset, it's likely UTC
      // Add Z to ensure it's parsed as UTC
      if (!startDateTimeStr.endsWith('Z') && !startDateTimeStr.match(/[+-]\d{2}:\d{2}$/)) {
        // Remove any fractional seconds and add Z for UTC
        startDateTimeStr = startDateTimeStr.split('.')[0] + 'Z'
      }
      if (endDateTimeStr && !endDateTimeStr.endsWith('Z') && !endDateTimeStr.match(/[+-]\d{2}:\d{2}$/)) {
        endDateTimeStr = endDateTimeStr.split('.')[0] + 'Z'
      }
      
      // Parse as UTC
      const startDateTimeUTC = new Date(startDateTimeStr)
      const endDateTimeUTC = endDateTimeStr ? new Date(endDateTimeStr) : undefined
      
      // Get the timezone from the event if available (for logging/debugging)
      const eventTimeZone = item.start.timeZone || 'UTC'
      
      // Convert to Turkish time (Europe/Istanbul, UTC+3)
      // Use Intl.DateTimeFormat to format in Turkish timezone
      const turkishTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      
      // Format start date/time in Turkish timezone
      const startParts = turkishTimeFormatter.formatToParts(startDateTimeUTC)
      const startYear = startParts.find(p => p.type === 'year')?.value || ''
      const startMonth = startParts.find(p => p.type === 'month')?.value || ''
      const startDay = startParts.find(p => p.type === 'day')?.value || ''
      const startHour = startParts.find(p => p.type === 'hour')?.value || ''
      const startMinute = startParts.find(p => p.type === 'minute')?.value || ''
      
      const dateStr = `${startYear}-${startMonth}-${startDay}`
      const timeStr = `${startHour}:${startMinute}`
      
      // Create Date objects in Turkish timezone for filtering
      // We'll create a new Date object that represents the Turkish time
      // by parsing the formatted string
      const turkishStartDate = new Date(`${startYear}-${startMonth}-${startDay}T${startHour}:${startMinute}:00+03:00`)
      
      console.log(`📧 [Outlook] Event "${item.subject}": original="${item.start.dateTime}", UTC="${startDateTimeUTC.toISOString()}", Turkish="${dateStr} ${timeStr}"`)

      events.push({
        title: item.subject || 'Untitled Event',
        date: dateStr,
        time: timeStr,
        calendar: 'work',
        start: turkishStartDate, // Use Turkish timezone Date for filtering
        end: endDateTimeUTC, // Keep UTC for end time (can be converted similarly if needed)
        description: item.bodyPreview,
        location: item.location?.displayName,
      })
    }

    console.log('📧 [Outlook] Parsed events before filtering:', events.length, 'events')
    // Filter events by period
    const filteredEvents = events.filter(event => {
      const eventDate = event.start
      if (period === 'today') {
        return eventDate.toDateString() === now.toDateString()
      } else if (period === 'tomorrow') {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return eventDate.toDateString() === tomorrow.toDateString()
      } else {
        // week
        return eventDate >= startDate && eventDate < endDate
      }
    })
    
    console.log('📧 [Outlook] Filtered events for period', period, ':', filteredEvents.length, 'events')
    console.log('📧 [Outlook] Event titles:', filteredEvents.map(e => e.title))
    return filteredEvents
  } catch (error) {
    console.error('❌ [Outlook] Error fetching Outlook Calendar events:', error)
    if (error instanceof Error) {
      console.error('❌ [Outlook] Error message:', error.message)
      console.error('❌ [Outlook] Error stack:', error.stack)
    }
    return []
  }
}

export interface AddEventParams {
  title: string
  start: Date
  end: Date
  location?: string
  description?: string
  calendar?: 'personal' | 'work'
}

export async function addOutlookCalendarEvent(params: AddEventParams): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getMicrosoftAccessToken()

  if (!accessToken) {
    return { success: false, error: 'Outlook authentication failed. Please authenticate first.' }
  }

  try {
    // Microsoft Graph API endpoint for creating events
    const graphUrl = 'https://graph.microsoft.com/v1.0/me/events'

    const eventData = {
      subject: params.title,
      start: {
        dateTime: params.start.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: params.end.toISOString(),
        timeZone: 'UTC',
      },
      ...(params.location && { location: { displayName: params.location } }),
      ...(params.description && { body: { contentType: 'text', content: params.description } }),
    }

    const response = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    })

    if (response.ok || response.status === 201) {
      console.log('✅ Outlook Calendar event added successfully')
      return { success: true }
    } else {
      const errorText = await response.text()
      console.error('❌ Failed to add Outlook Calendar event:', response.status, errorText)
      
      if (response.status === 401) {
        return { success: false, error: 'Outlook authentication expired. Please re-authenticate.' }
      }
      
      return { success: false, error: `Failed to add event: ${response.status} ${response.statusText}` }
    }
  } catch (error) {
    console.error('❌ Error adding Outlook Calendar event:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

