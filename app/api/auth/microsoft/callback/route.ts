import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')
  
  if (error) {
    return NextResponse.json(
      { error: `Authentication failed: ${error}` },
      { status: 400 }
    )
  }

  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code received' },
      { status: 400 }
    )
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Outlook credentials not configured' },
      { status: 500 }
    )
  }

  try {
    // Exchange code for tokens
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Mail.Read offline_access',
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for tokens' },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    // Return the refresh token - user should add it to .env.local
    return NextResponse.json({ 
      success: true,
      message: 'Authentication successful! Please add the following to your .env.local file:',
      refresh_token: data.refresh_token,
      instructions: 'Add this line to .env.local: OUTLOOK_REFRESH_TOKEN=' + data.refresh_token
    })
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return NextResponse.json(
      { error: `Authentication error: ${error.message}` },
      { status: 500 }
    )
  }
}

