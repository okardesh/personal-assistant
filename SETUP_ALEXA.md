# Amazon Alexa Entegrasyonu Kurulum Rehberi

Bu rehber, kişisel asistan uygulamanızı Amazon Alexa ile entegre etmek için adım adım talimatlar içerir.

## Ön Gereksinimler

1. Uygulamanızın bir public URL'de deploy edilmiş olması gerekiyor (ör. Vercel, AWS, Heroku)
2. Amazon Developer hesabı (ücretsiz)
3. Alexa uyumlu bir cihaz veya Alexa Developer Console'da test yeteneği

## Adım 1: Uygulamayı Deploy Edin

Uygulamanızı bir hosting servisine deploy edin. Örnekler:

- **Vercel**: `vercel deploy`
- **AWS**: AWS Lambda + API Gateway
- **Heroku**: `git push heroku main`

Deploy sonrası endpoint URL'nizi not edin: `https://your-domain.com/api/alexa`

## Adım 2: Alexa Skill Oluşturma

1. [Amazon Developer Console](https://developer.amazon.com/alexa/console/ask) adresine gidin
2. "Sign In" ile giriş yapın (Amazon hesabınızla)
3. "Create Skill" butonuna tıklayın

### Skill Yapılandırması

- **Skill name**: "My Personal Assistant" (veya istediğiniz isim)
- **Default language**: Türkçe veya İngilizce seçin
- **Primary model**: "Custom" seçin
- **Hosting method**: "Provision your own" seçin
- "Create skill" butonuna tıklayın

## Adım 3: Invocation Name Ayarlama

1. Sol menüden "Invocation" seçeneğine tıklayın
2. **Skill Invocation Name** alanına kullanıcıların söyleyeceği ismi girin:
   - Örnek: "kişisel asistanım", "my assistant", "asistanım"
   - Bu isim, kullanıcıların skill'i açmak için kullanacağı komut olacak
3. "Save Model" butonuna tıklayın

## Adım 4: Intent Yapılandırması

### Seçenek 1: Basit Yapılandırma (Önerilen)

En basit yöntem, tüm komutları tek bir intent ile yakalamaktır:

1. Sol menüden "Intents" seçeneğine tıklayın
2. "Add Intent" butonuna tıklayın
3. Intent adı: `UserCommand` (veya istediğiniz isim)
4. "Create custom intent" seçeneğini seçin
5. **Sample Utterances** bölümüne örnek komutlar ekleyin:
   ```
   takvimimi göster
   bugünkü randevularım
   e-postalarımı kontrol et
   hava durumu nasıl
   yarınki toplantılarım
   ```
6. "Save Model" butonuna tıklayın

### Seçenek 2: Gelişmiş Yapılandırma

Daha spesifik intents oluşturabilirsiniz:

- `CheckCalendarIntent`: "takvimimi göster", "randevularım"
- `CheckEmailIntent`: "e-postalarımı kontrol et", "okunmamış e-postalar"
- `WeatherIntent`: "hava durumu", "hava nasıl"
- `HelpIntent`: Zaten mevcut (AMAZON.HelpIntent)

## Adım 5: Endpoint Yapılandırması

1. Sol menüden "Endpoint" seçeneğine tıklayın
2. **Default Region** için endpoint tipini seçin:
   - **HTTPS**: Deploy ettiğiniz URL'yi girin
   - Endpoint URL: `https://your-domain.com/api/alexa`
3. **SSL Certificate**: "My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority" seçeneğini seçin (Vercel, AWS gibi servisler için)
4. "Save Endpoints" butonuna tıklayın

## Adım 6: Model Oluşturma ve Test

1. Üst menüden "Build" sekmesine gidin
2. "Build Model" butonuna tıklayın
3. Build işleminin tamamlanmasını bekleyin (birkaç dakika sürebilir)
4. Build tamamlandıktan sonra "Test" sekmesine gidin
5. Test konsolunda skill'inizi test edebilirsiniz:
   - Metin girişi ile test edebilirsiniz
   - "Enable" butonuna tıklayarak skill'i aktif edin

### Test Örnekleri

Test konsolunda şu komutları deneyin:

```
open kişisel asistanım
takvimimi göster
bugünkü randevularım neler
e-postalarımı kontrol et
hava durumu nasıl
```

## Adım 7: Gerçek Cihazda Test

1. Alexa uygulamasını telefonunuzda açın
2. "Skills & Games" bölümüne gidin
3. "Your Skills" > "Dev Skills" bölümüne gidin
4. Skill'inizi bulun ve etkinleştirin
5. Alexa cihazınızda şunu söyleyin:
   - "Alexa, open [invocation name]"
   - Örnek: "Alexa, open kişisel asistanım"

## Sorun Giderme

### Endpoint Hatası

- Endpoint URL'nizin doğru olduğundan emin olun
- HTTPS kullandığınızdan emin olun
- SSL sertifikasının geçerli olduğundan emin olun

### Skill Açılmıyor

- Invocation name'in doğru telaffuz edildiğinden emin olun
- Skill'in build edildiğinden emin olun
- Test konsolunda önce test edin

### Yanıt Almıyorum

- Uygulamanızın çalıştığından emin olun
- API endpoint'inin doğru yanıt döndürdüğünü kontrol edin
- Logları kontrol edin (Vercel Dashboard, AWS CloudWatch, vb.)

### SSL Sertifika Hatası

- Vercel, AWS gibi servisler otomatik SSL sağlar
- Kendi sunucunuzu kullanıyorsanız, Let's Encrypt gibi bir servis kullanın

## Gelişmiş Özellikler

### Session Attributes

Skill, konuşma geçmişini session attributes ile saklar. Bu sayede kullanıcı "özetle" dediğinde önceki konuşmayı hatırlar.

### SSML Desteği

Yanıtları SSML formatında döndürerek daha doğal konuşma sağlayabilirsiniz. `lib/alexa.ts` dosyasında `outputSpeech.type` değerini `SSML` olarak değiştirebilirsiniz.

### Card Desteği

Alexa uygulamasında görsel kartlar gösterebilirsiniz. `lib/alexa.ts` dosyasında `card` objesi ekleyebilirsiniz.

## Production'a Geçiş

1. **Request Verification**: Production'da Alexa isteklerinin gerçekten Amazon'dan geldiğini doğrulayın
2. **Error Handling**: Daha detaylı hata yönetimi ekleyin
3. **Logging**: Tüm istekleri loglayın
4. **Rate Limiting**: API rate limiting ekleyin
5. **User Authentication**: Multi-user desteği için authentication ekleyin

## Örnek Skill JSON

Eğer manuel olarak skill JSON'u oluşturmak isterseniz, örnek bir yapı:

```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "kişisel asistanım",
      "intents": [
        {
          "name": "UserCommand",
          "samples": [
            "takvimimi göster",
            "bugünkü randevularım",
            "e-postalarımı kontrol et",
            "hava durumu nasıl"
          ]
        },
        {
          "name": "AMAZON.CancelIntent"
        },
        {
          "name": "AMAZON.StopIntent"
        },
        {
          "name": "AMAZON.HelpIntent"
        }
      ]
    }
  }
}
```

## Yardım ve Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. Alexa Developer Console'daki test konsolunu kullanın
3. Endpoint'inizi doğrudan test edin (Postman, curl, vb.)

## Sonraki Adımlar

- Skill'inizi Alexa Skills Store'a yayınlamak için certification sürecine başlayın
- Daha fazla intent ekleyerek skill'inizi genişletin
- Multi-language desteği ekleyin
- Account linking ile kullanıcı kimlik doğrulaması ekleyin

