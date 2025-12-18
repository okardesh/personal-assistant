interface CalendarEvent {
  title: string
  date: string
  time: string
  calendar: 'personal' | 'work'
}

export async function getCalendarEvents(period: 'today' | 'tomorrow' | 'week'): Promise<CalendarEvent[]> {
  try {
    // Get the base URL - use window.location for client-side, or environment variable
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const apiUrl = `${baseUrl}/api/calendar?period=${period}`
    console.log('📅 Fetching calendar events from:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to fetch calendar events:', response.status, response.statusText)
      console.error('Error response:', errorText)
      return []
    }

    const data = await response.json()
    console.log('✅ Calendar events fetched:', data.events?.length || 0)
    return data.events || []
  } catch (error) {
    console.error('❌ Error fetching calendar events:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return []
  }
}

