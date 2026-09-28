# Lara Smile — Teklif Uygulaması

Telefondan hızlı fiyat teklifi hazırlama: adet gir, toplam otomatik hesaplansın, PDF / Word / web linki olarak gönder.

## Yayınlama (GitHub Pages)
1. Bu klasördeki tüm dosyaları yeni bir GitHub reposuna yükleyin.
2. Settings → Pages → Branch: `main`, klasör: `/ (root)` → Save.
3. Birkaç dakika sonra `https://KULLANICI.github.io/REPO/` adresinde yayında.
4. Telefonda Safari/Chrome ile açıp "Ana Ekrana Ekle" deyin.

## Dosyalar
- `data/prices.js` — varsayılan fiyat listesi. Güncellerken `version` değerini değiştirin.
- `data/config.js` — telefon, e-posta, web, adres, alt not, logo yolu.
- `assets/logos/` — şube logoları (`lara-smile.png`, `lara-smile-premium.png`). Değiştirmek için aynı adla yeni PNG yükleyin.

## Teklife özel fiyat
Tedavi seçildiğinde satırın altındaki fiyat kutusundan sadece o teklif için birim fiyat değiştirilebilir (liste fiyatı değişmez).

## Fiyat güncelleme
Uygulamadaki "Fiyatlar" sekmesinde yapılan değişiklikler o cihaza kaydedilir.
Tüm cihazlar için: "prices.js indir" → GitHub'da `data/prices.js` dosyasını bununla değiştirin.
