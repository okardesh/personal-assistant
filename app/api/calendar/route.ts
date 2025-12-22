import { NextRequest, NextResponse } from 'next/server'
import { fetchAppleCalendarEvents } from '@/lib/appleCalendar'
import { fetchOutlookCalendarEvents } from '@/lib/outlookCalendar'

interface CalendarEvent {
  title: string
  date: string
  time: string
  calendar: 'personal' | 'work'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = (searchParams.get('period') || 'today') as 'today' | 'tomorrow' | 'week'

    console.log('📅 Calendar API called with period:', period)

    // Fetch from calendars
    // Outlook Calendar temporarily disabled (requires admin consent)
    let appleEvents: CalendarEvent[] = []
    let outlookEvents: CalendarEvent[] = []

    try {
      console.log('🍎 Fetching Apple Calendar events...')
      appleEvents = await fetchAppleCalendarEvents(period)
      console.log('🍎 Apple Calendar events fetched:', appleEvents.length)
    } catch (error) {
      console.error('❌ Apple Calendar error:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
    }

    try {
      console.log('📧 Fetching Outlook Calendar events...')
      console.log('📧 Outlook config check:', {
        hasClientId: !!process.env.OUTLOOK_CLIENT_ID,
        hasClientSecret: !!process.env.OUTLOOK_CLIENT_SECRET,
        hasTenantId: !!process.env.OUTLOOK_TENANT_ID,
        hasRefreshToken: !!process.env.OUTLOOK_REFRESH_TOKEN,
        tenantId: process.env.OUTLOOK_TENANT_ID,
      })
      outlookEvents = await fetchOutlookCalendarEvents(period).catch((err) => {
        console.error('❌ Outlook Calendar fetch error:', err)
        return []
      })
      console.log('📧 Outlook Calendar events fetched:', outlookEvents.length)
    } catch (error) {
      console.error('❌ Outlook Calendar error:', error)
      if (error instanceof Error) {
        console.error('❌ Outlook Calendar error details:', error.message, error.stack)
      }
      // Silently fail for Outlook
    }

    // Combine and sort events
    const allEvents = [...appleEvents, ...outlookEvents].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`)
      const dateB = new Date(`${b.date} ${b.time}`)
      return dateA.getTime() - dateB.getTime()
    })

    console.log('✅ Total events:', allEvents.length)
    console.log('📊 Event breakdown:', {
      apple: appleEvents.length,
      outlook: outlookEvents.length,
      total: allEvents.length,
      appleTitles: appleEvents.map(e => e.title),
      outlookTitles: outlookEvents.map(e => e.title),
    })
    return NextResponse.json({ events: allEvents })
  } catch (error) {
    console.error('❌ Calendar API error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

