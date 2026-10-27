# @smart-home/domain

Sunucunun, mobil uygulamanın ve web arayüzünün ortak kullandığı alan modeli. Tek doğruluk kaynağı burasıdır.

- **Mekân (place):** ev, ofis gibi kullanıcıya ait yer, rolleri (`owner`, `member`, `guest`) ve davet rolleri
- **Tarama şeması:** iOS tarayıcının gönderdiği kat, oda, duvar, kapı, pencere, nesne verisi
- **Cihaz:** türü (`kind`), sağlayıcı bağlantısı, yetenekleri
- **Komut kataloğu:** her cihaz türü için izinli komutlar ve parametre sınırları. Sunucu bunu doğrulamada, mobil uygulama kontrolleri çizmede kullanır.
- **Rol izinleri:** hangi rol hangi cihaz türünü kontrol edebilir

Bu paket yalnızca saf TypeScript ve `zod` içerir, ağ veya depolama erişimi yoktur.

```
npm test        # birim testleri
npm run typecheck
```
