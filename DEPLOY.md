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
   OPENAI_API_KEY=your-openai-api-key-here
   APPLE_CALENDAR_USERNAME=your-apple-email@me.com
   APPLE_CALENDAR_PASSWORD=your-app-specific-password
   APPLE_CALENDAR_URL=https://caldav.icloud.com
   
   OUTLOOK_CLIENT_ID=your-outlook-client-id
   OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
   OUTLOOK_TENANT_ID=your-outlook-tenant-id
   
   GOOGLE_CUSTOM_SEARCH_API_KEY=your-google-api-key
   GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id
   
   OPENWEATHER_API_KEY=your-openweather-api-key
   
   ICLOUD_IMAP_HOST=imap.mail.me.com
   ICLOUD_IMAP_PORT=993
   ICLOUD_EMAIL_USERNAME=your-icloud-email@me.com
   ICLOUD_EMAIL_PASSWORD=your-app-specific-password
   ```

4. **Deploy**
   - "Deploy" butonuna tıkla
   - Birkaç dakika içinde uygulaman hazır olacak!

5. **Custom Domain (Opsiyonel)**
   - Settings > Domains bölümünden kendi domain'ini ekleyebilirsin

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

2. **HTTPS**: Vercel, Railway, Render gibi platformlar otomatik HTTPS sağlar.

3. **Mikrofon İzni**: Production'da mikrofon izni için HTTPS gerekir. Vercel otomatik sağlar.

4. **API Routes**: Next.js API routes'ları Vercel'de serverless functions olarak çalışır.

5. **Database (Gelecekte)**: Eğer database eklemek istersen, Vercel Postgres, Supabase, veya PlanetScale kullanabilirsin.

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
- [ ] Build başarılı (`npm run build`)
- [ ] API routes test edildi
- [ ] Mikrofon izni test edildi
- [ ] Custom domain eklendi (opsiyonel)
- [ ] Analytics eklendi (opsiyonel)

