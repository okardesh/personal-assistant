# Spotify & Apple Music Integration Guide

## Spotify Integration

### Requirements:
1. **Spotify Developer Account** (free)
2. **Spotify Premium Account** (Web Playback SDK için gerekli)
3. **OAuth 2.0 Authentication**

### Steps:

1. **Spotify Developer Dashboard:**
   - https://developer.spotify.com/dashboard
   - "Create App" tıkla
   - App Name: "Personal Assistant"
   - Redirect URI: `https://your-domain.vercel.app/api/auth/spotify/callback`
   - Client ID ve Client Secret al

2. **Environment Variables:**
   ```
   SPOTIFY_CLIENT_ID=your-client-id
   SPOTIFY_CLIENT_SECRET=your-client-secret
   SPOTIFY_REDIRECT_URI=https://your-domain.vercel.app/api/auth/spotify/callback
   ```

3. **OAuth Flow:**
   - User Spotify'a login olur
   - Access token alınır
   - Token refresh mekanizması kurulur

4. **Web Playback SDK:**
   - Spotify Web Playback SDK kullanılır
   - Müzik çalma, pause, next, previous kontrolü

### Limitations:
- Sadece Spotify Premium kullanıcıları için çalışır
- Web Playback SDK sadece Chrome, Edge, Firefox'ta çalışır
- Safari'de çalışmaz

## Apple Music Integration

### Requirements:
1. **Apple Developer Account** ($99/yıl)
2. **Apple Music Subscription**
3. **MusicKit JS**

### Steps:

1. **Apple Developer Portal:**
   - https://developer.apple.com
   - MusicKit için app oluştur
   - Team ID ve Key ID al

2. **Environment Variables:**
   ```
   APPLE_MUSIC_TEAM_ID=your-team-id
   APPLE_MUSIC_KEY_ID=your-key-id
   APPLE_MUSIC_PRIVATE_KEY=your-private-key
   ```

3. **MusicKit JS:**
   - Apple'ın MusicKit JS kütüphanesi kullanılır
   - OAuth authentication gerekir
   - Müzik çalma kontrolü

### Limitations:
- Apple Developer Account gerekir ($99/yıl)
- Sadece Safari ve iOS Safari'de çalışır
- Chrome/Firefox'ta çalışmaz

## Alternative: YouTube Music / Web Audio

Daha basit alternatif:
- YouTube Music API (sınırlı)
- Web Audio API ile müzik stream etme
- Daha az kısıtlama, ama daha az kontrol

## Recommendation

**Spotify** daha kolay entegre edilebilir:
- Ücretsiz developer account
- Daha iyi dokümantasyon
- Daha geniş browser desteği (Chrome, Edge, Firefox)
- Web Playback SDK kolay kullanım

**Apple Music** daha zor:
- $99/yıl developer account gerekir
- Sadece Safari'de çalışır
- Daha karmaşık setup

## Implementation Priority

1. **Spotify** (önerilen)
2. **YouTube Music** (alternatif)
3. **Apple Music** (en zor)

