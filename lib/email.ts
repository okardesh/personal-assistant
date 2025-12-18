interface Email {
  id: string
  subject: string
  from: string
  date: string
  snippet?: string
}

export async function getEmails(options: { unread?: boolean; limit?: number } = {}): Promise<Email[]> {
  console.log('📧 [getEmails] Called', { options })
  
  try {
    const params = new URLSearchParams()
    if (options.unread) params.append('unread', 'true')
    if (options.limit) params.append('limit', options.limit.toString())

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const url = `${baseUrl}/api/email?${params.toString()}`
    console.log('📧 [getEmails] Fetching from API', { url })

    // Add timeout to fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      console.error('📧 [getEmails] Fetch timeout')
    }, 10000) // 10 seconds timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId)
    })

    console.log('📧 [getEmails] API response', { status: response.status, ok: response.ok })

    if (!response.ok) {
      console.error('📧 [getEmails] Failed to fetch emails', { status: response.status })
      return []
    }

    const data = await response.json()
    console.log('📧 [getEmails] API result', { count: data.emails?.length || 0 })
    return data.emails || []
  } catch (error) {
    console.error('📧 [getEmails] Error', { error: error instanceof Error ? error.message : 'Unknown' })
    return []
  }
}

