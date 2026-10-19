# Mimari

Bu doküman hedef mimariyi anlatır. Hangi parçanın şu an kodda olduğu `docs/security.md` sonundaki durum tablosunda ve `docs/roadmap.md` içinde işaretlidir.

## Tasarım ilkeleri

1. **Yerel öncelikli:** Her şey evdeki sunucuda çalışır. Üçüncü taraf bulut zorunlu değil. İnternet kesilince ev ağında kontrol sürer.
2. **Tek giriş kapısı:** İstemciler yalnızca bizim sunucumuzla konuşur. Home Assistant (HA) hiçbir istemciye ve internete açılmaz.
3. **En az yetki:** Her kullanıcı ve cihaz, yalnızca ihtiyacı olan işlemi yapabilir.
4. **Komutlar izinli listeyle sınırlı:** İstemci keyfi HA servis çağrısı yapamaz. Her cihaz türü için izinli komutlar ve değer aralıkları sunucuda tanımlıdır.
5. **Gizli bilgi istemcide durmaz:** HA token'ı yalnızca sunucudadır.

## Güven sınırları

```
 İSTEMCİLER (güvenilmez)                 SUNUCU (güvenilir çekirdek)           CİHAZ ÇEVRESİ
┌────────────────────────┐   TLS     ┌──────────────────────────────┐   ┌──────────────────┐
│ iOS tarayıcı uygulaması│──────────▶│  Gateway API (apps: server)  │──▶│  Home Assistant  │
│ Web / mobil / masaüstü │◀──────────│  - kimlik doğrulama          │   │  (sadece sunucu  │
└────────────────────────┘ WebSocket │  - yetkilendirme (rol)       │   │   erişebilir)    │
        ▲                            │  - komut politikası          │   └────────┬─────────┘
        │ Tailscale (uzaktan)        │  - tarama doğrulama          │            │ MQTT / Zigbee /
        │ veya ev ağı (yerel)        │  - denetim günlüğü           │            │ Wi-Fi / IR
                                     └──────────────────────────────┘     Klima, LED, robot, priz
```

Sınırlar:
- **İstemci ile sunucu arası:** Tüm girdi güvenilmez kabul edilir ve doğrulanır.
- **Sunucu ile HA arası:** Yalnızca sunucu HA token'ını tutar. HA'ya ağ erişimi sunucuyla sınırlıdır.
- **HA ile cihazlar arası:** HA'nın sorumluluğu. Cihazlar ayrı bir IoT ağında tutulmalı.

## Bileşenler

| Bileşen | Klasör | Sorumluluk |
|---|---|---|
| Gateway sunucu | `server/` | Kimlik, yetki, komut politikası, tarama kaydı, HA köprüsü |
| Tarayıcı uygulaması | `apps/scanner-ios/` | RoomPlan ile odaları tarar, birleştirir, dışa aktarır (henüz yok) |
| 3D arayüz | `apps/web/` | Evi çizer, cihazlara tıklayınca komut gönderir (henüz yok) |
| HA yapılandırması | `homeassistant/` | Kurulum notları ve örnekler |
| Özel cihazlar | `firmware/esp32/` | ESP32 ile LED, IR verici (henüz yok) |

## Ev kurulum akışı (telefonla tarama)

1. Kullanıcı iPhone'da tarayıcı uygulamasını açar ve sunucuya eşleşir (tek kullanımlık kod, bkz. `security.md`).
2. Her odayı sırayla tarar. Odalar arasında AR oturumu açık tutulur, böylece Apple'ın çerçevesi odaları ortak koordinat uzayında birleştirebilir.
3. Uygulama sonucu iki biçimde dışa aktarır: USDZ model ve yapılandırılmış JSON (oda, duvar, kapı, pencere, nesne). Önce JSON yükleme uçta desteklenir (`POST /scans`).
4. Sunucu JSON'u şemaya göre doğrular ve saklar.
5. Kullanıcı, tarama sonucundaki oda ve nesneler üzerinde cihaz yerleşimini onaylar (klima hangi duvarda vb.). Önerileri yapay zeka verebilir, son karar kullanıcıda.
6. Web arayüzü evi bu veriden çizer.

> Odaların birleştirilmesi geometrik bir işlemdir ve Apple'ın RoomPlan `StructureBuilder` sınıfı bunu yapar. Yapay zeka, oda adlandırma, hizalama hatası tespiti ve cihaz yerleşim önerisi gibi yardımcı işler içindir.

## Gerçek zamanlı akış

- İstemci WebSocket'e kısa ömürlü bilet ile bağlanır.
- Sunucu HA `state_changed` olaylarına abone olur, olayları kullanıcının yetkisine göre süzüp iletir.
- Komutlar REST ile gider, sonuç durum olayıyla geri döner.

## Sınırlar ve bilinen kısıtlar

- Klima IR ile kontrol edilirse gerçek oda sıcaklığı okunamaz, arayüz son gönderilen komutu gösterir.
- RoomPlan LiDAR'lı iOS cihaz ister. Android için tarama ayrı bir iş.
- Robot süpürgenin harita ve konum verisini 3D sahneye taşımak özel geliştirme gerektirir.
