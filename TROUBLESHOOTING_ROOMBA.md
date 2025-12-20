# Roomba Kontrol Sorun Giderme Rehberi

"Roomba'yı başlat" komutu hata veriyorsa, bu rehber sorunu çözmenize yardımcı olacaktır.

## Adım 1: Vercel Function Logs Kontrolü

1. **Vercel Dashboard** > **Deployments** > Son deployment
2. **Function Logs** sekmesine gidin
3. Şu hataları arayın:
   - `Error controlling Home Assistant device`
   - `Home Assistant API error`
   - `Device not found`
   - `401 Unauthorized`
   - `404 Not Found`

## Adım 2: Home Assistant API Testi

### 1. Roomba Entity ID'sini Kontrol Edin

```bash
# Tüm cihazları listele
curl "https://www.wiseass.ai/api/homekit?action=list"

# Roomba'yı ara
curl "https://www.wiseass.ai/api/homekit?action=search&query=roomba"
```

**Beklenen yanıt:**
```json
{
  "devices": [
    {
      "entity_id": "vacuum.roomba",
      "state": "docked",
      "attributes": {
        "friendly_name": "Roomba",
        ...
      }
    }
  ]
}
```

### 2. Roomba'yı Doğrudan Test Edin

```bash
# Roomba'yı başlat
curl -X POST https://www.wiseass.ai/api/homekit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "entity_id": "vacuum.roomba"
  }'
```

**Beklenen yanıt:**
```json
{
  "success": true,
  "message": "Device vacuum.roomba start completed"
}
```

## Adım 3: Home Assistant'da Kontrol

### 1. Home Assistant'a Giriş Yapın

https://imhahdvrznzycpyimbbkqnbn6tcw0han.ui.nabu.casa

### 2. Roomba Entity'sini Kontrol Edin

1. **Developer Tools** > **States**
2. `vacuum.roomba` entity'sini arayın
3. State'i kontrol edin (docked, cleaning, paused, vb.)
4. **Attributes** bölümünde `supported_features` değerini kontrol edin

### 3. Home Assistant'da Manuel Test

1. **Developer Tools** > **Services**
2. **Service** dropdown'dan `vacuum.start` seçin
3. **Entity** dropdown'dan `vacuum.roomba` seçin
4. **Call Service** butonuna tıklayın
5. Hata alıyorsanız, Home Assistant'da sorun var demektir

## Adım 4: Yaygın Hatalar ve Çözümleri

### Hata: "Device not found"

**Sebep:** Roomba entity_id yanlış veya cihaz Home Assistant'da yok

**Çözüm:**
1. Home Assistant'da `vacuum.roomba` entity'sinin var olduğundan emin olun
2. Entity ID'yi doğru kullanın (büyük/küçük harf duyarlı)
3. API'den cihaz listesini kontrol edin

### Hata: "401 Unauthorized"

**Sebep:** Home Assistant API token yanlış veya süresi dolmuş

**Çözüm:**
1. Home Assistant > Profile > Long-Lived Access Tokens
2. Yeni token oluşturun
3. Vercel'de `HOME_ASSISTANT_ACCESS_TOKEN` değişkenini güncelleyin
4. Redeploy yapın

### Hata: "Home Assistant API error: 404"

**Sebep:** Roomba entity'si bulunamıyor veya servis yanlış

**Çözüm:**
1. Home Assistant'da `vacuum.roomba` entity'sinin var olduğundan emin olun
2. Entity ID'yi kontrol edin
3. Home Assistant loglarını kontrol edin

### Hata: "Pause action not supported"

**Sebep:** Roomba entity'si vacuum domain'inde değil

**Çözüm:**
1. Entity ID'nin `vacuum.` ile başladığından emin olun
2. Home Assistant'da entity domain'ini kontrol edin

### Hata: "Connection refused" veya "Network error"

**Sebep:** Home Assistant URL yanlış veya erişilemiyor

**Çözüm:**
1. Home Assistant Cloud URL'inizi kontrol edin
2. Tarayıcıdan erişilebildiğinden emin olun
3. `HOME_ASSISTANT_URL` environment variable'ını kontrol edin

## Adım 5: Detaylı Debug

### 1. Vercel Function Logs

Vercel Dashboard > Deployments > Function Logs'da şunları arayın:

```
🔍 Searching for device: roomba
✅ Found device: vacuum.roomba
Error controlling Home Assistant device vacuum.roomba
```

### 2. Home Assistant Logs

Home Assistant > Settings > System > Logs

Roomba ile ilgili hataları kontrol edin.

### 3. Browser Console

Web uygulamanızda F12 > Console

API isteklerini ve hataları kontrol edin.

## Adım 6: Manuel Test Senaryoları

### Senaryo 1: Entity ID ile Test

```bash
curl -X POST https://www.wiseass.ai/api/homekit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "entity_id": "vacuum.roomba"
  }'
```

### Senaryo 2: Cihaz Adı ile Test

Personal assistant'da:
- "Roomba'yı başlat"
- "vacuum.roomba'yı başlat"
- "süpürgeyi başlat"

### Senaryo 3: Home Assistant'da Manuel Test

1. Home Assistant > Developer Tools > Services
2. `vacuum.start` servisini seçin
3. `vacuum.roomba` entity'sini seçin
4. Call Service

Eğer burada çalışıyorsa, sorun API entegrasyonunda. Çalışmıyorsa, sorun Home Assistant'da.

## Adım 7: Entity ID Formatı Kontrolü

Roomba entity ID'si şu formatta olmalı:

- ✅ `vacuum.roomba`
- ✅ `vacuum.roomba_2`
- ❌ `roomba` (domain eksik)
- ❌ `sensor.roomba` (yanlış domain)

## Adım 8: Supported Features Kontrolü

Home Assistant'da Roomba entity'sinin `supported_features` değerini kontrol edin:

1. Developer Tools > States > `vacuum.roomba`
2. Attributes > `supported_features` değerini kontrol edin
3. `start`, `stop`, `pause`, `return_to_base` özelliklerinin desteklendiğinden emin olun

## Hızlı Kontrol Listesi

- [ ] Vercel Function Logs kontrol edildi
- [ ] Home Assistant API test edildi
- [ ] Roomba entity_id doğru (`vacuum.roomba`)
- [ ] Home Assistant token geçerli
- [ ] Home Assistant URL doğru
- [ ] Home Assistant'da manuel test yapıldı
- [ ] Environment variables Vercel'de var
- [ ] Redeploy yapıldı

## Sonraki Adımlar

1. Vercel Function Logs'u kontrol edin
2. Home Assistant API'yi test edin
3. Home Assistant'da manuel test yapın
4. Hata mesajını paylaşın (daha spesifik yardım için)

## Yardımcı Komutlar

```bash
# Cihaz listesi
curl "https://www.wiseass.ai/api/homekit?action=list"

# Roomba ara
curl "https://www.wiseass.ai/api/homekit?action=search&query=roomba"

# Roomba bilgisi
curl "https://www.wiseass.ai/api/homekit?action=get&entity_id=vacuum.roomba"

# Roomba'yı başlat
curl -X POST https://www.wiseass.ai/api/homekit \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "entity_id": "vacuum.roomba"}'
```

