# Deployment Guide - Personal Assistant

Bu uygulamayı production'a deploy etmek için adımlar.

## Vercel'e Deploy (Önerilen - En Kolay)

Vercel, Next.js uygulamaları için en iyi seçenektir ve ücretsiz planı vardır.

### Adımlar:

1. **Vercel Hesabı Oluştur**
   - https://vercel.com adresine git
   - GitHub hesabınla giriş yap

2. **Projeyi Import Et**
   - Vercel dashboard'da "Add New Project" tıkla
   - GitHub repository'ni seç: `okardesh/personal-assistant`
   - "Import" tıkla

3. **Environment Variables Ekle**
   - Project Settings > Environment Variables bölümüne git
   - Aşağıdaki environment variables'ları ekle:

   ```
   # Required - OpenAI API (Zorunlu)
   OPENAI_API_KEY=your-openai-api-key-here
   OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
   
   # Base URL (Zorunlu - Deploy sonrası otomatik URL'i kullanın)
   NEXT_PUBLIC_BASE_URL=https://your-project.vercel.app
   
   # Calendar Integration (Opsiyonel)
   APPLE_CALENDAR_USERNAME=your-apple-email@me.com
   APPLE_CALENDAR_PASSWORD=your-app-specific-password
   APPLE_CALENDAR_URL=https://caldav.icloud.com
   
   OUTLOOK_CLIENT_ID=your-outlook-client-id
   OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
   OUTLOOK_TENANT_ID=your-outlook-tenant-id
   
   # Google Services (Opsiyonel)
   GOOGLE_CUSTOM_SEARCH_API_KEY=your-google-api-key
   GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   
   # Weather (Opsiyonel)
   OPENWEATHER_API_KEY=your-openweather-api-key
   
   # Email Integration (Opsiyonel)
   ICLOUD_IMAP_HOST=imap.mail.me.com
   ICLOUD_IMAP_PORT=993
   ICLOUD_EMAIL_USERNAME=your-icloud-email@me.com
   ICLOUD_EMAIL_PASSWORD=your-app-specific-password
   
   # Spotify Integration (Opsiyonel)
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   SPOTIFY_REDIRECT_URI=https://your-domain.com/api/spotify/callback
   
   # Geocoding (Opsiyonel)
   GEOCODING_API_KEY=your-geocoding-api-key
   ```
   
   **Önemli Notlar:**
   - `NEXT_PUBLIC_BASE_URL` değişkenini deploy sonrası Vercel'in verdiği URL ile güncelleyin
   - Spotify redirect URI'yi de domain'inize göre güncelleyin
   - Sadece kullanacağınız servisler için environment variables ekleyin

4. **Deploy**
   - "Deploy" butonuna tıkla
   - Birkaç dakika içinde uygulaman hazır olacak!

5. **Custom Domain (Opsiyonel)**
   - Settings > Domains bölümünden kendi domain'ini ekleyebilirsin
   - Domain ekledikten sonra `NEXT_PUBLIC_BASE_URL` environment variable'ını güncellemeyi unutma

6. **Alexa Entegrasyonu için Endpoint URL'ini Not Al**
   - Deploy sonrası Alexa endpoint URL'iniz: `https://your-domain.com/api/alexa`
   - Bu URL'yi Alexa Developer Console'da kullanacaksınız
   - Detaylı kurulum için [SETUP_ALEXA.md](./SETUP_ALEXA.md) dosyasına bakın

### Vercel CLI ile Deploy (Alternatif)

```bash
# Vercel CLI'yi yükle
npm i -g vercel

# Projeye git
cd personal-assistant

# Deploy et
vercel

# Production'a deploy et
vercel --prod
```

## Diğer Deployment Seçenekleri

### Railway

1. https://railway.app adresine git
2. GitHub ile giriş yap
3. "New Project" > "Deploy from GitHub repo"
4. Repository'ni seç
5. Environment variables'ları ekle
6. Deploy!

### Render

