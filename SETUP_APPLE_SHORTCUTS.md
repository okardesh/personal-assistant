# Apple Shortcuts Entegrasyonu - Siri ile Kişisel Asistan

Bu rehber, Apple Shortcuts kullanarak Siri üzerinden kişisel asistanınızı nasıl kontrol edeceğinizi açıklar.

## Avantajlar

✅ **Sürekli açık makine gerekmez** - Web API'lerini çağırır
✅ **Siri ile kullanım** - "Hey Siri" ile komutlar çalıştırılabilir
✅ **Kolay kurulum** - Sadece Shortcuts uygulamasında yapılandırma
✅ **Mevcut API'ler** - Zaten var olan endpoint'leri kullanır
✅ **iOS, iPadOS, macOS** - Tüm Apple cihazlarda çalışır

## Nasıl Çalışır?

1. **Shortcuts Uygulaması**: iOS/macOS'ta Shortcuts uygulamasını açın
2. **Web API Çağrısı**: Mevcut API endpoint'lerinize HTTP istekleri gönderin
3. **Siri Entegrasyonu**: Shortcut'ları Siri'ye ekleyin
4. **Kullanım**: "Hey Siri, [shortcut adı]" diyerek çalıştırın

## Mevcut API Endpoint'leri

Uygulamanızda zaten şu endpoint'ler mevcut:

- `POST /api/assistant` - Ana asistan API'si
- `GET /api/calendar?period=today` - Takvim etkinlikleri
- `GET /api/email?unread=true` - E-postalar
- `GET /api/location` - Konum bilgisi
- `POST /api/tts` - Text-to-speech

## Kurulum Adımları

### 1. Shortcuts Uygulamasını Açın

- **iOS/iPadOS**: Shortcuts uygulaması (iOS 13+)
- **macOS**: Shortcuts uygulaması (macOS Monterey+)

### 2. Yeni Shortcut Oluşturun

1. Shortcuts uygulamasında "+" butonuna tıklayın
2. "Add Action" butonuna tıklayın
3. "Web" kategorisinden "Get Contents of URL" seçin

### 3. API Endpoint'ini Yapılandırın

**Örnek: Takvim Sorgulama**

```
URL: https://www.wiseass.ai/api/calendar?period=today
Method: GET
Headers:
  Content-Type: application/json
```

**Örnek: Asistan Sorgulama**

```
URL: https://www.wiseass.ai/api/assistant
Method: POST
Headers:
  Content-Type: application/json
Body (JSON):
{
  "message": "Bugünkü randevularım neler?",
  "location": null,
  "conversationHistory": []
}
```

### 4. Yanıtı İşleyin

1. "Get Contents of URL" action'ından sonra "Get Dictionary from Input" ekleyin
2. JSON yanıtını parse edin
3. "Speak Text" action'ı ekleyerek Siri'ye söyletin

### 5. Siri'ye Ekleyin

1. Shortcut'ın ayarlarına gidin
2. "Add to Siri" butonuna tıklayın
3. Siri için bir komut belirleyin (örn: "Takvimimi göster")

## Örnek Shortcut'lar

### 1. Takvim Sorgulama

**Adı**: "Takvimimi Göster"

**Actions**:
1. Get Contents of URL
   - URL: `https://www.wiseass.ai/api/calendar?period=today`
   - Method: GET
2. Get Dictionary from Input
3. Get Value for "events" in Dictionary
4. Repeat with Each (events)
   - Get Value for "title" in Dictionary
   - Get Value for "time" in Dictionary
   - Combine Text: "[time] - [title]"
5. Combine Text (tüm etkinlikleri birleştir)
6. Speak Text

**Siri Komutu**: "Hey Siri, takvimimi göster"

### 2. E-posta Kontrolü

**Adı**: "E-postalarımı Kontrol Et"

**Actions**:
1. Get Contents of URL
   - URL: `https://www.wiseass.ai/api/email?unread=true&limit=5`
   - Method: GET
2. Get Dictionary from Input
3. Get Value for "emails" in Dictionary
4. Count Items
5. If Count > 0:
   - Speak Text: "Okunmamış [count] e-postanız var"
