// Apple Calendar integration using CalDAV protocol
// Supports iCloud and other CalDAV-compatible servers

interface CalendarEvent {
  title: string
  date: string
  time: string
  calendar: 'personal' | 'work'
  start: Date
  end?: Date
  location?: string
}

function parseICalendarDate(dateStr: string): Date {
  // Parse iCalendar date format: 20240115T120000Z or 20240115T120000
  const cleaned = dateStr.replace(/[TZ]/g, ' ').trim()
  const year = cleaned.substring(0, 4)
  const month = cleaned.substring(4, 6)
  const day = cleaned.substring(6, 8)
  const hour = cleaned.substring(9, 11) || '00'
  const minute = cleaned.substring(11, 13) || '00'
  const second = cleaned.substring(13, 15) || '00'
  
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
}

function parseICalendar(icalData: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const lines = icalData.split('\n')
  
  let currentEvent: any = null
  let inEvent = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.start) {
        const startDate = parseICalendarDate(currentEvent.start)
        const endDate = currentEvent.end ? parseICalendarDate(currentEvent.end) : undefined
        
        events.push({
          title: currentEvent.summary || 'Untitled Event',
          date: startDate.toISOString().split('T')[0],
          time: startDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          calendar: 'personal',
          start: startDate,
          end: endDate,
          location: currentEvent.location,
        })
      }
      inEvent = false
      currentEvent = null
    } else if (inEvent && currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8).trim()
      } else if (line.startsWith('DTSTART')) {
        const dateStr = line.includes(':') ? line.split(':')[1] : lines[i + 1]?.trim()
        if (dateStr) currentEvent.start = dateStr
      } else if (line.startsWith('DTEND')) {
        const dateStr = line.includes(':') ? line.split(':')[1] : lines[i + 1]?.trim()
        if (dateStr) currentEvent.end = dateStr
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9).trim()
      }
    }
  }
  
  return events
}

export async function fetchAppleCalendarEvents(
  period: 'today' | 'tomorrow' | 'week'
): Promise<CalendarEvent[]> {
  const caldavUrl = process.env.APPLE_CALENDAR_URL || process.env.CALDAV_URL
  const username = process.env.APPLE_CALENDAR_USERNAME || process.env.CALDAV_USERNAME
  const password = process.env.APPLE_CALENDAR_PASSWORD || process.env.CALDAV_PASSWORD

  console.log('🍎 Apple Calendar - Starting fetch...')
  console.log('🍎 CalDAV URL:', caldavUrl)
  console.log('🍎 Username:', username ? `${username.substring(0, 3)}***` : 'NOT SET')
  console.log('🍎 Password:', password ? 'SET' : 'NOT SET')

  if (!caldavUrl || !username || !password) {
    console.warn('❌ Apple Calendar credentials not configured')
    console.warn('Missing:', {
      caldavUrl: !caldavUrl,
      username: !username,
      password: !password,
    })
    return []
  }

  try {
    // For iCloud CalDAV, we need to discover the calendar home set
    // Step 1: Find principal URL
    // Step 2: Get calendar-home-set from principal
    let calendarHomeUrl = caldavUrl
    
    if (caldavUrl.includes('caldav.icloud.com')) {
      try {
        // First, try to find principal URL using current-user-principal
        const principalPropfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:current-user-principal/>
  </D:prop>
</D:propfind>`

        const principalResponse = await fetch(caldavUrl, {
          method: 'PROPFIND',
          headers: {
            'Content-Type': 'application/xml',
            'Depth': '0',
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          },
          body: principalPropfindBody,
        })

        let principalUrl = caldavUrl
        let principalPath = '/'
        if (principalResponse.ok) {
          const principalData = await principalResponse.text()
          console.log('Principal response:', principalData.substring(0, 500))
          // Try multiple regex patterns to handle different XML formats
          const patterns = [
            /<[^:]*:current-user-principal[^>]*><[^:]*:href[^>]*>([^<]+)<\/[^:]*:href><\/[^:]*:current-user-principal>/,
            /<current-user-principal[^>]*><href[^>]*>([^<]+)<\/href><\/current-user-principal>/,
            /current-user-principal[^>]*>[\s\S]*?<href[^>]*>([^<]+)<\/href>/,
          ]
          
          let found = false
          for (const pattern of patterns) {
            const principalMatch = principalData.match(pattern)
            if (principalMatch && principalMatch[1]) {
              principalPath = principalMatch[1].trim()
              // Make absolute URL if relative
              if (principalPath.startsWith('/')) {
                const urlObj = new URL(caldavUrl)
                principalUrl = `${urlObj.protocol}//${urlObj.host}${principalPath}`
              } else {
                principalUrl = principalPath
              }
              console.log('✅ Found principal URL:', principalUrl)
              console.log('✅ Found principal path:', principalPath)
              found = true
              break
            }
          }
          
          if (!found) {
            console.warn('❌ Could not find current-user-principal in response')
            console.warn('Response preview:', principalData.substring(0, 1000))
          }
        }

        // Now get calendar-home-set from principal
        const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <C:calendar-home-set/>
  </D:prop>
