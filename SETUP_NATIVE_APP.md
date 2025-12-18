# Native Uygulama Kaydı - Device Code Flow için

Device Code Flow'un çalışması için native/mobile uygulama kaydı oluşturmamız gerekiyor.

## Azure Portal'da Yeni Native Uygulama Kaydı

### 1. Yeni Uygulama Kaydı Oluşturun

1. [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations**
2. **New registration** butonuna tıklayın
3. Uygulama bilgilerini girin:
   - **Name**: Personal Assistant Native (veya farklı bir isim)
   - **Supported account types**: **"Accounts in any organizational directory and personal Microsoft accounts"** seçin
   - **Redirect URI**: Bu alanı boş bırakın (native uygulamalar için gerekli değil)
4. **Register** butonuna tıklayın

### 2. API Permissions Ekleme

1. Sol menüden **API permissions** bölümüne gidin
2. **Add a permission** > **Microsoft Graph** > **Delegated permissions** seçin
3. Şu izinleri ekleyin:
   - `Calendars.Read`
   - `offline_access`
4. **Add permissions** butonuna tıklayın

### 3. Authentication Ayarları

1. **Authentication** sayfasına gidin
2. **Allow public client flows** toggle'ını **Enabled** yapın
3. **Save** butonuna tıklayın

### 4. Client ID'yi Kopyalayın

1. **Overview** sayfasına gidin
2. **Application (client) ID** değerini kopyalayın
3. Bu yeni Client ID'yi `.env.local` dosyasına ekleyin

## .env.local Güncelleme

Yeni native uygulama için Client ID'yi kullanın:

```env
OUTLOOK_CLIENT_ID=yeni-native-app-client-id
OUTLOOK_CLIENT_SECRET=  # Native uygulamalar için secret gerekmez
OUTLOOK_TENANT_ID=common
```

**Not**: Native uygulamalar için Client Secret gerekmez!

## Test

1. Development server'ı yeniden başlatın
2. `http://localhost:3000/device-auth` sayfasına gidin
3. "Start Authentication" butonuna tıklayın
4. Artık Device Code Flow çalışmalı!

