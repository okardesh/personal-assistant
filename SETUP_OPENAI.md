# OpenAI Entegrasyonu Kurulumu

Bu kılavuz, Personal Assistant uygulamanızda OpenAI (ChatGPT) entegrasyonunu nasıl kuracağınızı gösterir.

## 1. OpenAI API Anahtarı Alma

1. [OpenAI Platform](https://platform.openai.com/) sitesine gidin
2. Hesap oluşturun veya giriş yapın
3. Sol menüden **API keys** bölümüne gidin
4. **Create new secret key** butonuna tıklayın
5. Anahtarı kopyalayın (bir daha gösterilmeyecek, saklayın!)

## 2. Environment Variables Ayarlama

Proje kök dizininde `.env.local` dosyası oluşturun (yoksa):

```bash
touch .env.local
```

`.env.local` dosyasına şunu ekleyin:

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

**Not**: 
- `OPENAI_API_KEY`: OpenAI'den aldığınız API anahtarı
- `OPENAI_MODEL`: Kullanmak istediğiniz model (varsayılan: `gpt-4o-mini`)
  - `gpt-4o-mini`: Daha ucuz, hızlı (önerilen)
  - `gpt-4o`: Daha güçlü, daha pahalı
  - `gpt-3.5-turbo`: Eski model, daha ucuz

## 3. Uygulamayı Yeniden Başlatma

Environment variables değişikliklerinin etkili olması için development server'ı yeniden başlatın:

```bash
# Ctrl+C ile durdurun, sonra:
npm run dev
```

## 4. Test Etme

Tarayıcıda http://localhost:3000 adresine gidin ve şu komutları deneyin:

- "Merhaba, nasılsın?"
- "Bugün takvimimde ne var?"
- "E-postalarımı kontrol et"
- "Bana bir şaka anlat"

## Özellikler

OpenAI entegrasyonu ile:

✅ **Doğal dil anlama**: Kullanıcı komutlarını anlar
✅ **Fonksiyon çağırma**: Takvim ve e-posta fonksiyonlarını otomatik çağırır
✅ **Konuşma geçmişi**: Önceki mesajları hatırlar
✅ **Akıllı yanıtlar**: Genel sorulara mantıklı cevaplar verir

## Maliyet

OpenAI API kullanımı ücretlidir:

- **gpt-4o-mini**: ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens
- **gpt-4o**: ~$2.50 / 1M input tokens, ~$10 / 1M output tokens

Küçük kullanımlar için genellikle aylık birkaç dolar yeterlidir. OpenAI hesabınızda kullanımı takip edebilirsiniz.

## Sorun Giderme

### "OpenAI API key is not configured" hatası
- `.env.local` dosyasının proje kök dizininde olduğundan emin olun
- Dosyada `OPENAI_API_KEY=sk-...` formatında olduğundan emin olun
- Development server'ı yeniden başlatın

### "OpenAI API key is invalid" hatası
- API anahtarınızın doğru olduğundan emin olun
- OpenAI hesabınızda kredi/bakiye olduğundan emin olun
- API anahtarının aktif olduğundan emin olun

### Yavaş yanıtlar
- `gpt-4o-mini` modelini kullanın (daha hızlı)
- Daha kısa mesajlar gönderin
- Konuşma geçmişini sınırlandırın