1. https://render.com adresine git
2. "New Web Service" seç
3. GitHub repository'ni bağla
4. Environment variables'ları ekle
5. Deploy!

### Netlify

1. https://netlify.com adresine git
2. "Add new site" > "Import an existing project"
3. GitHub repository'ni seç
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Environment variables'ları ekle
6. Deploy!

## Önemli Notlar

1. **Environment Variables**: Tüm API key'lerini ve şifreleri environment variables olarak eklemelisin. `.env.local` dosyası production'da kullanılmaz.

2. **HTTPS**: Vercel, Railway, Render gibi platformlar otomatik HTTPS sağlar. Alexa entegrasyonu için HTTPS zorunludur.

3. **Mikrofon İzni**: Production'da mikrofon izni için HTTPS gerekir. Vercel otomatik sağlar.

4. **API Routes**: Next.js API routes'ları Vercel'de serverless functions olarak çalışır. Alexa endpoint'i (`/api/alexa`) otomatik olarak serverless function olarak deploy edilir.

5. **Alexa Endpoint**: Alexa entegrasyonu için endpoint URL'iniz: `https://your-domain.com/api/alexa`. Bu URL'nin her zaman erişilebilir olması gerekir.

6. **SSL Sertifikası**: Vercel otomatik SSL sertifikası sağlar. Alexa Developer Console'da SSL ayarlarında "My development endpoint is a sub-domain of a domain that has a wildcard certificate" seçeneğini kullanın.

7. **Database (Gelecekte)**: Eğer database eklemek istersen, Vercel Postgres, Supabase, veya PlanetScale kullanabilirsin.

## Troubleshooting

### Build Hatası
- `npm run build` komutunu local'de çalıştır ve hataları kontrol et
- Environment variables'ların doğru eklendiğinden emin ol

### API Hatası
- API routes'ların doğru çalıştığından emin ol
- Environment variables'ların production'da mevcut olduğundan emin ol

### Mikrofon Çalışmıyor
- HTTPS kullanıldığından emin ol (HTTP'de mikrofon çalışmaz)
- Browser console'da hataları kontrol et

## Production Checklist

- [ ] Tüm environment variables eklendi
- [ ] `NEXT_PUBLIC_BASE_URL` doğru URL ile ayarlandı
- [ ] Build başarılı (`npm run build`)
- [ ] API routes test edildi (`/api/assistant`, `/api/alexa`, vb.)
- [ ] Mikrofon izni test edildi
- [ ] Custom domain eklendi (opsiyonel)
- [ ] Alexa endpoint test edildi (`https://your-domain.com/api/alexa`)
- [ ] Alexa Developer Console'da skill yapılandırıldı
- [ ] Analytics eklendi (opsiyonel)

## Alexa Entegrasyonu için Vercel Deployment

Alexa entegrasyonu için özel adımlar:

1. **Deploy Sonrası Endpoint URL'ini Al**
   ```bash
   # Deploy sonrası Vercel size bir URL verecek:
   # Örnek: https://personal-assistant-xyz.vercel.app
   # Alexa endpoint: https://personal-assistant-xyz.vercel.app/api/alexa
   ```

2. **Environment Variable Güncelle**
   - Vercel Dashboard > Project Settings > Environment Variables
   - `NEXT_PUBLIC_BASE_URL` değişkenini deploy URL'iniz ile güncelleyin
   - Eğer custom domain kullanıyorsanız, o domain'i kullanın

3. **Alexa Developer Console'da Endpoint Ayarla**
   - Endpoint URL: `https://your-domain.com/api/alexa`
   - SSL Certificate Type: "My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"
   - Bu seçenek Vercel'in otomatik SSL sertifikası ile uyumludur

4. **Test Et**
   - Alexa Developer Console > Test sekmesinde test edin
   - Endpoint'in çalıştığını doğrulayın: `curl https://your-domain.com/api/alexa`

Detaylı kurulum için [SETUP_ALEXA.md](./SETUP_ALEXA.md) dosyasına bakın.

