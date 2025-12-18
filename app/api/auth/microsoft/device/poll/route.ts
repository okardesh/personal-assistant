import { NextRequest, NextResponse } from 'next/server'

// Poll for token after user authorizes
export async function POST(request: NextRequest) {
  const { device_code } = await request.json()
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'

  if (!device_code || !clientId) {
    return NextResponse.json(
      { error: 'Device code and client ID are required' },
      { status: 400 }
    )
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    // Native uygulamalar için client_secret gerekmez
    const params = new URLSearchParams({
      client_id: clientId,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: device_code,
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        message: 'Add this to .env.local: OUTLOOK_REFRESH_TOKEN=' + data.refresh_token,
      })
    } else {
      // Still waiting for user authorization
      if (data.error === 'authorization_pending') {
        return NextResponse.json({
          success: false,
          pending: true,
          error: 'Waiting for user authorization...',
        })
      }
      
      return NextResponse.json({
        success: false,
        pending: false,
        error: data.error_description || data.error,
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Token polling failed', details: error.message },
      { status: 500 }
    )
  }
}