6. Else:
   - Speak Text: "Okunmamış e-postanız yok"

**Siri Komutu**: "Hey Siri, e-postalarımı kontrol et"

### 3. Asistan Sorgulama

**Adı**: "Asistanıma Sor"

**Actions**:
1. Ask for Input
   - Prompt: "Ne sormak istersiniz?"
   - Input Type: Text
2. Get Contents of URL
   - URL: `https://www.wiseass.ai/api/assistant`
   - Method: POST
   - Request Body: JSON
   - Body:
     ```json
     {
       "message": "[Ask for Input sonucu]",
       "location": null,
       "conversationHistory": []
     }
     ```
3. Get Dictionary from Input
4. Get Value for "response" in Dictionary
5. Speak Text

**Siri Komutu**: "Hey Siri, asistanıma sor"

### 4. Hava Durumu

**Adı**: "Hava Durumu"

**Actions**:
1. Get Current Location
2. Get Contents of URL
   - URL: `https://www.wiseass.ai/api/assistant`
   - Method: POST
   - Request Body: JSON
   - Body:
     ```json
     {
       "message": "Hava durumu nasıl?",
       "location": {
         "latitude": [Current Location Latitude],
         "longitude": [Current Location Longitude]
       },
       "conversationHistory": []
     }
     ```
3. Get Dictionary from Input
4. Get Value for "response" in Dictionary
5. Speak Text

**Siri Komutu**: "Hey Siri, hava durumu"

## Gelişmiş Kullanım

### Konuşma Geçmişi (Conversation History)

Daha akıllı konuşmalar için conversation history ekleyebilirsiniz:

```json
{
  "message": "Sonraki etkinlik ne?",
  "location": null,
  "conversationHistory": [
    {
      "role": "user",
      "content": "Takvimimi göster"
    },
    {
      "role": "assistant",
      "content": "Bugün 3 etkinliğiniz var..."
    }
  ]
}
```

### Konum Bilgisi

Konum gerektiren komutlar için:

1. "Get Current Location" action'ını ekleyin
2. Latitude ve Longitude değerlerini alın
3. API isteğinde location parametresini ekleyin

## Güvenlik Notları

### API Key (İsteğe Bağlı)

Eğer API'nizi korumak isterseniz:

1. Environment variable'da bir API key tanımlayın
2. Shortcut'ta bu key'i header olarak ekleyin:
   ```
   Authorization: Bearer YOUR_API_KEY
   ```

### HTTPS

Tüm API çağrıları HTTPS üzerinden yapılmalıdır (Vercel otomatik sağlar).

## Sorun Giderme

### "Could not connect" Hatası

- URL'nin doğru olduğundan emin olun
- HTTPS kullandığınızdan emin olun
- Vercel deployment'ının çalıştığından emin olun

### JSON Parse Hatası

- API yanıtının JSON formatında olduğundan emin olun
- "Get Dictionary from Input" action'ını kullandığınızdan emin olun

### Siri Komutu Çalışmıyor

- Shortcut'ın "Add to Siri" ile eklendiğinden emin olun
- Komutun benzersiz olduğundan emin olun
- Siri'nin dil ayarlarını kontrol edin

## Örnek Shortcut İçe Aktarma

Shortcuts uygulamasında başkalarının oluşturduğu shortcut'ları içe aktarabilirsiniz:

1. Shortcut linkini açın (iCloud link)
2. "Get Shortcut" butonuna tıklayın
3. Shortcut'ı düzenleyip kendi API URL'nizi ekleyin

## Sonraki Adımlar

1. ✅ Shortcuts uygulamasını açın
2. ✅ İlk shortcut'ı oluşturun (Takvim sorgulama)
3. ✅ Siri'ye ekleyin ve test edin
4. ✅ Diğer shortcut'ları oluşturun
5. 🎉 Siri ile kişisel asistanınızı kullanın!

## Yardımcı Kaynaklar

- [Apple Shortcuts Dokümantasyonu](https://support.apple.com/guide/shortcuts/)
- [Shortcuts Gallery](https://www.icloud.com/shortcuts/)
- [API Endpoint'leri](./README.md#api-endpoints)

