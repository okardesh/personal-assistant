# Vercel Deployment - Hızlı Başlangıç Rehberi

Bu rehber, Personal Assistant uygulamanızı Vercel'e deploy etmek için gereken tüm bilgileri içerir.

## Hızlı Deploy (5 Dakika)

### 1. Vercel Hesabı Oluştur
- https://vercel.com adresine git
- GitHub hesabınla giriş yap (ücretsiz)

### 2. Projeyi Deploy Et
- Vercel Dashboard > "Add New Project"
- GitHub repository'ni seç: `okardesh/personal-assistant`
- Framework Preset: **Next.js** (otomatik algılanır)
- Root Directory: `.` (boş bırak)
- "Deploy" butonuna tıkla

### 3. Environment Variables Ekle

Deploy tamamlandıktan sonra:

1. Project Settings > Environment Variables
2. Aşağıdaki değişkenleri ekle:

#### Zorunlu Değişkenler

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
NEXT_PUBLIC_BASE_URL=https://your-project.vercel.app
```

**Not**: `NEXT_PUBLIC_BASE_URL` değerini deploy sonrası Vercel'in verdiği URL ile değiştirin.

#### Opsiyonel Değişkenler (Kullandığınız servislere göre)

```env
# Calendar
APPLE_CALENDAR_URL=https://caldav.icloud.com
APPLE_CALENDAR_USERNAME=your-apple-email@me.com
APPLE_CALENDAR_PASSWORD=your-app-specific-password

OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
OUTLOOK_TENANT_ID=your-outlook-tenant-id

# Google Services
GOOGLE_CUSTOM_SEARCH_API_KEY=your-google-api-key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Weather
OPENWEATHER_API_KEY=your-openweather-api-key

# Email
ICLOUD_IMAP_HOST=imap.mail.me.com
ICLOUD_IMAP_PORT=993
ICLOUD_EMAIL_USERNAME=your-icloud-email@me.com
ICLOUD_EMAIL_PASSWORD=your-app-specific-password

# Spotify
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/spotify/callback

# Geocoding
GEOCODING_API_KEY=your-geocoding-api-key

# OpenAI Model (Opsiyonel)
OPENAI_MODEL=gpt-4o-mini
```

### 4. Redeploy

Environment variables ekledikten sonra:
- Deployments sekmesine git
- Son deployment'ın yanındaki "..." menüsünden "Redeploy" seç
- "Use existing Build Cache" seçeneğini işaretle
- "Redeploy" butonuna tıkla

## Alexa Entegrasyonu için Özel Adımlar

### 1. Endpoint URL'ini Not Al

Deploy sonrası Alexa endpoint URL'iniz:
```
https://your-project.vercel.app/api/alexa
```

### 2. Environment Variable Güncelle

`NEXT_PUBLIC_BASE_URL` değişkenini deploy URL'iniz ile güncelleyin:
```
NEXT_PUBLIC_BASE_URL=https://your-project.vercel.app
```

### 3. Custom Domain (Opsiyonel ama Önerilen)

1. Settings > Domains
2. Kendi domain'inizi ekleyin (ör. `wiseass.ai`)
3. DNS ayarlarını yapın (Vercel size talimatları verir)
4. Domain aktif olduktan sonra `NEXT_PUBLIC_BASE_URL` değişkenini güncelleyin:
   ```
   NEXT_PUBLIC_BASE_URL=https://wiseass.ai
   ```

### 4. Alexa Developer Console'da Endpoint Ayarla

1. [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) > Skill'iniz
2. Endpoint sekmesine git
3. Endpoint URL: `https://your-domain.com/api/alexa`
4. SSL Certificate Type: **"My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"** seç
5. "Save Endpoints" butonuna tıkla

### 5. Test Et

```bash
# Endpoint'in çalıştığını test et
curl https://your-domain.com/api/alexa

# Beklenen yanıt:
# {"status":"ok","message":"Alexa Skills Kit endpoint is running",...}
```

## Vercel CLI ile Deploy (Alternatif)

```bash
# Vercel CLI'yi yükle
npm i -g vercel

# Projeye git
cd personal-assistant

# İlk deploy
vercel

# Environment variables ekle (interaktif)
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_BASE_URL
# ... diğer değişkenler

# Production'a deploy et
vercel --prod
```

## Build Ayarları

Vercel otomatik olarak Next.js projelerini algılar. Manuel ayar gerekmez, ancak özelleştirmek isterseniz:

**Build Command**: `npm run build` (otomatik)
**Output Directory**: `.next` (otomatik)
**Install Command**: `npm install` (otomatik)

## Environment Variables Yönetimi

### Production, Preview, Development

Vercel'de environment variables'ları farklı ortamlar için ayarlayabilirsiniz:

- **Production**: Production deployment'lar için
- **Preview**: Pull request preview'lar için
- **Development**: Local development için (Vercel CLI)

### Önerilen Yapılandırma

```env
# Production için
NEXT_PUBLIC_BASE_URL=https://wiseass.ai

# Preview için (otomatik preview URL)
NEXT_PUBLIC_BASE_URL=https://personal-assistant-git-branch.vercel.app
```

## Sorun Giderme

### Build Hatası

```bash
# Local'de test et
npm run build

# Hataları kontrol et ve düzelt
```

### API Endpoint Çalışmıyor

1. Vercel Dashboard > Deployments > Son deployment'ın loglarını kontrol et
2. Function logs'u kontrol et
3. Environment variables'ların doğru eklendiğinden emin ol

### Alexa Endpoint Hatası

1. Endpoint URL'inin doğru olduğundan emin ol: `https://your-domain.com/api/alexa`
2. SSL sertifikasının geçerli olduğundan emin ol (Vercel otomatik sağlar)
3. Endpoint'in GET isteğine yanıt verdiğini test edin:
   ```bash
   curl https://your-domain.com/api/alexa
   ```

### Environment Variables Güncellenmiyor

1. Environment variables ekledikten sonra **mutlaka redeploy yapın**
2. Vercel cache'i temizlemek için: Deployments > "..." > "Redeploy" (cache'i kullanmadan)

## Vercel Özellikleri

### Otomatik HTTPS
- Vercel tüm domain'ler için otomatik SSL sertifikası sağlar
- Alexa entegrasyonu için mükemmel

### Serverless Functions
- Tüm API routes otomatik olarak serverless functions olarak çalışır
- `/api/alexa` endpoint'i otomatik olarak serverless function olur

### Edge Network
- Vercel'in global edge network'ü sayesinde düşük latency
- Alexa istekleri hızlı yanıt alır

### Automatic Deployments
- GitHub'a push yaptığınızda otomatik deploy
- Pull request'ler için otomatik preview deployment'lar

## Maliyet

Vercel'in ücretsiz planı:
- ✅ Sınırsız bandwidth
- ✅ Sınırsız deployment
- ✅ 100GB bandwidth/ay
- ✅ Serverless functions (100GB-hours/ay)
- ✅ Otomatik HTTPS
- ✅ Custom domain desteği

**Kişisel kullanım için yeterli!**

## Sonraki Adımlar

1. ✅ Deploy tamamlandı
2. ✅ Environment variables eklendi
3. ✅ Endpoint test edildi
4. 📱 [Alexa Skill kurulumu](./SETUP_ALEXA.md) yap
5. 🎉 Alexa cihazınızdan kullanmaya başla!

## Yardım

- [Vercel Dokümantasyonu](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Alexa Setup Guide](./SETUP_ALEXA.md)