</D:propfind>`

        const propfindResponse = await fetch(principalUrl, {
          method: 'PROPFIND',
          headers: {
            'Content-Type': 'application/xml',
            'Depth': '0',
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          },
          body: propfindBody,
        })

        if (propfindResponse.ok) {
          const propfindData = await propfindResponse.text()
          console.log('Calendar home response:', propfindData.substring(0, 1000))
          // Try multiple regex patterns to handle different XML formats
          const homeSetPatterns = [
            /<[^:]*:calendar-home-set[^>]*><[^:]*:href[^>]*>([^<]+)<\/[^:]*:href><\/[^:]*:calendar-home-set>/,
            /<calendar-home-set[^>]*><href[^>]*>([^<]+)<\/href><\/calendar-home-set>/,
            /calendar-home-set[^>]*>[\s\S]*?<href[^>]*>([^<]+)<\/href>/,
          ]
          
          let found = false
          for (const pattern of homeSetPatterns) {
            const homeSetMatch = propfindData.match(pattern)
            if (homeSetMatch && homeSetMatch[1]) {
              calendarHomeUrl = homeSetMatch[1].trim()
              // URL is already absolute, use it as is
              console.log('✅ Found calendar home URL:', calendarHomeUrl)
              found = true
              break
            }
          }
          
          if (!found) {
            console.warn('Could not find calendar-home-set in response')
            // Fallback: Try to construct calendar home URL from principal path
            // iCloud format: /269602925/principal/ -> /269602925/calendars/
            if (principalPath && principalPath.includes('/principal/')) {
              const calendarsPath = principalPath.replace('/principal/', '/calendars/')
              const urlObj = new URL(caldavUrl)
              calendarHomeUrl = `${urlObj.protocol}//${urlObj.host}${calendarsPath}`
              console.log('✅ Using fallback calendar home URL:', calendarHomeUrl)
            } else {
              console.warn('❌ Cannot construct calendar home URL - principal path not found')
            }
          }
        } else {
          console.warn('PROPFIND failed:', propfindResponse.status, propfindResponse.statusText)
          // Fallback: Try to construct calendar home URL from principal path
          if (principalPath && principalPath.includes('/principal/')) {
            const calendarsPath = principalPath.replace('/principal/', '/calendars/')
            const urlObj = new URL(caldavUrl)
            calendarHomeUrl = `${urlObj.protocol}//${urlObj.host}${calendarsPath}`
            console.log('✅ Using fallback calendar home URL (after PROPFIND failure):', calendarHomeUrl)
          } else {
            console.warn('❌ Cannot construct calendar home URL - principal path not found')
          }
        }
      } catch (error) {
        console.warn('Calendar home discovery failed, using default URL:', error)
      }
    }

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

    // Format dates for CalDAV query
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const start = formatDate(startDate)
    const end = formatDate(endDate)

    // CalDAV REPORT request
    // Request calendar-data with full iCalendar content
    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${start}" end="${end}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

    // First, list all calendars in the calendar home
    console.log('📋 Listing calendars in:', calendarHomeUrl)
    const listResponse = await fetch(calendarHomeUrl, {
      method: 'PROPFIND',
      headers: {
        'Content-Type': 'application/xml',
        'Depth': '1',
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
    })
    
    let calendarUrls: string[] = []
    const preferredCalendarName = process.env.APPLE_CALENDAR_NAME || 'Onur' // Default to "Onur" if not specified
    if (listResponse.ok) {
      const listData = await listResponse.text()
      console.log('📋 Calendar list response:', listData.substring(0, 2000))
      
      // Parse XML to extract calendar URLs with their display names
      // Match pattern: <response><href>...</href><propstat><prop><displayname>...</displayname></prop></propstat></response>
      const responseRegex = /<D:response[^>]*>([\s\S]*?)<\/D:response>/g
      let responseMatch
      const calendarMap = new Map<string, string>() // Map of displayname -> URL
      
      while ((responseMatch = responseRegex.exec(listData)) !== null) {
        const responseContent = responseMatch[1]
        
        // Extract href
        const hrefMatch = responseContent.match(/<D:href[^>]*>([^<]+)<\/D:href>/i) || 
                         responseContent.match(/<href[^>]*>([^<]+)<\/href>/i)
        if (!hrefMatch) continue
        
        const href = hrefMatch[1].trim()
        const calendarHomePath = calendarHomeUrl.replace(/^https?:\/\/[^\/]+/, '')
        
        // Skip the calendar home URL itself
        if (href === calendarHomeUrl || href === calendarHomePath || 
            href === calendarHomePath.replace(/\/$/, '') || href === calendarHomePath + '/') {
          continue
        }
        
        // Extract displayname
        const displayNameMatch = responseContent.match(/<D:displayname[^>]*>([^<]+)<\/D:displayname>/i) ||
                                 responseContent.match(/<displayname[^>]*>([^<]+)<\/displayname>/i)
        const displayName = displayNameMatch ? displayNameMatch[1].trim() : ''
        
        // Make absolute URL if relative
        let calendarUrl = href
        if (calendarUrl.startsWith('/')) {
          const urlObj = new URL(calendarHomeUrl)
          calendarUrl = `${urlObj.protocol}//${urlObj.host}${calendarUrl}`
        }
        
        // Filter out special calendars
        const specialCalendars = ['inbox', 'notification', 'outbox', 'tasks']
        const isSpecial = specialCalendars.some(special => 
          calendarUrl.toLowerCase().includes(`/${special}/`) || 
          displayName.toLowerCase().includes(special)
        )
        
        if (!isSpecial) {
          calendarMap.set(displayName, calendarUrl)
          console.log(`📋 Found calendar: "${displayName}" -> ${calendarUrl}`)
        }
      }
      
      // Prefer calendar with name matching preferredCalendarName
      const preferredCalendar = Array.from(calendarMap.entries()).find(([name]) => 
        name.toLowerCase().includes(preferredCalendarName.toLowerCase())
      )
      
      if (preferredCalendar) {
        console.log(`✅ Using preferred calendar: "${preferredCalendar[0]}"`)
        calendarUrls = [preferredCalendar[1]]
      } else {
        // If preferred calendar not found, use all calendars
        calendarUrls = Array.from(calendarMap.values())
        console.log(`⚠️ Preferred calendar "${preferredCalendarName}" not found, using all calendars`)
      }
      
      console.log('📋 Selected', calendarUrls.length, 'calendar(s):', calendarUrls)
    } else {
      console.warn('⚠️ Failed to list calendars:', listResponse.status, listResponse.statusText)
      // Fallback: try calendar home directly
      calendarUrls = [calendarHomeUrl]
    }
    
    // If no calendars found, try calendar home directly
    if (calendarUrls.length === 0) {
      console.log('📋 No calendars found, trying calendar home directly')
      calendarUrls = [calendarHomeUrl]
    }
    
    // Now query each calendar for events
    console.log('📅 Making CalDAV REPORT requests to', calendarUrls.length, 'calendar(s)')
    console.log('📅 Calendar URLs:', JSON.stringify(calendarUrls, null, 2))
    const allEvents: CalendarEvent[] = []
    
    for (const calendarUrl of calendarUrls) {
      console.log('📅 Querying calendar:', calendarUrl)
      console.log('📅 Calendar URL details:', {
        url: calendarUrl,
        period: period,
        startDate: period === 'today' ? new Date().toISOString().split('T')[0] : 
                   period === 'tomorrow' ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : 
                   'week',
      })
      const response = await fetch(calendarUrl, {
        method: 'REPORT',
        headers: {
          'Content-Type': 'application/xml',
          'Depth': '1',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        },
        body: reportBody,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response')
        console.error('❌ CalDAV request failed for', calendarUrl)
        console.error('❌ Status:', response.status, response.statusText)
        console.error('❌ Error response:', errorText.substring(0, 500))
        continue
      }

      const xmlData = await response.text()
      console.log('📅 Calendar response length:', xmlData.length)
      console.log('📅 Calendar response (first 2000 chars):', xmlData.substring(0, 2000))
      console.log('📅 Calendar response (last 500 chars):', xmlData.substring(Math.max(0, xmlData.length - 500)))
      
      // Extract iCalendar data from XML response
      // Try multiple patterns to handle different XML formats
      const patterns = [
        /<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/g,
        /<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/g,
        /<[^:]*:calendar-data[^>]*>([\s\S]*?)<\/[^:]*:calendar-data>/g,
      ]
      
      let icalMatches: RegExpMatchArray | null = null
      for (const pattern of patterns) {
        icalMatches = xmlData.match(pattern)
        if (icalMatches && icalMatches.length > 0) {
          console.log('✅ Found calendar-data using pattern:', pattern.toString())
          break
        }
      }
      
      if (!icalMatches || icalMatches.length === 0) {
        console.warn('⚠️ No calendar-data found in XML response for', calendarUrl)
        // Check if there are event hrefs - if so, fetch them individually
        const eventHrefRegex = /<href[^>]*>([^<]+\.ics)<\/href>/g
        const eventHrefs: string[] = []
        let hrefMatch
        while ((hrefMatch = eventHrefRegex.exec(xmlData)) !== null) {
          eventHrefs.push(hrefMatch[1].trim())
        }
        
        if (eventHrefs.length > 0) {
          console.log('📋 Found', eventHrefs.length, 'event hrefs, fetching individually...')
          // Fetch each event individually
          for (const eventHref of eventHrefs) {
            try {
              // Make absolute URL if relative
              let eventUrl = eventHref
              if (eventUrl.startsWith('/')) {
                const urlObj = new URL(calendarUrl)
                eventUrl = `${urlObj.protocol}//${urlObj.host}${eventUrl}`
              } else if (!eventUrl.startsWith('http')) {
                // Relative to calendar URL
                const urlObj = new URL(calendarUrl)
                eventUrl = `${urlObj.protocol}//${urlObj.host}${eventUrl.startsWith('/') ? '' : '/'}${eventUrl}`
              }
              
              const eventResponse = await fetch(eventUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
                },
              })
              
              if (eventResponse.ok) {
                const icalData = await eventResponse.text()
                const events = parseICalendar(icalData)
                console.log('✅ Fetched', events.length, 'events from', eventUrl)
                allEvents.push(...events)
              }
            } catch (error) {
              console.warn('⚠️ Failed to fetch event', eventHref, ':', error)
            }
          }
        }
        continue
      }
      
      console.log('✅ Found', icalMatches.length, 'calendar-data matches')

      // Combine all iCalendar data
      let allICalData = ''
      for (const match of icalMatches) {
        // Handle both regular and escaped XML
        let icalContent = match.replace(/<\/?C:calendar-data[^>]*>/g, '').trim()
        // Also try HTML-escaped version
        icalContent = icalContent.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        allICalData += icalContent + '\n'
      }

      console.log('📅 Combined iCalendar data length:', allICalData.length)

      // Parse iCalendar data
      const events = parseICalendar(allICalData)
      console.log('✅ Parsed', events.length, 'events from calendar:', calendarUrl)
      allEvents.push(...events)
    }
    
    // Parse all events
    console.log('📅 Total events found:', allEvents.length)
    const events = allEvents

    // Filter events by period
    console.log('📅 Total events before filtering:', events.length)
    console.log('📅 Period:', period)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
    
    console.log('📅 Date range:', {
      period,
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString(),
      weekEnd: weekEnd.toISOString(),
      now: now.toISOString(),
    })
    
    if (events.length > 0) {
      console.log('📅 All events before filtering:', events.map(e => ({
        title: e.title,
        date: e.date,
        time: e.time,
        start: e.start?.toISOString(),
        startDate: e.start?.toDateString(),
      })))
    }
    
    const filteredEvents = events.filter(event => {
      const eventDate = event.start
      if (period === 'today') {
        const isToday = eventDate.toDateString() === now.toDateString()
        console.log(`Event "${event.title}" on ${eventDate.toDateString()} - Today: ${isToday}`)
        return isToday
      } else if (period === 'tomorrow') {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return eventDate.toDateString() === tomorrow.toDateString()
      } else {
        // week
        return eventDate >= startDate && eventDate < endDate
      }
    })
    
    console.log('Filtered events count:', filteredEvents.length)
    return filteredEvents
  } catch (error) {
    console.error('❌ Error fetching Apple Calendar events:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return []
  }
}

