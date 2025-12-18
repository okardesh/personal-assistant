# Device Code Flow Hatası Düzeltme

Device Code Flow çalışması için uygulamanın "public client" olarak işaretlenmesi gerekiyor.

## Azure Portal'da Düzeltme

1. **Azure Portal** → **App registrations** → **Personal Assistant**
2. Sol menüden **Manifest** bölümüne gidin
3. Manifest JSON'da şu property'yi bulun veya ekleyin:
   ```json
   "publicClient": true
   ```
4. **Save** butonuna tıklayın

## Alternatif: Authentication Sayfasından

1. **Authentication** sayfasına gidin
2. **Allow public client flows** toggle'ını **Enabled** yapın (zaten enabled olabilir)
3. **Save** butonuna tıklayın

Bu ayar, Device Code Flow'un çalışması için gereklidir.

