# Admin Consent Sorunu Çözümü

Multitenant seçeneğini seçtiyseniz ama hala "Admin consent required" hatası alıyorsanız, şu adımları izleyin:

## Çözüm: API Permissions'da Admin Consent Verin

### Adım 1: Azure Portal'da API Permissions'a Gidin

1. [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations**
2. **Personal Assistant** uygulamanızı açın
3. Sol menüden **API permissions** bölümüne gidin

### Adım 2: Admin Consent Verin

1. **API permissions** sayfasında, eklediğiniz izinleri göreceksiniz:
   - `Calendars.Read` (Microsoft Graph)
   - `offline_access` (Microsoft Graph)

2. **Grant admin consent for [Your Organization Name]** butonuna tıklayın
   - Bu buton sayfanın üst kısmında mavi bir buton olarak görünür
   - Tıklayınca bir onay penceresi açılır

3. **Yes** butonuna tıklayarak onaylayın

4. İzinlerin durumu **"Granted for [Your Organization]"** olarak değişmeli
   - Yeşil bir onay işareti görünecek

### Adım 3: Tenant ID'yi "common" Olarak Ayarlayın

Multitenant için tenant ID'yi "common" olarak ayarlayın:

`.env.local` dosyasında:
```env
OUTLOOK_TENANT_ID=common
```

**Not**: Eğer specific tenant ID kullanıyorsanız, bunu "common" olarak değiştirin.

### Adım 4: OAuth Flow'u Tekrar Deneyin

1. Development server'ın çalıştığından emin olun:
   ```bash
   npm run dev
   ```

2. Tarayıcıda şu adrese gidin:
   ```
   http://localhost:3000/api/auth/microsoft
   ```

3. Artık admin consent hatası almamalısınız

## Alternatif Çözüm: Redirect URI Kontrolü

Eğer hala sorun yaşıyorsanız, Redirect URI'ların doğru olduğundan emin olun:

1. Azure Portal → **Authentication** bölümüne gidin
2. **Redirect URIs** sekmesine gidin
3. Şu URI'nin eklendiğinden emin olun:
   ```
   http://localhost:3000/api/auth/microsoft/callback
   ```
4. Eğer yoksa, **Add URI** butonuna tıklayıp ekleyin
5. **Save** butonuna tıklayın

## Hala Sorun Varsa

Eğer hala "Admin consent required" hatası alıyorsanız:

1. **API permissions** sayfasında tüm izinlerin **"Granted"** durumunda olduğundan emin olun
2. **Authentication** sayfasında **"Allow public client flows"** toggle'ını **Enabled** yapın (gerekirse)
3. OAuth flow'u tekrar deneyin

## Test

Admin consent verdikten sonra, OAuth flow'u başarıyla tamamlanmalı ve refresh token alabilmelisiniz.