// Generate iCalendar format string
function generateICalendar(
  title: string,
  start: Date,
  end: Date,
  location?: string,
  description?: string
): string {
  const formatDate = (date: Date): string => {
    // iCalendar format: YYYYMMDDTHHMMSSZ
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
  }

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  const now = new Date()
  const uid = `${Date.now()}-${Math.random().toString(36).substring(7)}@personal-assistant`
  
  // Ensure dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date provided')
  }
  
  // Ensure end is after start
  if (end <= start) {
    throw new Error('End date must be after start date')
  }
  
  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Personal Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `CREATED:${formatDate(now)}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${escapeText(title)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    `LAST-MODIFIED:${formatDate(now)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return ical
}

export interface AddEventParams {
  title: string
  start: Date
  end: Date
  location?: string
  description?: string
  calendar?: 'personal' | 'work'
}

export async function addAppleCalendarEvent(params: AddEventParams): Promise<{ success: boolean; error?: string }> {
  const caldavUrl = process.env.APPLE_CALENDAR_URL || process.env.CALDAV_URL
  const username = process.env.APPLE_CALENDAR_USERNAME || process.env.CALDAV_USERNAME
  const password = process.env.APPLE_CALENDAR_PASSWORD || process.env.CALDAV_PASSWORD

  if (!caldavUrl || !username || !password) {
    return { success: false, error: 'Apple Calendar credentials not configured' }
  }

  try {
    // Discover calendar home URL (same logic as fetchAppleCalendarEvents)
    let calendarHomeUrl = caldavUrl
    
    if (caldavUrl.includes('caldav.icloud.com')) {
      try {
        // First, try to find principal URL using current-user-principal
        const principalPropfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:current-user-principal/>
  </D:prop>
</D:propfind>`

        const principalResponse = await fetch(caldavUrl, {
          method: 'PROPFIND',
          headers: {
            'Content-Type': 'application/xml',
            'Depth': '0',
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          },
          body: principalPropfindBody,
        })

        let principalUrl = caldavUrl
        let principalPath = '/'
        if (principalResponse.ok) {
          const principalData = await principalResponse.text()
          console.log('📅 Principal response:', principalData.substring(0, 500))
          // Try multiple regex patterns to handle different XML formats
          const patterns = [
            /<[^:]*:current-user-principal[^>]*><[^:]*:href[^>]*>([^<]+)<\/[^:]*:href><\/[^:]*:current-user-principal>/,
            /<current-user-principal[^>]*><href[^>]*>([^<]+)<\/href><\/current-user-principal>/,
            /current-user-principal[^>]*>[\s\S]*?<href[^>]*>([^<]+)<\/href>/,
          ]
          
          let found = false
          for (const pattern of patterns) {
            const principalMatch = principalData.match(pattern)
            if (principalMatch && principalMatch[1]) {
              principalPath = principalMatch[1].trim()
              // Make absolute URL if relative
              if (principalPath.startsWith('/')) {
                const urlObj = new URL(caldavUrl)
                principalUrl = `${urlObj.protocol}//${urlObj.host}${principalPath}`
              } else {
                principalUrl = principalPath
              }
              console.log('✅ Found principal URL:', principalUrl)
              console.log('✅ Found principal path:', principalPath)
              found = true
              break
            }
          }
          
          if (!found) {
            console.warn('❌ Could not find current-user-principal in response')
            console.warn('Response preview:', principalData.substring(0, 1000))
          }
        }

        // Now get calendar-home-set from principal
        const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <C:calendar-home-set/>
  </D:prop>
