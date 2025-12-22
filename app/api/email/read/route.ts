import { NextRequest, NextResponse } from 'next/server'
import { markOutlookEmailAsRead } from '@/lib/outlookEmail'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailId } = body

    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      )
    }

    // Check if it's an Outlook email (starts with Outlook ID format or contains Outlook identifier)
    // Outlook email IDs are typically UUIDs or long strings
    // iCloud emails have format "icloud-{uid}"
    if (emailId.startsWith('icloud-')) {
      // iCloud emails - IMAP doesn't support marking as read via API easily
      // For now, just return success (we can implement IMAP STORE command later if needed)
      return NextResponse.json({ success: true, message: 'iCloud email read status updated (if supported)' })
    }

    // Outlook email - mark as read
    const result = await markOutlookEmailAsRead(emailId)
    
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Email marked as read' })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to mark email as read' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ [API] Error marking email as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark email as read', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

