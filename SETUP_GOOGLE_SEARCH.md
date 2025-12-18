# Google Search Entegrasyonu

Konum bazlı etkinlik araması için Google API entegrasyonu.

## Seçenekler

İki seçenek var:

### 1. Google Custom Search API (Önerilen)

1. [Google Cloud Console](https://console.cloud.google.com) adresine gidin
2. Yeni bir proje oluşturun veya mevcut projeyi seçin
3. **APIs & Services** > **Library** bölümüne gidin
4. "Custom Search API" arayın ve etkinleştirin
5. **APIs & Services** > **Credentials** bölümüne gidin
6. **Create Credentials** > **API Key** seçin
7. API key'i kopyalayın

8. [Programmable Search Engine](https://programmablesearchengine.google.com/) adresine gidin
9. Yeni bir search engine oluşturun
10. "Sites to search" kısmına `*` yazın (tüm web'i aramak için)
11. Search engine ID'yi kopyalayın

`.env.local` dosyasına ekleyin:
```env
GOOGLE_CUSTOM_SEARCH_API_KEY=your-api-key-here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=35d263023e4bf47d4
```

**Not:** Search Engine ID'niz: `35d263023e4bf47d4` (zaten mevcut)

### 2. Google Places API

1. [Google Cloud Console](https://console.cloud.google.com) adresine gidin
2. Yeni bir proje oluşturun veya mevcut projeyi seçin
3. **APIs & Services** > **Library** bölümüne gidin
4. "Places API" arayın ve etkinleştirin
5. **APIs & Services** > **Credentials** bölümüne gidin
6. **Create Credentials** > **API Key** seçin
7. API key'i kopyalayın

`.env.local` dosyasına ekleyin:
```env
GOOGLE_PLACES_API_KEY=your-api-key-here
```

## Kullanım

"Etrafımda bir event var mı?" gibi sorularda:
1. Önce takviminizdeki etkinlikler kontrol edilir
2. Konum izni verilirse, Google'da yakınınızdaki etkinlikler aranır
3. Sonuçlar birleştirilir ve gösterilir

## Notlar

- Google Custom Search API günlük 100 ücretsiz arama yapmanıza izin verir
- Google Places API ücretlidir (ilk $200 ücretsiz)
- İki API key'den biri yeterlidir, ikisi de varsa Custom Search önceliklidir

