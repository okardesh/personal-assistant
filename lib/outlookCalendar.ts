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
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
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
        return data.access_token
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
  const accessToken = await getMicrosoftAccessToken()

  if (!accessToken) {
    return []
  }

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
      if (response.status === 401) {
        console.error('Outlook authentication failed. Token may be expired.')
      } else {
        console.error('Microsoft Graph API request failed:', response.status, response.statusText)
      }
      return []
    }

    const data = await response.json()
    const events: CalendarEvent[] = []

    for (const item of data.value || []) {
      const startDateTime = new Date(item.start.dateTime)
      const endDateTime = item.end ? new Date(item.end.dateTime) : undefined

      events.push({
        title: item.subject || 'Untitled Event',
        date: startDateTime.toISOString().split('T')[0],
        time: startDateTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        calendar: 'work',
        start: startDateTime,
        end: endDateTime,
        description: item.bodyPreview,
        location: item.location?.displayName,
      })
    }

    // Filter events by period
    return events.filter(event => {
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
  } catch (error) {
    console.error('Error fetching Outlook Calendar events:', error)
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

