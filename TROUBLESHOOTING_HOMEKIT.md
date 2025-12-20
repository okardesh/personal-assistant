# HomeKit Entegrasyonu Sorun Giderme

## "Lambayı aç" Komutu Çalışmıyor

### 1. Environment Variables Kontrolü

**Vercel Dashboard'da kontrol edin:**

1. Vercel Dashboard > Project Settings > Environment Variables
2. Şu değişkenlerin olduğundan emin olun:
   ```
   HOME_ASSISTANT_URL=https://imhahdvrznzycpyimbbkqnbn6tcw0han.ui.nabu.casa
   HOME_ASSISTANT_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Eğer yoksa:**
- Environment Variables ekleyin
- **Mutlaka Redeploy yapın** (Deployments > "..." > "Redeploy")

### 2. Home Assistant Bağlantı Testi

**API endpoint'ini test edin:**

```bash
# Cihaz listesi
curl "https://www.wiseass.ai/api/homekit?action=list"

# Veya tarayıcıdan:
https://www.wiseass.ai/api/homekit?action=list
```

**Beklenen yanıt:**
```json
{
  "devices": [
    {
      "entity_id": "light.living_room",
      "state": "on",
      "attributes": {...}
    }
  ]
}
```

**Hata alıyorsanız:**
- `Home Assistant is not configured` → Environment variables eksik
- `401 Unauthorized` → Token yanlış veya süresi dolmuş
- `Connection refused` → Home Assistant URL yanlış

### 3. Home Assistant'da Kontrol

1. Home Assistant'a giriş yapın: https://imhahdvrznzycpyimbbkqnbn6tcw0han.ui.nabu.casa
2. **Developer Tools** > **States** bölümüne gidin
3. Cihazlarınızın göründüğünü kontrol edin
4. Entity ID'lerini not edin (örn: `light.living_room`)

### 4. OpenAI Function Calling Kontrolü

**Logları kontrol edin:**

Vercel Dashboard > Deployments > Son deployment > Function Logs

Arayın:
- `🔍 Searching for device: lamba`
- `✅ Found device: light.xxx`
- `Error controlling Home Assistant device`

### 5. Cihaz Adı Sorunu

OpenAI cihazı bulamıyorsa:

**Çözüm 1: Entity ID kullanın**
- "light.living_room'u aç" gibi spesifik komut verin

**Çözüm 2: Cihaz adını kontrol edin**
- Home Assistant'da cihazın `friendly_name` değerini kontrol edin
- Aynı ismi kullanın (örn: "Salon Lambası")

### 6. Hızlı Test

**Terminal'den test edin:**

```bash
# 1. Cihazları listele
curl "https://www.wiseass.ai/api/homekit?action=list"

# 2. Cihaz ara
curl "https://www.wiseass.ai/api/homekit?action=search&query=lamba"

# 3. Cihazı aç (entity_id'yi değiştirin)
curl -X POST https://www.wiseass.ai/api/homekit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "turn_on",
    "entity_id": "light.living_room"
  }'
```

## Yaygın Hatalar ve Çözümleri

### "Home Assistant is not configured"

**Sebep:** Environment variables eksik veya yanlış

**Çözüm:**
1. Vercel Dashboard > Environment Variables
2. `HOME_ASSISTANT_URL` ve `HOME_ASSISTANT_ACCESS_TOKEN` ekleyin
3. Redeploy yapın

### "Device not found"

**Sebep:** Cihaz adı yanlış veya cihaz Home Assistant'da yok

**Çözüm:**
1. Home Assistant'da cihazları kontrol edin
2. Doğru entity_id'yi kullanın
3. Cihaz arama yaparak doğru ismi bulun

### "401 Unauthorized"

**Sebep:** Token yanlış veya süresi dolmuş

**Çözüm:**
1. Home Assistant > Profile > Long-Lived Access Tokens
2. Yeni token oluşturun
3. Vercel'de güncelleyin
4. Redeploy yapın

### "Connection refused" veya "Network error"

**Sebep:** Home Assistant URL yanlış veya erişilemiyor

**Çözüm:**
1. Home Assistant Cloud URL'inizi kontrol edin
2. Tarayıcıdan erişilebildiğinden emin olun
3. URL'nin `https://` ile başladığından emin olun

## Adım Adım Kontrol Listesi

- [ ] Environment variables Vercel'de var mı?
- [ ] Redeploy yapıldı mı?
- [ ] Home Assistant'a erişilebiliyor mu?
- [ ] Cihazlar Home Assistant'da görünüyor mu?
- [ ] API endpoint test edildi mi?
- [ ] Token geçerli mi?
- [ ] Cihaz adı doğru mu?

## Test Komutları

Web uygulamanızda şu komutları deneyin:

1. **"Cihazları listele"** - Home Assistant'daki tüm cihazları gösterir
2. **"Lambayı aç"** - "lamba" kelimesini içeren ilk cihazı açar
3. **"light.living_room'u aç"** - Spesifik entity_id ile kontrol
4. **"Salon lambasını kapat"** - "salon" ve "lamba" kelimelerini içeren cihazı kapatır

## Hala Çalışmıyorsa

1. Vercel Function Logs'u kontrol edin
2. Home Assistant loglarını kontrol edin
3. Browser console'u kontrol edin (F12)
4. Network tab'ında API isteklerini kontrol edin

