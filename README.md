# Lara Smile Teklif

Telefondan kullanılmak üzere tasarlanmış fiyat teklifi sitesi. Sunucu gerekmez, GitHub Pages'te çalışır.

## GitHub'da yayınlama

1. GitHub'da yeni bir repo aç ve bu klasörün içindeki her şeyi yükle.
2. Settings > Pages > Branch: `main` / root > Save.
3. Birkaç dakika sonra `kullaniciadi.github.io/repo-adi` adresinde yayında olur.
4. Telefonda aç, Paylaş > "Ana Ekrana Ekle" de. Uygulama gibi açılır.

## Dosyalar

- `data/prices.js`: varsayılan fiyat listesi. Değiştirip yüklersen tüm cihazlar açılışta yeni listeyi fark eder. `version` tarihini güncelle.
- `data/config.js`: telefon, e-posta, web sitesi, adres, alt not, grup şirketleri ve logo yolları.
- `assets/logos/`: logo dosyaları. Yolu `data/config.js` içindeki `logos` bölümüne yaz. Ya da Ayarlar sekmesinden cihazda yükle.
- `sw.js`: çevrimdışı çalışma. Siteyi güncellediğinde `CACHE` adındaki sürümü artır (`lsq-v2` gibi).

## Fiyat güncelleme

Fiyatlar sekmesinde değişiklik bu cihazda kalır. Tüm cihazlar için: "prices.js indir" dosyasını GitHub'daki `data/prices.js` ile değiştir. Elle değişiklik yapılmış cihazlar yeni listeyi alırken önce sorar.

Excel'den yükleme: ilk satırda `Treatment`, `GBP`, `EUR` başlıkları olan bir dosya yeterli.
