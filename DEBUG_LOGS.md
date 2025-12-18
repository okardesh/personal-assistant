# Debug Log'ları Nasıl Görülür?

## Server-Side Log'lar (Terminal)

1. **Terminal penceresini bulun:**
   - `npm run dev` komutunu çalıştırdığınız terminal penceresi
   - Veya Cursor'da terminal sekmesi

2. **Log'ları göreceksiniz:**
   - `Principal response: ...` - Principal URL discovery sonucu
   - `Found principal URL: ...` - Bulunan principal URL
   - `Calendar home response: ...` - Calendar home discovery sonucu
   - `Found calendar home URL: ...` - Bulunan calendar home URL
   - `CalDAV XML response length: ...` - CalDAV yanıtının uzunluğu
   - `CalDAV XML response (first 500 chars): ...` - İlk 500 karakter
   - `Combined iCalendar data length: ...` - Parse edilen iCalendar verisi
   - `Parsed events count: ...` - Parse edilen etkinlik sayısı
   - `Event "..." on ... - Today: true/false` - Her etkinlik için tarih kontrolü
   - `Filtered events count: ...` - Filtrelenmiş etkinlik sayısı

3. **Hata durumunda:**
   - `CalDAV request failed: ...` - CalDAV isteği başarısız
   - `Error response: ...` - Hata yanıtı
   - `No calendar-data found in XML response` - XML'de calendar-data bulunamadı
   - `Calendar home discovery failed: ...` - Calendar home discovery başarısız

## Client-Side Log'lar (Tarayıcı)

1. **Developer Tools'u açın:**
   - Mac: `Cmd + Option + I`
   - Windows/Linux: `F12` veya `Ctrl + Shift + I`

2. **Console sekmesine gidin**

3. **API hatalarını göreceksiniz:**
   - Network sekmesinde API isteklerini görebilirsiniz
   - Console'da JavaScript hatalarını görebilirsiniz

## Test Adımları

1. Terminal'de server'ın çalıştığından emin olun
2. Tarayıcıda `http://localhost:3000` adresine gidin
3. "Bugün takvimimde ne var?" yazın
4. Terminal'deki log'ları kontrol edin
5. Hata varsa, log'ları kopyalayıp paylaşın

