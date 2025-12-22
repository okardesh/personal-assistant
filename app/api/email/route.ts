import { NextRequest, NextResponse } from 'next/server'
import { fetchICloudEmails } from '@/lib/icloudEmail'
import { fetchOutlookEmails } from '@/lib/outlookEmail'

interface Email {
  id: string
  subject: string
  from: string
  date: string
  snippet?: string
}

async function fetchEmails(options: { unread?: boolean; limit?: number }): Promise<Email[]> {
  console.log('📧 [API] fetchEmails called', { options })
  
  let iCloudEmails: Email[] = []
  let outlookEmails: Email[] = []
  
  // Fetch from both sources
  try {
    console.log('📧 [API] Calling fetchICloudEmails')
    iCloudEmails = await fetchICloudEmails(options)
    console.log('📧 [API] fetchICloudEmails result', { count: iCloudEmails.length })
  } catch (error) {
    console.error('📧 [API] Error fetching iCloud emails', { error: error instanceof Error ? error.message : 'Unknown', stack: error instanceof Error ? error.stack : undefined })
  }
  
  try {
    console.log('📧 [API] Calling fetchOutlookEmails')
    outlookEmails = await fetchOutlookEmails(options)
    console.log('📧 [API] fetchOutlookEmails result', { count: outlookEmails.length })
  } catch (error) {
    console.error('📧 [API] Error fetching Outlook emails', { error: error instanceof Error ? error.message : 'Unknown', stack: error instanceof Error ? error.stack : undefined })
  }
  
  // Combine and sort by date (newest first)
  const allEmails = [...iCloudEmails, ...outlookEmails].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
  
  // Apply limit after combining
  const limitedEmails = allEmails.slice(0, options.limit || 10)
  
  console.log('📧 [API] Combined emails:', { 
    iCloud: iCloudEmails.length, 
    outlook: outlookEmails.length, 
    total: allEmails.length,
    limited: limitedEmails.length 
  })
  
  return limitedEmails
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('📧 [API] GET /api/email called')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const unread = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('📧 [API] Request params', { unread, limit })

    // Add timeout to prevent infinite loops
    const emailPromise = fetchEmails({ unread, limit })
    const timeoutPromise = new Promise<[]>((resolve) => {
      setTimeout(() => {
        console.error('📧 [API] Email API timeout - returning empty array')
        resolve([])
      }, 15000) // 15 seconds total timeout
    })

    const emails = await Promise.race([emailPromise, timeoutPromise])
    const duration = Date.now() - startTime
    
    console.log('📧 [API] Request completed', { duration: `${duration}ms`, count: emails.length })
    return NextResponse.json({ emails })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('📧 [API] Email API error', { 
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Failed to fetch emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

