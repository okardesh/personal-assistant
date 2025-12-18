# Takvim Entegrasyonu Kurulumu

Bu kılavuz, Apple Calendar ve Outlook Calendar entegrasyonlarını nasıl kuracağınızı gösterir.

## Apple Calendar (iCloud) Kurulumu

Apple Calendar için CalDAV protokolü kullanılır. iCloud veya başka bir CalDAV sunucusu kullanabilirsiniz.

### 1. iCloud CalDAV Bilgilerini Alma

iCloud için CalDAV bilgileri:
- **Server URL**: `https://caldav.icloud.com`
- **Kullanıcı adı**: iCloud email adresiniz (örn: `yourname@icloud.com`)
- **Şifre**: App-specific password (güvenlik için önerilir)

### 2. App-Specific Password Oluşturma

1. [Apple ID](https://appleid.apple.com/) sayfasına gidin
2. **Sign-In and Security** > **App-Specific Passwords** bölümüne gidin
3. **Generate an app-specific password** butonuna tıklayın
4. "Personal Assistant" gibi bir isim verin
5. Oluşturulan şifreyi kopyalayın (bir daha gösterilmeyecek!)

### 3. Environment Variables Ayarlama

`.env.local` dosyasına ekleyin:

```env
# Apple Calendar (iCloud CalDAV)
APPLE_CALENDAR_URL=https://caldav.icloud.com
APPLE_CALENDAR_USERNAME=yourname@icloud.com
APPLE_CALENDAR_PASSWORD=your-app-specific-password

# Veya genel CalDAV sunucusu için:
# CALDAV_URL=https://caldav.example.com
# CALDAV_USERNAME=your-username
# CALDAV_PASSWORD=your-password
```

**Not**: App-specific password kullanmanız şiddetle önerilir. Ana Apple ID şifrenizi kullanmayın.

## Outlook Calendar Kurulumu

Outlook Calendar için Microsoft Graph API kullanılır. OAuth 2.0 authentication gereklidir.

### 1. Azure Portal'da Uygulama Kaydı

1. [Azure Portal](https://portal.azure.com) adresine gidin
2. **Azure Active Directory** > **App registrations** bölümüne gidin
3. **New registration** butonuna tıklayın
4. Uygulama bilgilerini girin:
   - **Name**: Personal Assistant
   - **Supported account types**: **"Accounts in any organizational directory and personal Microsoft accounts"** seçin (admin onayı gerektirmez)
   - **Redirect URI**: `http://localhost:3000/api/auth/microsoft/callback` (development için)
5. **Register** butonuna tıklayın

**Önemli**: Eğer "Single tenant" seçtiyseniz ve "Need admin approval" hatası alıyorsanız:
- Uygulamanızı açın → **Authentication** → **Supported account types** bölümünü düzenleyin
- **"Accounts in any organizational directory and personal Microsoft accounts"** seçeneğini seçin
- **Save** butonuna tıklayın

### 2. API İzinleri Ekleme

1. Kayıtlı uygulamanızı açın
2. **API permissions** bölümüne gidin
3. **Add a permission** > **Microsoft Graph** > **Delegated permissions** seçin
4. Şu izinleri ekleyin:
   - `Calendars.Read`
   - `offline_access` (refresh token için)
5. **Add permissions** butonuna tıklayın
6. **Grant admin consent** butonuna tıklayın (gerekirse)

### 3. Client Secret Oluşturma

1. **Certificates & secrets** bölümüne gidin
2. **New client secret** butonuna tıklayın
3. Açıklama ekleyin ve süre seçin
4. **Add** butonuna tıklayın
5. **Value** değerini kopyalayın (bir daha gösterilmeyecek!)

### 4. OAuth Flow İmplementasyonu

OAuth flow'u implement etmek için bir auth endpoint oluşturmanız gerekir. Basit bir örnek:

**`app/api/auth/microsoft/route.ts`** (oluşturun):

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'
  
  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_mode=query&` +
    `scope=${encodeURIComponent('https://graph.microsoft.com/Calendars.Read offline_access')}`

  return NextResponse.redirect(authUrl)
}
```

**`app/api/auth/microsoft/callback/route.ts`** (oluşturun):

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'

  if (!code) {
    return NextResponse.json({ error: 'No authorization code' }, { status: 400 })
  }

  // Exchange code for tokens
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  const params = new URLSearchParams({
    client_id: clientId!,
    client_secret: clientSecret!,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: 'https://graph.microsoft.com/Calendars.Read offline_access',
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data = await response.json()
  
  // Store refresh_token securely (use a database in production)
  // For now, you can manually add it to .env.local
  return NextResponse.json({ 
    message: 'Authentication successful! Add this to .env.local:',
    refresh_token: data.refresh_token 
  })
}
```

### 5. İlk OAuth Akışı

1. Tarayıcıda şu adrese gidin:
   ```
   http://localhost:3000/api/auth/microsoft
   ```
2. Microsoft hesabınızla giriş yapın
3. İzinleri onaylayın
4. Callback sayfasında gösterilen `refresh_token` değerini kopyalayın

### 6. Environment Variables Ayarlama

`.env.local` dosyasına ekleyin:

```env
# Outlook Calendar (Microsoft Graph API)
OUTLOOK_CLIENT_ID=your-client-id-from-azure
OUTLOOK_CLIENT_SECRET=your-client-secret-from-azure
OUTLOOK_TENANT_ID=your-tenant-id-or-common
OUTLOOK_REFRESH_TOKEN=your-refresh-token-from-oauth-flow
```

**Not**: 
- `OUTLOOK_TENANT_ID`: Azure Portal'da uygulamanızın **Overview** sayfasında bulabilirsiniz. Veya `common` kullanabilirsiniz (herhangi bir Microsoft hesabı için).
- `OUTLOOK_REFRESH_TOKEN`: OAuth flow'dan aldığınız refresh token. Bu token süresiz değildir, yenilenmesi gerekebilir.

## Test Etme

1. Development server'ı yeniden başlatın:
   ```bash
   npm run dev
   ```

2. Tarayıcıda http://localhost:3000 adresine gidin

3. Şu komutları deneyin:
   - "Bugün takvimimde ne var?"
   - "Yarın hangi toplantılarım var?"
   - "Bu hafta takvimimde ne var?"

## Sorun Giderme

### Apple Calendar

**"CalDAV request failed" hatası:**
- App-specific password kullandığınızdan emin olun
- iCloud CalDAV URL'inin doğru olduğundan emin olun
- Kullanıcı adının tam email adresi olduğundan emin olun

**"No events found" ama takvimde etkinlik var:**
- Tarih aralığını kontrol edin
- CalDAV sunucusunun doğru yapılandırıldığından emin olun

### Outlook Calendar

**"Outlook authentication failed" hatası:**
- Refresh token'ın geçerli olduğundan emin olun
- Client ID ve Client Secret'ın doğru olduğundan emin olun
- OAuth flow'u tekrar çalıştırın

**"Microsoft Graph API request failed" hatası:**
- API izinlerinin verildiğinden emin olun
- Admin consent'in verildiğinden emin olun
- Tenant ID'nin doğru olduğundan emin olun

## Güvenlik Notları

- **Asla** API key'lerinizi veya şifrelerinizi public repository'lere commit etmeyin
- `.env.local` dosyası `.gitignore`'da olduğundan emin olun
- Production'da refresh token'ları güvenli bir veritabanında saklayın
- App-specific password'ları düzenli olarak yenileyin

