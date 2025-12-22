// Outlook Email integration using Microsoft Graph API

interface Email {
  id: string
  subject: string
  from: string
  date: string
  snippet?: string
}

async function getMicrosoftAccessToken(): Promise<string | null> {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'
  const refreshToken = process.env.OUTLOOK_REFRESH_TOKEN

  if (!clientId || !clientSecret) {
    console.warn('📧 [Outlook Email] Outlook credentials not configured')
    return null
  }

  try {
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
        const data = await response.json()
        console.log('✅ [Outlook Email] Token refreshed successfully')
        return data.access_token
      } else {
        const errorText = await response.text()
        console.error('❌ [Outlook Email] Token refresh failed:', response.status, response.statusText, errorText)
        return null
      }
    }

    console.warn('📧 [Outlook Email] OAuth token required. Please provide refresh token.')
    return null
  } catch (error) {
    console.error('❌ [Outlook Email] Error getting Microsoft access token:', error)
    return null
  }
}

export async function fetchOutlookEmails(options: { unread?: boolean; limit?: number } = {}): Promise<Email[]> {
  console.log('📧 [Outlook Email] Starting to fetch emails', { options })
  const accessToken = await getMicrosoftAccessToken()

  if (!accessToken) {
    console.warn('⚠️ [Outlook Email] No access token available, returning empty array')
    return []
  }

  try {
    // Build Microsoft Graph API query
    let graphUrl = 'https://graph.microsoft.com/v1.0/me/messages?$top=' + (options.limit || 10)
    
    // Add filter for unread emails if requested
    if (options.unread) {
      graphUrl += '&$filter=isRead eq false'
    }
    
    // Order by received date (newest first)
    graphUrl += '&$orderby=receivedDateTime desc'
    
    // Select only needed fields
    graphUrl += '&$select=id,subject,from,receivedDateTime,bodyPreview,body'

    console.log('📧 [Outlook Email] Fetching from Graph API:', graphUrl)

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
        console.error('❌ [Outlook Email] Authentication failed. Token may be expired. Status:', response.status, 'Error:', errorText)
      } else {
        console.error('❌ [Outlook Email] Microsoft Graph API request failed. Status:', response.status, response.statusText, 'Error:', errorText)
      }
      return []
    }

    const data = await response.json()
    console.log('📧 [Outlook Email] Graph API response received, emails count:', data.value?.length || 0)
    
    const emails: Email[] = []

    for (const item of data.value || []) {
      // Parse received date
      const receivedDate = new Date(item.receivedDateTime)
      
      // Get sender email address
      const fromEmail = item.from?.emailAddress?.address || item.from?.emailAddress?.name || 'Unknown'
      const fromName = item.from?.emailAddress?.name || fromEmail
      const from = fromName !== fromEmail ? `${fromName} <${fromEmail}>` : fromEmail
      
      // Get body preview or content
      const snippet = item.bodyPreview || item.body?.content || ''
      
      emails.push({
        id: item.id,
        subject: item.subject || '(No Subject)',
        from: from,
        date: receivedDate.toISOString(),
        snippet: snippet.substring(0, 1000), // Limit snippet length
      })
    }

    console.log('📧 [Outlook Email] Parsed emails:', emails.length)
    console.log('📧 [Outlook Email] Email subjects:', emails.map(e => e.subject))
    return emails
  } catch (error) {
    console.error('❌ [Outlook Email] Error fetching Outlook emails:', error)
    if (error instanceof Error) {
      console.error('❌ [Outlook Email] Error message:', error.message)
      console.error('❌ [Outlook Email] Error stack:', error.stack)
    }
    return []
  }
}

export async function markOutlookEmailAsRead(emailId: string): Promise<{ success: boolean; error?: string }> {
  console.log('📧 [Outlook Email] Marking email as read:', emailId)
  const accessToken = await getMicrosoftAccessToken()

  if (!accessToken) {
    return { success: false, error: 'Outlook authentication failed. Please authenticate first.' }
  }

  try {
    // Microsoft Graph API endpoint for marking email as read
    const graphUrl = `https://graph.microsoft.com/v1.0/me/messages/${emailId}`
    
    const response = await fetch(graphUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isRead: true
      }),
    })

    if (response.ok) {
      console.log('✅ [Outlook Email] Email marked as read successfully')
      return { success: true }
    } else {
      const errorText = await response.text()
      console.error('❌ [Outlook Email] Failed to mark email as read:', response.status, response.statusText, errorText)
      return { success: false, error: `Failed to mark email as read: ${response.status} ${response.statusText}` }
    }
  } catch (error) {
    console.error('❌ [Outlook Email] Error marking email as read:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

