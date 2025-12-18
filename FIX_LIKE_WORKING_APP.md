# Çalışan Uygulama Ayarlarını Uygulama

"Supabase Invite Email" uygulaması çalışıyor. Aynı ayarları Personal Assistant için uygulayalım.

## Farklar

**Çalışan Uygulama (Supabase Invite Email):**
- `signInAudience`: "AzureADMyOrg" (Single tenant)
- `allowPublicClient`: YOK (false)
- `publisherDomain`: "linktera.com"

**Personal Assistant (Şu anki):**
- `signInAudience`: "AzureADandPersonalMicrosoftAccount" (Multitenant)
- `allowPublicClient`: true
- `publisherDomain`: "linktera.com"

## Çözüm: Personal Assistant'ı Single Tenant Yap

### 1. Manifest'i Güncelle

1. Azure Portal → App registrations → **Personal Assistant Native**
2. **Manifest** sayfasına gidin
3. Şu değişiklikleri yapın:
   ```json
   "signInAudience": "AzureADMyOrg",
   ```
   `allowPublicClient` property'sini kaldırın veya `false` yapın (eğer varsa)

4. **Save** butonuna tıklayın

### 2. Authentication Ayarları

1. **Authentication** sayfasına gidin
2. **Supported account types** bölümünde:
   - **"Accounts in this organizational directory only (Single tenant)"** seçeneğini seçin
3. **Allow public client flows** toggle'ını **Disabled** yapın
4. **Save** butonuna tıklayın

### 3. Tenant ID'yi Güncelle

`.env.local` dosyasında:
```env
OUTLOOK_TENANT_ID=2f0bdff1-ba33-4bc6-90a4-4f5c7107f997
```
(`common` yerine specific tenant ID kullanın)

## Not

Single tenant yapınca:
- ✅ Sadece kendi organizasyonunuzdaki hesaplar kullanabilir
- ✅ Admin consent gereksinimi azalabilir
- ❌ Kişisel Microsoft hesapları çalışmaz (ama şirket takvimi için sorun değil)

