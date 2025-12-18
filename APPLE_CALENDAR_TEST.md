# Apple Calendar Test Kılavuzu

## Mevcut Durum

Apple Calendar entegrasyonu hazır. Şu bilgiler kullanılıyor:
- URL: `https://caldav.icloud.com`
- Username: `okardes@me.com`
- Password: App-specific password

## Test

1. **Tarayıcıda uygulamayı açın:**
   ```
   http://localhost:3000
   ```

2. **Şu komutları deneyin:**
   - "Bugün takvimimde ne var?"
   - "Yarın hangi etkinliklerim var?"
   - "Bu hafta takvimimde ne var?"

## Sorun Giderme

### Eğer "You don't have any events" görüyorsanız:

**Olası Nedenler:**
1. Bugün gerçekten etkinlik yok (normal)
2. CalDAV URL formatı yanlış olabilir
3. App-specific password yanlış olabilir

**Çözüm:**
1. Apple Calendar uygulamanızda bugün etkinlik olduğundan emin olun
2. App-specific password'u kontrol edin
3. CalDAV URL'i test edin

### CalDAV URL Sorunu

Eğer `https://caldav.icloud.com` çalışmıyorsa, webcal URL'inizden çıkardığımız `p101-caldav.icloud.com` sunucusunu deneyebiliriz:

`.env.local` dosyasında:
```env
APPLE_CALENDAR_URL=https://p101-caldav.icloud.com
```

**Not**: iCloud CalDAV için genellikle `https://caldav.icloud.com` çalışır, ama bazen kullanıcıya özel sunucular olabilir.

## Debug

Eğer sorun devam ederse, server console'da (terminal'de) hata mesajlarını kontrol edin:
- CalDAV request failed mesajları
- Authentication hataları
- XML parsing hataları

Bu hatalar bize sorunun ne olduğunu gösterecek.

