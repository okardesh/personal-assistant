import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'
  
  if (!clientId) {
    return NextResponse.json(
      { error: 'OUTLOOK_CLIENT_ID is not configured' },
      { status: 500 }
    )
  }
  
  // Try with user.read scope first, then add calendar permissions
  // This sometimes works better for unverified apps
  const scope = 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.Read offline_access'
  
  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_mode=query&` +
    `scope=${encodeURIComponent(scope)}&` +
    `prompt=consent`

  return NextResponse.redirect(authUrl)
}

