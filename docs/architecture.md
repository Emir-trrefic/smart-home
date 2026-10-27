# Mimari (v2: çok kullanıcılı, mobil öncelikli)

## Kapsam

Her kullanıcının kendi **mekânları** (ev, ofis, diğer) olur. Her mekânın kendi 3D planı ve cihazları vardır. Mekânlar aile, arkadaş veya çalışanlarla davetle paylaşılabilir. Öncelik mobil uygulama (iOS ve Android), web ve masaüstü sonra gelir.

> **v1'den değişiklik:** İlk taslak tek evlik, kendi sunucunda çalışan bir sistemdi. Bu doküman çok kullanıcılı ürün varsayımıyla yeniden yazıldı. Eski kararların ne olduğu [decisions.md](decisions.md) içinde.

## İlkeler

1. **Mobil öncelikli.** İlk istemci telefon uygulaması. Sunucu API'si buna göre tasarlanır.
2. **Sunucu tek yetki kapısı.** İstemciler yalnızca bizim sunucumuzla konuşur. Cihaz sistemlerine (Home Assistant vb.) hiçbir istemci doğrudan bağlanmaz.
3. **Kiracı izolasyonu.** Her kaynak (cihaz, tarama, üyelik) bir mekâna bağlıdır. Her istekte çağıranın o mekândaki üyeliği kontrol edilir. Üye olmayan kişi mekânın varlığını bile öğrenemez (404).
4. **Komutlar izinli listeyle sınırlıdır.** İstemci serbest servis çağrısı yapamaz. Her cihaz türünün komutları ve parametre sınırları katalogda tanımlıdır.
5. **Sağlayıcıdan bağımsız.** Cihazlara hangi yoldan ulaşıldığı (Home Assistant, Matter, bulut API'leri) bir adaptörün işidir. Ürün modeli buna bağlı değildir.
6. **Sunucu kullanıcının verdiği adrese istek atmaz.** Kullanıcıdan alınan bir URL'ye sunucudan istek göndermek SSRF riskidir. Evdeki bağlantı, evden dışarı doğru kurulur (bridge).
7. **Gizlilik baştan.** Ev planı kişisel veridir. Veri azaltma ve KVKK uyumu tasarımın parçasıdır ([privacy.md](privacy.md)).
8. **Gizli bilgi evden çıkmaz.** Cihaz sistemi anahtarları (ör. Home Assistant token'ı) bridge'de kalır, bulutta tutulmaz.

## Katmanlar

```
 İSTEMCİLER                     BULUT (gateway)                     MEKÂN (ev / ofis)
┌───────────────────┐  TLS   ┌──────────────────────────┐  giden   ┌─────────────────────┐
│ Mobil (iOS, And.) │───────▶│ kimlik · üyelik · roller │◀─bağlantı│ Bridge aracısı      │
│ Web / PC (sonra)  │◀───────│ komut politikası         │ (planlı) │  └▶ Home Assistant  │
└───────────────────┘ olaylar│ mekân · cihaz · tarama   │          │      └▶ cihazlar    │
                     (planlı)└──────────────────────────┘          └─────────────────────┘
                                         ▲
                       Doğrudan sağlayıcılar (Matter, bulut API'leri): planlı
```

## Alan modeli

```
Kullanıcı ──(Üyelik: owner | member | guest)──▶ Mekân ──▶ Kat ──▶ Oda ──▶ duvar, kapı, pencere, nesne
                                                  └────▶ Cihaz (tür, yetenekler, sağlayıcı bağlantısı, 3D konum)
```

- Roller **mekân başınadır**. Aynı kişi bir yerde owner, başka yerde guest olabilir.
- Belirteç (JWT) yalnızca kimliği taşır. Rol her istekte üyelik kaydından okunur, böylece üyelikten çıkarılan kişi hemen erişimini kaybeder.
- Ayrıntı: [data-model.md](data-model.md)

## Komut akışı (kodda bugün)

1. İstemci `POST /places/:placeId/devices/:deviceId/command` çağırır.
2. Belirteç doğrulanır, çağıranın o mekândaki üyeliği yüklenir (üye değilse 404).
3. Cihaz **mekân kapsamında** aranır (başka mekânın cihaz kimliği 404 verir).
4. `resolveCommand`: rol izni, katalogda komut var mı, cihaz bu yeteneğe sahip mi, parametre sınırları.
5. Mekânın cihaz bağlantısı var mı (yoksa 409 `no_connection`).
6. Sağlayıcı çevirisi (Home Assistant için `translate.ts`) ve gönderim.
7. Denetim günlüğü: kim, hangi mekân ve cihaz, hangi komut. Parametre değerleri yazılmaz.

## Cihaz bağlantısı (bridge, planlı)

Evde (Home Assistant'ın yanında) çalışan küçük bir aracı, buluta **dışarı doğru** kalıcı bir bağlantı kurar. Sunucu komutu bu bağlantıdan iletir.

- Kullanıcı router'da port açmaz, sunucu kullanıcının adresine bağlanmaz (SSRF yok).
- Home Assistant token'ı evden çıkmaz.
- Her mekânın bridge belirteci ayrıdır ve iptal edilebilir.

Bridge yazılana kadar sunucu cihaz komutlarına 409 `no_connection` döner. Bunu aşmak için güvensiz bir kısayol bilinçli olarak eklenmedi.

## Ev kurulum akışı (telefonla tarama)

1. LiDAR'lı iPhone'da tarayıcı uygulaması her odayı tek tek tarar, odalar arasında AR oturumu açık kalır ki Apple'ın çerçevesi odaları ortak koordinatta birleştirebilsin.
2. Sonuç, yapılandırılmış JSON olarak (`ScanUploadSchema`) mekâna yüklenir: `POST /places/:placeId/scans`.
3. Kullanıcı oda adlarını düzeltir, cihazları odalara ve 3D konuma yerleştirir. Yapay zeka burada öneri verebilir, son karar kullanıcıda.
4. Arayüz evi bu veriden çizer.

> Odaları birleştirmek geometrik bir iştir ve Apple RoomPlan'ın `StructureBuilder` sınıfı bunu yapar. Yapay zekayı oda adlandırma, hizalama hatası tespiti ve cihaz yerleşim önerisi gibi yardımcı işlere koyuyoruz.

## Bileşenler

| Bileşen | Klasör | Durum |
|---|---|---|
| Ortak alan modeli ve komut kataloğu | `packages/domain` | Kodda, testli |
| Gateway sunucu | `server` | Kodda (bellek içi depolama), testli |
| Mobil uygulama | `apps/mobile` | Plan ve deneme (spike) listesi, kod yok |
| iOS tarayıcı | `apps/scanner-ios` | Planlı |
| Bridge aracısı | `apps/bridge` | Planlı |
| Web arayüzü | `apps/web` | Planlı |
| Home Assistant notları | `homeassistant` | Notlar |

## Bilinen kısıtlar ve açık sorular

- **İnternet kesilince ne olacak?** v1'deki "yerel öncelikli" ilke, bulut tabanlı çok kullanıcılı modelle çelişiyor. Bridge'in ev ağında yerel bir API sunması mümkün ama tasarlanmadı. Açık soru.
- **Kimlik yönetimi eksik:** Açık kayıt (e-posta doğrulamalı), parola sıfırlama, yenileme belirteci, hesap ve mekân silme henüz yok. Şimdilik hesap açmak davetle veya tek seferlik kurulum belirteciyle.
- **Klima IR ile bağlanırsa** gerçek oda sıcaklığı okunamaz.
- **RoomPlan LiDAR ister.** Android'de tarama için ayrı bir çözüm gerekir.
- **Robot haritasını 3D sahneye taşımak** özel geliştirme ister.
- **Sunucu barındırma yeri** (Türkiye içi veya dışı) KVKK açısından karar bekliyor, bkz. [privacy.md](privacy.md).