</D:propfind>`

        const propfindResponse = await fetch(principalUrl, {
          method: 'PROPFIND',
          headers: {
            'Content-Type': 'application/xml',
            'Depth': '0',
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          },
          body: propfindBody,
        })

        if (propfindResponse.ok) {
          const propfindData = await propfindResponse.text()
          console.log('📅 Calendar home response:', propfindData.substring(0, 1000))
          // Try multiple regex patterns to handle different XML formats
          const homeSetPatterns = [
            /<[^:]*:calendar-home-set[^>]*><[^:]*:href[^>]*>([^<]+)<\/[^:]*:href><\/[^:]*:calendar-home-set>/,
            /<calendar-home-set[^>]*><href[^>]*>([^<]+)<\/href><\/calendar-home-set>/,
            /calendar-home-set[^>]*>[\s\S]*?<href[^>]*>([^<]+)<\/href>/,
          ]
          
          let found = false
          for (const pattern of homeSetPatterns) {
            const homeSetMatch = propfindData.match(pattern)
            if (homeSetMatch && homeSetMatch[1]) {
              calendarHomeUrl = homeSetMatch[1].trim()
              // URL is already absolute, use it as is
              console.log('✅ Found calendar home URL:', calendarHomeUrl)
              found = true
              break
            }
          }
          
          if (!found) {
            console.warn('Could not find calendar-home-set in response')
            // Fallback: Try to construct calendar home URL from principal path
            // iCloud format: /269602925/principal/ -> /269602925/calendars/
            if (principalPath && principalPath.includes('/principal/')) {
              const calendarsPath = principalPath.replace('/principal/', '/calendars/')
              const urlObj = new URL(caldavUrl)
              calendarHomeUrl = `${urlObj.protocol}//${urlObj.host}${calendarsPath}`
              console.log('✅ Using fallback calendar home URL:', calendarHomeUrl)
            } else {
              console.warn('❌ Cannot construct calendar home URL - principal path not found')
            }
          }
        } else {
          console.warn('PROPFIND failed:', propfindResponse.status, propfindResponse.statusText)
          // Fallback: Try to construct calendar home URL from principal path
          if (principalPath && principalPath.includes('/principal/')) {
            const calendarsPath = principalPath.replace('/principal/', '/calendars/')
            const urlObj = new URL(caldavUrl)
            calendarHomeUrl = `${urlObj.protocol}//${urlObj.host}${calendarsPath}`
            console.log('✅ Using fallback calendar home URL (after PROPFIND failure):', calendarHomeUrl)
          } else {
            console.warn('❌ Cannot construct calendar home URL - principal path not found')
          }
        }
      } catch (error) {
        console.warn('Calendar home discovery failed, using default URL:', error)
      }
    }

    // List calendars to find the default one
    console.log('📅 Discovering calendar home URL:', calendarHomeUrl)
    let calendarUrl = calendarHomeUrl
    
    // Try to list calendars, but if it fails, use calendar home URL directly
    try {
      const listResponse = await fetch(calendarHomeUrl, {
        method: 'PROPFIND',
        headers: {
          'Content-Type': 'application/xml',
          'Depth': '1',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
      })

      if (listResponse.ok) {
        const listData = await listResponse.text()
        console.log('📅 Calendar list response (first 1000 chars):', listData.substring(0, 1000))
        // Parse XML to find calendar collections
        // Look for <resourcetype><collection/></resourcetype> with calendar namespace
        const calendarCollectionPattern = /<href[^>]*>([^<]+)<\/href>[\s\S]*?<resourcetype[^>]*>[\s\S]*?<[^:]*:collection[^>]*\/>[\s\S]*?<\/resourcetype>/g
        let match
        const foundCalendars: string[] = []
        
        // Also try simple href extraction for calendar paths
        const hrefRegex = /<href[^>]*>([^<]+)<\/href>/g
        while ((match = hrefRegex.exec(listData)) !== null) {
          const href = match[1].trim()
          // Decode URL-encoded characters
          const decodedHref = decodeURIComponent(href)
          
          // Look for calendar collections (not the home itself)
          // iCloud format: /269602925/calendars/XXXXX/
          if ((decodedHref.includes('/calendars/') || href.includes('/calendars/')) && 
              decodedHref !== calendarHomeUrl && 
              decodedHref !== calendarHomeUrl.replace(/\/$/, '') &&
              decodedHref !== calendarHomeUrl + '/' &&
              decodedHref !== calendarHomeUrl.replace(/\/$/, '') + '/' &&
              !decodedHref.endsWith('.ics')) { // Exclude individual event files
            let url = decodedHref
            if (url.startsWith('/')) {
              const urlObj = new URL(calendarHomeUrl)
              url = `${urlObj.protocol}//${urlObj.host}${url}`
            } else if (!url.startsWith('http')) {
              // Relative URL
              const urlObj = new URL(calendarHomeUrl)
              const basePath = urlObj.pathname.replace(/\/$/, '')
              url = `${urlObj.protocol}//${urlObj.host}${basePath}/${url}`
            }
            // Ensure URL ends with / for calendar collection
            if (!url.endsWith('/')) {
              url = url + '/'
            }
            foundCalendars.push(url)
          }
        }
        console.log('📅 Found calendars:', foundCalendars)
        
        // Filter out special calendars that don't accept events (inbox, notification, outbox)
        const specialCalendars = ['inbox', 'notification', 'outbox', 'tasks']
        const writableCalendars = foundCalendars.filter(cal => {
          const calLower = cal.toLowerCase()
          return !specialCalendars.some(special => calLower.includes(`/${special}/`) || calLower.endsWith(`/${special}`))
        })
        
        console.log('📅 Writable calendars (excluding special):', writableCalendars)
        
        if (writableCalendars.length > 0) {
          // Prefer calendars that look like user calendars (not system calendars)
          // Usually user calendars have longer paths or specific patterns
          const userCalendar = writableCalendars.find(cal => 
            !cal.includes('/inbox/') && 
            !cal.includes('/notification/') && 
            !cal.includes('/outbox/') &&
            cal !== calendarHomeUrl &&
            !cal.endsWith('/calendars/') // Exclude calendar home
          ) || writableCalendars[0]
          
          calendarUrl = userCalendar
          console.log('✅ Using calendar:', calendarUrl)
        } else if (foundCalendars.length > 0) {
          // If only special calendars found, try inbox (it might accept events)
          const inboxCalendar = foundCalendars.find(cal => cal.includes('/inbox/'))
          if (inboxCalendar) {
            console.warn('⚠️ Only special calendars found, trying inbox:', inboxCalendar)
            calendarUrl = inboxCalendar
          } else {
            console.warn('⚠️ Only special calendars found, trying first one:', foundCalendars[0])
            calendarUrl = foundCalendars[0]
          }
        } else {
          console.warn('⚠️ No individual calendars found, cannot add event - calendar home URL does not accept events')
          return { success: false, error: 'No writable calendar found. Please check your iCloud calendar settings.' }
        }
      } else {
        console.warn('⚠️ Failed to list calendars:', listResponse.status, listResponse.statusText)
        console.log('📅 Using calendar home URL directly:', calendarHomeUrl)
      }
    } catch (error) {
      console.warn('⚠️ Error listing calendars, using calendar home URL directly:', error)
      console.log('📅 Using calendar home URL directly:', calendarHomeUrl)
    }

    // Generate iCalendar content
    const icalContent = generateICalendar(
      params.title,
      params.start,
      params.end,
      params.location,
      params.description
    )

    // Generate unique event filename
    // iCloud CalDAV requires .ics extension and unique UID-based filename
    // Use UID from iCalendar content for filename consistency
    
    // Extract UID from iCalendar content
    const uidMatch = icalContent.match(/UID:([^\r\n]+)/)
    let uid = uidMatch ? uidMatch[1] : `${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Make UID URL-safe for filename (replace @ with - and remove other special chars)
    const safeUid = uid.replace(/@/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '-')
    
    // iCloud prefers UID-based filenames, but keep it simple
    const eventId = `${safeUid}.ics`
    
    // Ensure calendar URL ends with / for proper path construction
    const baseUrl = calendarUrl.endsWith('/') ? calendarUrl : `${calendarUrl}/`
    const eventUrl = `${baseUrl}${eventId}`
    
    console.log('📅 Generated UID:', uid)
    console.log('📅 Event filename:', eventId)

    // PUT request to add event
    console.log('📅 Adding event to calendar:', calendarUrl)
    console.log('📅 Event URL:', eventUrl)
    console.log('📅 iCalendar content length:', icalContent.length)
    console.log('📅 iCalendar content preview:', icalContent.substring(0, 200))
    
    // iCloud CalDAV requires specific headers and line endings
    // Ensure line endings are CRLF (iCalendar standard)
    const icalContentCRLF = icalContent.replace(/\r?\n/g, '\r\n')
    
    const putResponse = await fetch(eventUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Length': String(Buffer.byteLength(icalContentCRLF, 'utf8')),
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'If-None-Match': '*', // Required for iCloud CalDAV to create new resources
      },
      body: icalContentCRLF,
    })

    if (putResponse.ok || putResponse.status === 201) {
      console.log('✅ Apple Calendar event added successfully')
      return { success: true }
    } else {
      const errorText = await putResponse.text()
      console.error('❌ Failed to add Apple Calendar event:', putResponse.status, putResponse.statusText)
      console.error('❌ Error response (full):', errorText)
      console.error('❌ Event URL:', eventUrl)
      console.error('❌ Calendar URL:', calendarUrl)
      console.error('❌ iCalendar content length:', icalContentCRLF.length)
      console.error('❌ iCalendar content (first 500 chars):', icalContentCRLF.substring(0, 500))
      console.error('❌ iCalendar content (last 200 chars):', icalContentCRLF.substring(icalContentCRLF.length - 200))
      
      // Try to parse XML error response
      let errorDetails = 'No error details provided by server'
      if (errorText && errorText.trim() !== '') {
        // Try to extract error message from XML
        const errorMatch = errorText.match(/<D:error[^>]*>[\s\S]*?<D:message[^>]*>([^<]+)<\/D:message>/i) ||
                          errorText.match(/<error[^>]*>[\s\S]*?<message[^>]*>([^<]+)<\/message>/i) ||
                          errorText.match(/<[^:]*:error[^>]*>[\s\S]*?<[^:]*:message[^>]*>([^<]+)<\/[^:]*:message>/i)
        if (errorMatch && errorMatch[1]) {
          errorDetails = errorMatch[1].trim()
        } else {
          errorDetails = errorText.substring(0, 500)
        }
      }
      
      return { success: false, error: `Failed to add event: ${putResponse.status} ${putResponse.statusText}. ${errorDetails}` }
    }
  } catch (error) {
    console.error('❌ Error adding Apple Calendar event:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

