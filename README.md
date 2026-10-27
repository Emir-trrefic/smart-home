# Smart Home 3D

Evdeki ve ofisteki akıllı cihazları (klima, kalorifer, robot süpürge, hava temizleyici/havalandırıcı, TV, ışık, priz) tek uygulamadan yöneten, mekânın 3D modeli üzerinden oyun gibi kontrol edilen ürün. Her kullanıcının kendi mekânları olur (ev, ofis), aile ve çalışanlarla davetle paylaşılabilir. Öncelik mobil uygulama, sonra web ve masaüstü.

> **Durum:** Temel hazır, mobil uygulama henüz yok. Ortak alan modeli ve sunucu yazıldı, CI'da tip kontrolü ve testler yeşil. Cihaz bağlantısı (bridge), mobil uygulama, iOS tarayıcı ve 3D arayüz planlı. Dürüst durum listesi: [docs/security.md](docs/security.md) sonundaki tablo ve [docs/roadmap.md](docs/roadmap.md).

## Nasıl çalışır (özet)

```
Mobil / Web  ──▶  Gateway sunucu  ◀── giden bağlantı ──  Bridge (evde)  ──▶  Home Assistant ──▶ cihazlar
 (istemciler)     kimlik · roller · komut politikası       (planlı)
```

- İstemciler yalnızca gateway ile konuşur, cihaz sistemlerine doğrudan bağlanmaz.
- Her şey **mekâna** bağlı, roller mekân başına (`owner`, `member`, `guest`), üye olmayan kişi mekânı göremez.
- Komutlar izinli kataloğa bağlı, cihaz türüne göre sınırlı (ör. kalorifer 5-28 °C).
- Cihazlara ulaşma yolu bir adaptördür (şimdilik Home Assistant), marka bağımsız.
- Ev, LiDAR'lı iPhone ile oda oda taranır, yapılandırılmış veri olarak yüklenir.

Ayrıntı: [docs/architecture.md](docs/architecture.md)

## Klasörler

| Klasör | İçerik | Durum |
|---|---|---|
| `packages/domain/` | Ortak şemalar, komut kataloğu, rol izinleri | Kodda |
| `server/` | Gateway sunucu | Kodda (bellek içi depolama) |
| `apps/ios/` | iOS uygulaması (Swift, SwiftUI, SceneKit) | İskelet kodda: giriş, mekânlar, 3D görünüm, cihaz paneli |
| RoomPlan tarayıcı | `apps/ios` içinde ayrı hedef olarak | Planlı |
| `apps/web/` | Web arayüzü | Planlı |
| `homeassistant/` | Home Assistant notları | Notlar |
| `firmware/esp32/` | Kendi cihazlarımız (LED, IR verici) | Planlı |
| `docs/` | Mimari, güvenlik, veri modeli, kararlar, entegrasyonlar, gizlilik | Yazıldı |

## Dokümanlar

- [Mimari](docs/architecture.md)
- [Mimari kararlar](docs/decisions.md) (hangileri değişti, hangileri onay bekliyor)
- [Veri modeli ve API](docs/data-model.md)
- [Güvenlik](docs/security.md) (tehdit modeli, bilinen eksikler)
- [Entegrasyon yolları](docs/integrations.md)
- [Gizlilik ve KVKK](docs/privacy.md)
- [Cihaz notları](docs/devices.md)
- [Yol haritası](docs/roadmap.md)

## Geliştirme

```
npm install
npm test
npm run typecheck
```

## Güvenlik notu

Şifreler, API anahtarları ve token'lar asla depoya yazılmaz. `.env` dosyaları `.gitignore` içindedir, örnek değerler `.env.example` dosyalarındadır. CI'da gizli bilgi taraması çalışır.
