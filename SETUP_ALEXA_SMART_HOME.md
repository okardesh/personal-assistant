# Alexa Smart Home Entegrasyonu - Ev Eşyalarını Kontrol Etme

Bu rehber, Alexa üzerinden ev eşyalarınızı (lamba, priz, termostat, vb.) kontrol etmek için Smart Home Skills entegrasyonunu açıklar.

## Fark: Custom Skill vs Smart Home Skill

### Mevcut Entegrasyon (Custom Skill)
- ✅ Konuşma tabanlı: "Takvimimi göster", "E-postalarımı kontrol et"
- ✅ OpenAI ile doğal dil işleme
- ❌ Ev eşyalarını kontrol edemez

### Smart Home Skill (Gerekli)
- ✅ Ev eşyalarını kontrol eder: "Lambayı aç", "Işığı kapat"
- ✅ Cihaz keşfi (Discovery)
- ✅ Cihaz kontrolü (TurnOn, TurnOff, SetBrightness, vb.)
- ✅ OAuth 2.0 yetkilendirme

## Nasıl Çalışır?

1. **Smart Home Skill Oluşturma**: Alexa Developer Console'da Smart Home Skill oluşturun
2. **Discovery Endpoint**: Alexa, evinizdeki cihazları bulmak için bu endpoint'i çağırır
3. **Control Endpoints**: Cihazları kontrol etmek için (aç/kapa, parlaklık ayarla, vb.)
4. **Smart Home Platform**: Home Assistant, SmartThings, Philips Hue, vb. ile entegrasyon

## Seçenek 1: Home Assistant Entegrasyonu (Önerilen)

Home Assistant, açık kaynak bir smart home platformudur ve Alexa ile entegre edilebilir.

### Adımlar:

1. **Home Assistant Kurulumu**
   - Home Assistant'ı kurun (Raspberry Pi, Docker, vb.)
   - Home Assistant Cloud (Nabu Casa) kullanabilirsiniz (ücretli ama kolay)

2. **Home Assistant API Entegrasyonu**
   - Home Assistant API token alın
   - Uygulamanıza Home Assistant API entegrasyonu ekleyin

3. **Alexa Smart Home Skill Oluşturma**
   - Alexa Developer Console > Create Skill > Smart Home
   - Discovery ve Control endpoint'lerini yapılandırın

## Seçenek 2: Philips Hue, SmartThings, vb. (Hazır Platformlar)

Eğer Philips Hue, Samsung SmartThings gibi hazır platformlar kullanıyorsanız:

1. Bu platformların kendi Alexa entegrasyonları var
2. Alexa uygulamasından direkt bağlanabilirsiniz
3. Ek geliştirme gerekmez

## Seçenek 3: Kendi Smart Home API'nizi Oluşturma

Kendi cihazlarınızı kontrol etmek için:

1. **Cihaz Yönetim API'si Oluşturun**
   - Cihazları kaydedin (lamba, priz, termostat, vb.)
   - Kontrol endpoint'leri oluşturun (aç/kapa, parlaklık, sıcaklık, vb.)

2. **Alexa Smart Home Skill Oluşturun**
   - Discovery endpoint: Cihazları listeler
   - Control endpoints: Cihazları kontrol eder

3. **OAuth 2.0 Yetkilendirme**
   - Kullanıcıların cihazlarınıza erişmesi için OAuth gereklidir

## Uygulama Entegrasyonu

Uygulamanıza Smart Home entegrasyonu eklemek için:

### 1. Smart Home API Endpoint'leri

```typescript
// app/api/alexa/smart-home/route.ts
// Discovery endpoint
// Control endpoints (TurnOn, TurnOff, SetBrightness, vb.)
```

### 2. Cihaz Yönetimi

```typescript
// lib/smartHome.ts
// Cihaz listesi
// Cihaz kontrol fonksiyonları
```

### 3. OpenAI Function Calling

OpenAI'ye smart home kontrol fonksiyonları ekleyin:
- `control_device` - Cihaz kontrolü (aç/kapa, parlaklık, vb.)

## Örnek Kullanım Senaryosu

**Kullanıcı**: "Alexa, lambayı aç"
**Alexa**: Smart Home Skill'i çağırır
**Uygulama**: 
1. Discovery endpoint'ten lamba bilgisini alır
2. Control endpoint'e TurnOn isteği gönderir
3. Home Assistant/cihaz API'sine komut gönderir
4. Başarılı yanıt döner

## Hızlı Başlangıç: Home Assistant ile

### 1. Home Assistant Cloud (Nabu Casa) - En Kolay

1. [Nabu Casa](https://www.nabucasa.com/) hesabı oluşturun
2. Home Assistant Cloud'u aktif edin
3. Alexa entegrasyonu otomatik olarak eklenir
4. Alexa uygulamasından "Discover devices" yapın

### 2. Home Assistant Local + Alexa Smart Home Skill

1. Home Assistant'ı kurun
2. [Alexa Smart Home Skill](https://www.home-assistant.io/integrations/alexa/) entegrasyonunu ekleyin
3. OAuth 2.0 yapılandırması yapın
4. Discovery endpoint'i yapılandırın

## Önerilen Yaklaşım

**En Kolay**: Home Assistant Cloud (Nabu Casa) kullanın
- ✅ Otomatik Alexa entegrasyonu
- ✅ SSL sertifikası dahil
- ✅ Ek geliştirme gerekmez
- ❌ Aylık ücret ($6.50/ay)

**Orta Seviye**: Home Assistant Local + Kendi Alexa Skill'iniz
- ✅ Ücretsiz
- ✅ Tam kontrol
- ❌ Daha fazla yapılandırma gerektirir

**Gelişmiş**: Kendi Smart Home API'niz
- ✅ Tam özelleştirme
- ❌ En fazla geliştirme gerektirir

## Sonraki Adımlar

1. Hangi yaklaşımı kullanacağınıza karar verin
2. Home Assistant veya başka bir platform kurun
3. Smart Home API endpoint'lerini ekleyin (gerekirse)
4. Alexa Smart Home Skill oluşturun
5. Test edin!

## Notlar

- Smart Home Skills, Custom Skills'ten farklı bir API kullanır
- OAuth 2.0 yetkilendirme zorunludur
- Discovery endpoint'i cihazları bulmak için gereklidir
- Control endpoint'leri cihazları kontrol etmek için gereklidir

## Yardımcı Kaynaklar

- [Alexa Smart Home Skills API](https://developer.amazon.com/en-US/docs/alexa/smarthome/understand-the-smarthome-skill-api.html)
- [Home Assistant Alexa Integration](https://www.home-assistant.io/integrations/alexa/)
- [Home Assistant Cloud](https://www.nabucasa.com/)

