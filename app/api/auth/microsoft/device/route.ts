import { NextRequest, NextResponse } from 'next/server'

// Device Code Flow - Admin consent gerektirmeyebilir
export async function GET(request: NextRequest) {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'

  if (!clientId) {
    return NextResponse.json(
      { error: 'OUTLOOK_CLIENT_ID is not configured' },
      { status: 500 }
    )
  }

  try {
    // Step 1: Get device code
    const deviceCodeUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'https://graph.microsoft.com/Calendars.Read offline_access',
    })

    const response = await fetch(deviceCodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: 'Failed to get device code', details: error },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      user_code: data.user_code,
      device_code: data.device_code,
      verification_uri: data.verification_uri,
      message: data.message,
      expires_in: data.expires_in,
      interval: data.interval,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Device code flow failed', details: error.message },
      { status: 500 }
    )
  }
}

