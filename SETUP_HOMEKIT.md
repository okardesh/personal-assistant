# Apple HomeKit Entegrasyonu - Ev Cihazlarını Kontrol Etme

Bu rehber, kişisel asistanınızı kullanarak Apple HomeKit'e bağlı cihazlarınızı (lamba, priz, termostat, vb.) nasıl kontrol edeceğinizi açıklar.

**🚀 Hızlı Başlangıç**: Eğer Home Assistant Cloud (Nabu Casa) hesabınız varsa, [SETUP_HOME_ASSISTANT_CLOUD.md](./SETUP_HOME_ASSISTANT_CLOUD.md) dosyasına bakın - adım adım kurulum rehberi!

## Önemli Not

HomeKit cihazlarını web tabanlı bir uygulamadan kontrol etmek için bir **HomeKit Bridge** veya **Home Assistant** gibi bir platform gereklidir. HomeKit API'si doğrudan web/Node.js'den erişilemez - iOS/macOS framework'ü gerektirir.

**⚠️ Sürekli Açık Makine Gereksinimi**: Home Assistant sürekli açık bir cihaz gerektirir (Raspberry Pi, Docker, vb.). Eğer sürekli açık makine istemiyorsanız, **Apple Shortcuts** yaklaşımını kullanın (aşağıdaki Seçenek 4'e bakın).

Detaylı açıklama için [HOME_ASSISTANT_EXPLAINED.md](./HOME_ASSISTANT_EXPLAINED.md) dosyasına bakın.

## Seçenekler

### Seçenek 1: Home Assistant + HomeKit Entegrasyonu (Önerilen)

Home Assistant, HomeKit cihazlarını kontrol edebilir ve HTTP API sağlar.

**Avantajlar**:
- ✅ HomeKit cihazlarını kontrol eder
- ✅ HTTP API sağlar (web uygulamanızdan çağrılabilir)
- ✅ Sürekli açık makine gerekir (Raspberry Pi, Docker, vb.)

**Kurulum**:
1. Home Assistant kurun
2. HomeKit entegrasyonunu ekleyin
3. Home Assistant API token alın
4. Uygulamanıza Home Assistant API entegrasyonu ekleyin

### Seçenek 2: HomeKit Bridge (hap-nodejs)

HomeKit Bridge oluşturarak HomeKit cihazlarını kontrol edebilirsiniz.

**Avantajlar**:
- ✅ HomeKit protokolünü kullanır
- ✅ Node.js ile çalışır
- ❌ Sürekli açık makine gerekir
- ❌ Karmaşık kurulum

### Seçenek 3: HomeKit HTTP API (Üçüncü Taraf)

Bazı HomeKit bridge'ler HTTP API sağlar.

**Örnekler**:
- Homebridge (HomeKit bridge)
- Home Assistant (HomeKit entegrasyonu ile)

### Seçenek 4: Apple Shortcuts (Sürekli Açık Makine İstemiyorsanız - Önerilen)

Apple Shortcuts kullanarak HomeKit cihazlarını kontrol edebilir ve web API'nizden tetikleyebilirsiniz.

**Nasıl Çalışır**:
1. Shortcuts'ta HomeKit cihazlarını kontrol eden shortcut'lar oluşturun
2. Web API'nizden bu shortcut'ları tetikleyin (URL scheme veya webhook)
3. Personal assistant komutlarını HomeKit kontrolüne çevirin

**Avantajlar**:
- ✅ Sürekli açık makine gerekmez
- ✅ HomeKit'in native desteğini kullanır
- ✅ Kolay kurulum
- ✅ Ev dışından erişim (iCloud üzerinden)

**Dezavantajlar**:
- ❌ iOS/macOS cihaz gerektirir
- ❌ Cihaz açık olmalı (uzaktan erişim için)

**Not**: Bu yaklaşım için ayrı bir rehber hazırlanacak.

## Uygulama Entegrasyonu

Uygulamanıza HomeKit kontrolü eklemek için:

### 1. Home Assistant API Entegrasyonu (Seçenek 1)

```typescript
// lib/homeAssistant.ts
// Home Assistant API ile cihaz kontrolü
```

### 2. OpenAI Function Calling

OpenAI'ye HomeKit kontrol fonksiyonları ekleyin:
- `control_homekit_device` - Cihaz kontrolü (aç/kapa, parlaklık, vb.)

### 3. API Endpoint

```typescript
// app/api/homekit/route.ts
// HomeKit cihaz kontrol endpoint'i
```

## Önerilen Yaklaşım

### Sürekli Açık Makine İstemiyorsanız: Apple Shortcuts

**Avantajlar**:
- ✅ Sürekli açık makine gerekmez
- ✅ HomeKit'in native desteğini kullanır
- ✅ Kolay kurulum

**Kurulum**: Ayrı bir rehber hazırlanacak.

### Sürekli Açık Makine Sorun Değilse: Home Assistant

Home Assistant en pratik çözümdür çünkü:
- HomeKit cihazlarını kontrol eder
- HTTP API sağlar
- Web uygulamanızdan kolayca çağrılabilir
- Ev dışından erişim (Home Assistant Cloud ile)

### Kurulum Adımları (Home Assistant)

1. **Home Assistant Kurulumu**
   - Raspberry Pi, Docker, veya Home Assistant OS
   - [Home Assistant Installation](https://www.home-assistant.io/installation/)
   - **Not**: Sürekli açık bir cihaz gerektirir

2. **HomeKit Entegrasyonu**
   - Home Assistant > Settings > Devices & Services
   - "HomeKit" entegrasyonunu ekleyin
   - HomeKit cihazlarınız otomatik olarak görünecek

3. **Home Assistant API Token**
   - Home Assistant > Profile > Long-Lived Access Tokens
   - Token oluşturun ve kaydedin

4. **Ev Dışından Erişim (Opsiyonel)**
   - **Home Assistant Cloud (Nabu Casa)**: $6.50/ay - En kolay
   - **Kendi Sunucunuz**: Port forwarding, SSL sertifikası gerekir

5. **Uygulama Entegrasyonu**
   - Home Assistant API'sini kullanarak cihazları kontrol edin
   - OpenAI function calling'e `control_homekit_device` ekleyin

## Alternatif: Apple Shortcuts + Webhook

Eğer sürekli açık makine istemiyorsanız:

1. **Shortcuts'ta HomeKit Kontrolü**
   - HomeKit cihazlarını kontrol eden shortcut'lar oluşturun
   - Shortcut'ları webhook ile tetikleyin

2. **Web API'den Shortcut Tetikleme**
   - Personal assistant komutlarını Shortcuts webhook'una gönderin
   - Shortcuts HomeKit cihazlarını kontrol eder

**Not**: Bu yaklaşım iOS/macOS cihaz gerektirir ve cihaz açık olmalıdır.

## Sonraki Adımlar

1. Hangi yaklaşımı kullanacağınıza karar verin
2. Home Assistant veya başka bir platform kurun (gerekirse)
3. Uygulama entegrasyonunu ekleyin
4. Test edin!

## Yardımcı Kaynaklar

- [Home Assistant HomeKit Integration](https://www.home-assistant.io/integrations/homekit/)
- [Home Assistant API](https://developers.home-assistant.io/docs/api/rest/)
- [Homebridge](https://homebridge.io/)
- [Apple HomeKit Documentation](https://developer.apple.com/homekit/)

