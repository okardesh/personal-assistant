# "Tüm Işıklar" Komutu Sorun Giderme

## Sorun: "Tüm ışıkları kapatırken bir hata oluştu"

### 1. Log'ları Kontrol Edin

**Vercel Dashboard'da:**
1. Vercel Dashboard > Deployments > Son deployment
2. Function Logs sekmesine gidin
3. Şu log'ları arayın:
   - `💡 [HomeAssistant] Turning off all lights:`
   - `💡 [HomeAssistant] Response status:`
   - `❌ [HomeAssistant] Failed to turn off all lights:`

**Örnek log çıktısı:**
```
💡 [HomeAssistant] Turning off all lights: https://your-ha-url/api/services/light/turn_off
💡 [HomeAssistant] Response status: 401 Response: {"message": "Invalid token"}
❌ [HomeAssistant] Failed to turn off all lights: { status: 401, error: "Invalid token" }
```

### 2. Environment Variables Kontrolü

**Vercel Dashboard'da kontrol edin:**
1. Vercel Dashboard > Project Settings > Environment Variables
2. Şu değişkenlerin olduğundan emin olun:
   ```
   HOME_ASSISTANT_URL=https://your-ha-url
   HOME_ASSISTANT_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Mutlaka Redeploy yapın** (Deployments > "..." > "Redeploy")

### 3. Home Assistant API Testi

**Manuel test için:**
```bash
# Tüm ışıkları kapat
curl -X POST "https://your-ha-url/api/services/light/turn_off" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Beklenen yanıt:**
```json
[
  {
    "entity_id": "light.living_room",
    "state": "off",
    "attributes": {...}
  },
  {
    "entity_id": "light.bedroom",
    "state": "off",
    "attributes": {...}
  }
]
```

**Hata alıyorsanız:**
- `401 Unauthorized` → Token yanlış veya süresi dolmuş
- `404 Not Found` → URL yanlış veya servis bulunamadı
- `500 Internal Server Error` → Home Assistant sunucu hatası

### 4. Home Assistant'da Kontrol

1. Home Assistant'a giriş yapın
2. **Developer Tools** > **Services** bölümüne gidin
3. **Service** dropdown'dan `light.turn_off` seçin
4. **Service Data** kısmını boş bırakın (tüm ışıkları kapatmak için)
5. **CALL SERVICE** butonuna tıklayın
6. Çalışıyorsa, API entegrasyonu sorunu var demektir

### 5. Alternatif Çözüm: Entity ID Listesi Kullan

Eğer boş body ile çalışmıyorsa, tüm light entity'lerini bulup tek tek kapatabiliriz:

**Home Assistant'da tüm light entity'lerini bulun:**
```bash
curl "https://your-ha-url/api/states" \
  -H "Authorization: Bearer YOUR_TOKEN" | \
  jq '.[] | select(.entity_id | startswith("light.")) | .entity_id'
```

**Sonuç:**
```
light.living_room
light.bedroom
light.kitchen
...
```

### 6. Yaygın Hatalar ve Çözümleri

#### Hata: "Home Assistant yapılandırılmamış"
**Çözüm:** Environment variables'ları kontrol edin ve redeploy yapın

#### Hata: "401 Unauthorized"
**Çözüm:** 
1. Home Assistant'da yeni bir Long-Lived Access Token oluşturun
2. Settings > People > Long-Lived Access Tokens
3. Token'ı kopyalayıp Vercel'e ekleyin
4. Redeploy yapın

#### Hata: "404 Not Found"
**Çözüm:**
1. HOME_ASSISTANT_URL'in doğru olduğundan emin olun
2. URL'in sonunda `/` olmamalı: `https://your-ha-url` (doğru), `https://your-ha-url/` (yanlış)
3. Home Assistant'ın çalıştığından emin olun

#### Hata: "500 Internal Server Error"
**Çözüm:**
1. Home Assistant log'larını kontrol edin
2. Home Assistant'ın servisleri çalışıyor mu kontrol edin
3. Home Assistant'ı yeniden başlatmayı deneyin

### 7. Debug için Test Endpoint

**API endpoint'ini test edin:**
```bash
# Tüm cihazları listele
curl "https://www.wiseass.ai/api/homekit?action=list" | jq '.devices[] | select(.entity_id | startswith("light."))'
```

Bu komut tüm light entity'lerini gösterir. Eğer hiç light yoksa, "all lights" komutu çalışmaz.

### 8. Geçici Çözüm: Tek Tek Kapatma

Eğer "all lights" çalışmıyorsa, şimdilik tek tek kapatabilirsiniz:
- "Salon lambasını kapat"
- "Yatak odası ışığını kapat"
- vb.

### 9. Log'ları Paylaşın

Eğer hala çalışmıyorsa, şu bilgileri paylaşın:
1. Vercel Function Logs'dan hata mesajı
2. Home Assistant versiyonu
3. Environment variables'ların doğru olduğunu doğruladınız mı?
4. Manuel API testi sonucu

