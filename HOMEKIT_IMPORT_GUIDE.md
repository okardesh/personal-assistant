# HomeKit Cihazlarını Home Assistant'a Import Etme

HomeKit bridge kuruldu ama cihazlar Home Assistant'da görünmüyor. Bu rehber, HomeKit cihazlarınızı Home Assistant'a nasıl import edeceğinizi gösterir.

## Sorun

Home Assistant'da HomeKit bridge kuruldu ama HomeKit cihazları (lamba, priz, vb.) görünmüyor. JSON'da sadece Home Assistant'ın kendi cihazları var (media_player, vacuum, sensor, vb.).

## Çözüm: HomeKit Cihazlarını Import Etme

### Yöntem 1: HomeKit Entegrasyonu ile Import (Önerilen)

1. **Home Assistant'a Giriş Yapın**
   - https://imhahdvrznzycpyimbbkqnbn6tcw0han.ui.nabu.casa

2. **Settings > Devices & Services**
   - Sol menüden **Settings** > **Devices & Services** seçin

3. **HomeKit Entegrasyonunu Bulun**
   - Entegrasyonlar listesinde **HomeKit** entegrasyonunu bulun
   - Eğer yoksa, sağ alttaki **+** butonuna tıklayın ve **HomeKit** ekleyin

4. **HomeKit Bridge Yapılandırması**
   - HomeKit entegrasyonuna tıklayın
   - **Configure** butonuna tıklayın
   - **Accessories** sekmesine gidin

5. **Cihazları Import Etme**
   - HomeKit cihazlarınızı görmelisiniz
   - Her cihazın yanında **Import** butonu olmalı
   - Import etmek istediğiniz cihazların yanındaki **Import** butonuna tıklayın

6. **Alternatif: Otomatik Import**
   - Bazı HomeKit entegrasyonları cihazları otomatik import eder
   - Eğer cihazlar görünmüyorsa, HomeKit bridge'in doğru yapılandırıldığından emin olun

### Yöntem 2: HomeKit Bridge Yapılandırması

Eğer HomeKit bridge kuruldu ama cihazlar görünmüyorsa:

1. **Home Assistant > Settings > Devices & Services**
2. **HomeKit** entegrasyonunu bulun
3. **Configure** butonuna tıklayın
4. **Bridge** sekmesine gidin
5. **Accessories** bölümünde cihazlarınızı görmelisiniz
6. Her cihazın yanında **Import** veya **Add to Home Assistant** butonu olmalı

### Yöntem 3: HomeKit Accessory'leri Manuel Ekleme

Eğer yukarıdaki yöntemler çalışmıyorsa:

1. **Home Assistant > Developer Tools > Services**
2. **homekit** servisini bulun
3. **homekit.pair** servisini kullanarak cihazları eşleştirin

## Kontrol Etme

### 1. Home Assistant'da Kontrol

1. **Settings > Devices & Services**
2. **HomeKit** entegrasyonuna tıklayın
3. **Entities** sekmesine gidin
4. HomeKit cihazlarınızı görmelisiniz (örn: `light.living_room`, `switch.kitchen`)

### 2. API ile Kontrol

```bash
# Tüm cihazları listele (filtrelenmiş - sadece kontrol edilebilir)
curl "https://www.wiseass.ai/api/homekit?action=list"

# Tüm cihazları listele (filtresiz)
curl "https://www.wiseass.ai/api/homekit?action=list&all=true"

# Light cihazlarını ara
curl "https://www.wiseass.ai/api/homekit?action=search&query=light"
```

### 3. Entity ID Formatı

HomeKit cihazları şu formatta görünmelidir:

- `light.living_room` - Işık
- `switch.kitchen` - Anahtar
- `cover.blinds` - Perde
- `climate.thermostat` - Termostat

## Sorun Giderme

### Cihazlar Görünmüyor

1. **HomeKit Bridge Aktif mi?**
   - Home Assistant > Settings > Devices & Services > HomeKit
   - Bridge'in aktif olduğundan emin olun

2. **HomeKit Cihazları Eşleştirildi mi?**
   - iOS/macOS Home App'te cihazların Home Assistant bridge'e eklendiğinden emin olun
   - Home App > + > Add Accessory > Home Assistant Bridge

3. **Home Assistant Logları**
   - Home Assistant > Settings > System > Logs
   - HomeKit ile ilgili hataları kontrol edin

### Import Butonu Görünmüyor

- HomeKit entegrasyonu eski versiyonda olabilir
- Home Assistant'ı güncelleyin
- HomeKit bridge'i yeniden kurun

## Alternatif: Home Assistant'da Cihaz Oluşturma

Eğer HomeKit cihazlarını import edemiyorsanız, Home Assistant'da manuel olarak cihaz oluşturabilirsiniz:

1. **Home Assistant > Settings > Devices & Services**
2. **+ Add Integration** butonuna tıklayın
3. Cihaz tipinize uygun entegrasyonu seçin (Generic, MQTT, vb.)
4. Cihazı yapılandırın

## Sonraki Adımlar

1. ✅ HomeKit cihazlarını Home Assistant'a import edin
2. ✅ Entity ID'lerini not edin (örn: `light.living_room`)
3. ✅ API'yi test edin
4. ✅ Personal assistant'ınızla cihazları kontrol edin

## Yardımcı Kaynaklar

- [Home Assistant HomeKit Integration](https://www.home-assistant.io/integrations/homekit/)
- [Home Assistant HomeKit Bridge](https://www.home-assistant.io/integrations/homekit/#homekit-bridge)
- [Home Assistant Devices & Services](https://www.home-assistant.io/docs/configuration/devices/)

