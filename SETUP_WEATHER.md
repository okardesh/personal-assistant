# Hava Durumu Entegrasyonu Kurulumu

Bu kılavuz, Personal Assistant uygulamanızda hava durumu özelliğini nasıl kuracağınızı gösterir.

## 1. OpenWeatherMap API Anahtarı Alma

1. [OpenWeatherMap](https://openweathermap.org/api) sitesine gidin
2. **Sign Up** butonuna tıklayın ve ücretsiz hesap oluşturun
3. Email adresinizi doğrulayın (gelen kutunuzu kontrol edin)
4. Giriş yaptıktan sonra, [API Keys](https://home.openweathermap.org/api_keys) sayfasına gidin
5. **Create Key** butonuna tıklayın
6. Key name olarak "Personal Assistant" yazın ve **Generate** butonuna tıklayın
7. Oluşturulan API key'i kopyalayın

**Not**: API key'in aktif olması birkaç dakika sürebilir.

## 2. Environment Variable Ayarlama

Proje kök dizininde `.env.local` dosyasını açın (yoksa oluşturun) ve şunu ekleyin:

```env
OPENWEATHER_API_KEY=your-api-key-here
```

Örnek `.env.local` dosyası:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# OpenWeatherMap API
OPENWEATHER_API_KEY=1234567890abcdef1234567890abcdef

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 3. Uygulamayı Yeniden Başlatma

Environment variables değişikliklerinin etkili olması için development server'ı yeniden başlatın:

```bash
# Ctrl+C ile durdurun, sonra:
npm run dev
```

## 4. Test Etme

Tarayıcıda http://localhost:3000 adresine gidin ve şu komutları deneyin:

- "Hava durumu nasıl?"
- "Bugün hava nasıl?"
- "İstanbul'da hava durumu nedir?"
- "Yağmur yağacak mı?"
- "Sıcaklık kaç derece?"

## Özellikler

Hava durumu entegrasyonu ile:

✅ **Konum bazlı hava durumu**: Tarayıcı konum izni verildiğinde otomatik olarak bulunduğunuz yerin hava durumunu gösterir
✅ **Şehir bazlı sorgu**: Herhangi bir şehir için hava durumu sorgulayabilirsiniz
✅ **Detaylı bilgi**: Sıcaklık, hissedilen sıcaklık, nem, rüzgar hızı ve hava durumu açıklaması
✅ **Türkçe desteği**: Hava durumu açıklamaları Türkçe olarak gelir

## API Limitleri (Ücretsiz Plan)

- **60 çağrı/dakika**: Dakikada en fazla 60 istek
- **1,000,000 çağrı/ay**: Ayda 1 milyon istek (kişisel kullanım için fazlasıyla yeterli)
- **Ücretsiz**: Tamamen ücretsiz

## Sorun Giderme

### "OpenWeatherMap API key is not configured" hatası
- `.env.local` dosyasının proje kök dizininde olduğundan emin olun
- Dosyada `OPENWEATHER_API_KEY=...` formatında olduğundan emin olun
- Development server'ı yeniden başlatın

### "Failed to fetch weather data" hatası
- API key'inizin doğru olduğundan emin olun
- API key'in aktif olduğundan emin olun (oluşturduktan sonra birkaç dakika bekleyin)
- API limitlerini aşmadığınızdan emin olun
- İnternet bağlantınızı kontrol edin

### Konum izni verilmedi
- Tarayıcınızın konum izinlerini kontrol edin
- "Hava durumu İstanbul'da nasıl?" gibi şehir adı belirterek sorgulayabilirsiniz

## Örnek Kullanımlar

- "Hava durumu nasıl?" → Bulunduğunuz konumun hava durumu
- "İstanbul'da hava nasıl?" → İstanbul'un hava durumu
- "Bugün yağmur yağacak mı?" → Güncel hava durumu ve tahmin
- "Sıcaklık kaç derece?" → Mevcut sıcaklık bilgisi

