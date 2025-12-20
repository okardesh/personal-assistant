# Home Assistant Cloud (Nabu Casa) Kurulum Rehberi

Bu rehber, Home Assistant Cloud (Nabu Casa) kullanarak HomeKit cihazlarınızı kişisel asistanınızla kontrol etmek için adım adım talimatlar içerir.

## Adım 1: Home Assistant Kurulumu

Home Assistant Cloud kullanmak için önce Home Assistant'ı kurmanız gerekir.

### Seçenek A: Home Assistant OS (Önerilen - Raspberry Pi)

1. **Raspberry Pi Hazırlığı**
   - Raspberry Pi 4 (2GB+ RAM önerilir)
   - MicroSD kart (32GB+)
   - Güç adaptörü

2. **Home Assistant OS İndirme**
   - [Home Assistant OS İndirme Sayfası](https://www.home-assistant.io/installation/raspberrypi/)
   - Raspberry Pi Imager kullanarak SD karta yazın

3. **Kurulum**
   - SD kartı Raspberry Pi'ye takın
   - Güç verin
   - İlk açılışta Home Assistant otomatik kurulur (10-20 dakika)

4. **İlk Erişim**
   - Tarayıcıdan `http://homeassistant.local:8123` adresine gidin
   - İlk kullanıcı hesabınızı oluşturun

### Seçenek B: Docker (Mevcut Bilgisayarınızda)

1. **Docker Kurulumu**
   - Docker Desktop'ı kurun (Mac/Windows)
   - veya Linux'ta Docker kurun

2. **Home Assistant Container Çalıştırma**
   ```bash
   docker run -d \
     --name homeassistant \
     --privileged \
     --restart=unless-stopped \
     -e TZ=Europe/Istanbul \
     -v /PATH_TO_YOUR_CONFIG:/config \
     --network=host \
     ghcr.io/home-assistant/home-assistant:stable
   ```

3. **İlk Erişim**
   - Tarayıcıdan `http://localhost:8123` adresine gidin
   - İlk kullanıcı hesabınızı oluşturun

### Seçenek C: Home Assistant Cloud (Tamamen Cloud - Gelişmiş)

Eğer tamamen cloud'da çalışan bir Home Assistant istiyorsanız, özel hosting gerekir (AWS, DigitalOcean, vb.). Bu daha gelişmiş bir seçenektir.

## Adım 2: Nabu Casa (Home Assistant Cloud) Bağlantısı

1. **Home Assistant'a Giriş Yapın**
   - Tarayıcıdan Home Assistant'a gidin
   - Hesabınıza giriş yapın

2. **Nabu Casa Entegrasyonunu Ekleyin**
   - Sol menüden **Settings** (Ayarlar) > **Add-ons** > **Add-on Store**
   - "Nabu Casa" araması yapın
   - **Home Assistant Cloud** add-on'unu bulun
   - **Install** (Kur) butonuna tıklayın

3. **Nabu Casa Hesabınızla Bağlayın**
   - Add-on kurulduktan sonra **Open Web UI** butonuna tıklayın
   - Nabu Casa hesabınızla giriş yapın
   - **Start** butonuna tıklayın

4. **Cloud Bağlantısını Aktif Edin**
   - Home Assistant > **Settings** > **Home Assistant Cloud**
   - **Connect** butonuna tıklayın
   - Nabu Casa hesabınızla giriş yapın
   - Bağlantı kurulduktan sonra cloud URL'inizi not edin (örn: `https://xxxxx-xxxxx.ui.nabu.casa`)

## Adım 3: HomeKit Entegrasyonu

1. **HomeKit Entegrasyonunu Ekleyin**
   - Home Assistant > **Settings** > **Devices & Services**
   - Sağ alttaki **+** butonuna tıklayın
   - **HomeKit** entegrasyonunu bulun ve seçin

2. **HomeKit Bridge Oluşturun**
   - **Submit** butonuna tıklayın
   - HomeKit Bridge oluşturulacak
   - Bir QR kod göreceksiniz

3. **iOS/macOS'ta Home App'e Ekleyin**
   - iPhone/iPad/Mac'te **Home** uygulamasını açın
   - **+** > **Add Accessory** seçin
   - QR kodu tarayın veya **"Don't have a code?"** seçeneğini kullanın
   - HomeKit cihazlarınız otomatik olarak görünecek

4. **Cihazları Kontrol Edin**
   - Home Assistant'da cihazlarınızı görebilirsiniz
   - Home App'te de cihazlarınızı görebilirsiniz

## Adım 4: Home Assistant API Token Alma

1. **Long-Lived Access Token Oluşturun**
   - Home Assistant > Sağ üstteki profil ikonuna tıklayın
   - En altta **Long-Lived Access Tokens** bölümüne gidin
   - **Create Token** butonuna tıklayın
   - Token için bir isim verin (örn: "Personal Assistant")
   - **OK** butonuna tıklayın
   - **Token'ı kopyalayın ve güvenli bir yere kaydedin** (bir daha gösterilmeyecek!)

## Adım 5: Environment Variables Ekleme

### Local Development (.env.local)

`.env.local` dosyanıza ekleyin:

```env
# Home Assistant Configuration
HOME_ASSISTANT_URL=https://xxxxx-xxxxx.ui.nabu.casa
HOME_ASSISTANT_ACCESS_TOKEN=your-long-lived-access-token-here
```

**Önemli Notlar**:
- `HOME_ASSISTANT_URL`: Nabu Casa cloud URL'iniz (örn: `https://xxxxx-xxxxx.ui.nabu.casa`)
- `HOME_ASSISTANT_ACCESS_TOKEN`: Adım 4'te oluşturduğunuz token

### Vercel Production

1. Vercel Dashboard > Project Settings > Environment Variables
2. Aşağıdaki değişkenleri ekleyin:

```
HOME_ASSISTANT_URL=https://xxxxx-xxxxx.ui.nabu.casa
HOME_ASSISTANT_ACCESS_TOKEN=your-long-lived-access-token-here
```

3. **Redeploy** yapın (environment variables değişikliklerinin etkili olması için)

## Adım 6: Test Etme

### 1. API Endpoint Testi

Tarayıcıdan veya terminal'den test edin:

```bash
# Cihaz listesi
curl "https://www.wiseass.ai/api/homekit?action=list"

# Cihaz arama
curl "https://www.wiseass.ai/api/homekit?action=search&query=lamba"

# Cihaz bilgisi
curl "https://www.wiseass.ai/api/homekit?action=get&entity_id=light.living_room"
```

### 2. Personal Assistant ile Test

Web uygulamanızda şu komutları deneyin:

- "Lambayı aç"
- "Işığı kapat"
- "Salon lambasını %50 parlaklığa ayarla"
- "Lambayı aç/kapat" (toggle)

### 3. Cihaz Kontrolü Testi

```bash
# Lambayı aç
curl -X POST https://www.wiseass.ai/api/homekit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "turn_on",
    "entity_id": "light.living_room"
  }'

# Lambayı kapat
curl -X POST https://www.wiseass.ai/api/homekit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "turn_off",
    "entity_id": "light.living_room"
  }'

# Parlaklık ayarla
curl -X POST https://www.wiseass.ai/api/homekit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set_brightness",
    "entity_id": "light.living_room",
    "service_data": {
      "brightness": 50
    }
  }'
```

## Sorun Giderme

### "Home Assistant is not configured" Hatası

- Environment variables'ların doğru eklendiğinden emin olun
- `HOME_ASSISTANT_URL` ve `HOME_ASSISTANT_ACCESS_TOKEN` değerlerini kontrol edin
- Vercel'de redeploy yaptığınızdan emin olun

### "Device not found" Hatası

- Cihaz adını kontrol edin
- Home Assistant'da cihazın `entity_id`'sini kontrol edin
- Cihaz arama yaparak doğru `entity_id`'yi bulun

### "Home Assistant API error" Hatası

- Token'ın geçerli olduğundan emin olun
- Home Assistant'ın çalıştığından emin olun
- Cloud URL'in doğru olduğundan emin olun
- Home Assistant loglarını kontrol edin

### Cihazlar Görünmüyor

- HomeKit entegrasyonunun aktif olduğundan emin olun
- Home Assistant'da cihazların göründüğünden emin olun
- Home App'te cihazların eklendiğinden emin olun

## Entity ID Formatı

Home Assistant'da cihazlar şu formatta görünür:

- `light.living_room` - Işık
- `switch.kitchen` - Anahtar
- `climate.thermostat` - Termostat
- `cover.garage_door` - Perde/Kapı

Entity ID'yi bulmak için:
1. Home Assistant > **Developer Tools** > **States**
2. Cihazınızı bulun
3. Entity ID'yi kopyalayın

## Sonraki Adımlar

1. ✅ Home Assistant kuruldu
2. ✅ Nabu Casa bağlandı
3. ✅ HomeKit entegrasyonu eklendi
4. ✅ API token alındı
5. ✅ Environment variables eklendi
6. ✅ Test edildi
7. 🎉 Personal assistant'ınızla HomeKit cihazlarınızı kontrol edin!

## Yardımcı Kaynaklar

- [Home Assistant Documentation](https://www.home-assistant.io/docs/)
- [Nabu Casa Documentation](https://www.nabucasa.com/)
- [Home Assistant Cloud Setup](https://www.nabucasa.com/config/)
- [Home Assistant API](https://developers.home-assistant.io/docs/api/rest/)

