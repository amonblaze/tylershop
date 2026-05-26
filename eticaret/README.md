# 🛍️ TylerShop — E-Ticaret Ürün Açıklama Üretici

**DeepSeek AI** ile saniyeler içinde SEO uyumlu, satış odaklı ürün açıklamaları oluşturun.

## ✨ Özellikler

- **Tek Ürün Üretimi**: Adını ve kategorisini girin, AI açıklamayı yazsın
- **Ton Seçimi**: Profesyonel, samimi, lüks veya enerjik stil
- **SEO Önizleme**: Oluşan açıklamanın Google'da nasıl görüneceğini görün
- **Toplu CSV Üretimi**: 50 ürüne kadar tek seferde CSV yükleyip açıklama oluşturun
- **CSV İndir**: Toplu sonuçları CSV olarak dışa aktarın
- **Kredi Sistemi**: 3 ücretsiz deneme, sonra paket satın al

## 🚀 Hızlı Başlangıç

### 1. DeepSeek API Key Alın

1. [platform.deepseek.com](https://platform.deepseek.com/) adresine gidin
2. Kaydolun ve oturum açın
3. API Keys sayfasından yeni bir key oluşturun
4. Bakiyenize ufak bir miktar yükleyin (DeepSeek çok uygun fiyatlı)

### 2. API Key'i Yapılandırın

`app.js` dosyasını açın ve şu satırı bulun:

```js
DEEPSEEK_API_KEY: 'sk-your-deepseek-api-key-here',
```

Bunu kendi API key'inizle değiştirin:

```js
DEEPSEEK_API_KEY: 'sk-...',
```

### 3. Çalıştırın

#### Seçenek A: Direkt tarayıcıda aç (local)

```bash
open index.html
```

#### Seçenek B: Python ile basit sunucu (önerilir)

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Tarayıcıdan: `http://localhost:8000`

#### Seçenek C: VS Code Live Server

VS Code'da `Live Server` eklentisini kurun, `index.html`'e sağ tıklayıp "Open with Live Server" seçin.

## 📁 Proje Yapısı

```
tyler_shop/eticaret/
├── index.html    # Ana uygulama sayfası
├── index.css     # Stil dosyası
├── app.js        # Tüm iş mantığı
└── README.md     # Bu dosya
```

## 💰 Fiyatlandırma

| Paket | Fiyat | Açıklama |
|-------|-------|----------|
| Deneme | Ücretsiz | 3 ürün açıklaması |
| Mini | 99 TL | 50 ürün |
| Pro | 249 TL | 200 ürün |
| Ultra | 499 TL/ay | Sınırsız |

## 🌐 Deploy

### Vercel (önerilen)

```bash
# Vercel CLI yoksa:
npm install -g vercel

# Deploy
cd tyler_shop/eticaret
vercel --prod
```

### Netlify

1. `tyler_shop/eticaret/` klasörünü Netlify Drag & Drop ile yükleyin
2. Veya Git repo bağlayın

### Cloudflare Pages

1. Cloudflare Dashboard > Pages > Create
2. Proje klasörü olarak `tyler_shop/eticaret/` seçin
3. Build ayarı yok, direkt deploy

## 🔧 Notlar

- **API Key güvenliği**: Bu sürümde API key frontend'de gömülüdür. Production'da bir backend proxy kullanmanız önerilir.
- **Ödeme sistemi**: Manuel IBAN/EFT bazlıdır. Ödeme onayı sonrası localStorage'a kredi eklenir. Production'da Stripe/Iyzico entegrasyonu önerilir.
- **Veri depolama**: Kullanım ve kredi bilgileri localStorage'da saklanır. Tarayıcı temizlenirse kaybolur.
- **CSV Formatı**: İlk sütun `ürün_adı` (zorunlu), ikinci sütun `kategori` (isteğe bağlı). UTF-8 encoding.

## 🧪 Test

```bash
# Tüm dosyaların varlığını kontrol et
ls -la tyler_shop/eticaret/

# Dosya boyutları
du -h tyler_shop/eticaret/*
```

## 📞 İletişim

Sorun yaşarsanız: destek@tylershop.app

---

*TylerShop — Yapay Zeka ile Daha Akıllı E-Ticaret*
