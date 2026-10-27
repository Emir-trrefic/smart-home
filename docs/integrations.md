# Cihaz entegrasyon yolları

Kullanıcıların hangi marka cihazı olduğu belli değil. Bu yüzden tek bir markaya bağlanmak yerine, cihazlara ulaşan **sağlayıcı adaptörleri** kuruyoruz. Ürün modeli sağlayıcıdan bağımsızdır (`provider` ve `externalId` alanları).

| Yol | Nasıl çalışır | Durum | Dikkat |
|---|---|---|---|
| **Home Assistant + bridge** | Evde HA, yanında bizim bridge aracısı. Bridge buluta dışarı doğru bağlanır. | HA komut çeviri katmanı kodda ve testli. **Bridge yazılmadı.** | Kullanıcının bir HA kurması gerekir, teknik kullanıcıya uygun. Geniş marka kapsamı. |
| **Matter, telefondan doğrudan** | iOS'ta MatterSupport çerçevesi ile cihaz kendi ekosistemimize eklenir. Android'de Google Home APIs. | Araştırıldı, kod yok. | iOS için bir uygulama uzantısı (extension) ve yetkilendirmeler gerekir, Expo Go'da çalışmaz, özel derleme ister. Google Home APIs erişimi bekleme listesi ve sertifikasyon ister (2024 duyurusu, güncel durumu doğrulanmadı). |
| **Bulut sağlayıcılar** (Tuya, SmartThings, Google Home vb.) | Kullanıcı hesabını OAuth ile bağlar, sunucu sağlayıcı API'sini çağırır. | **Doğrulanmadı.** Tuya araştırması işe yarar sonuç vermedi, SmartThings dokümanı açılmadı. | Her sağlayıcının kendi onay süreci ve kullanım koşulları var, araştırılması gerekir. |

## Neden önce Home Assistant?

- Birçok marka ve protokolü tek yerde toplar, cihaz türlerimizle uyumlu varlıklar (`light`, `climate`, `fan`, `media_player`, `vacuum`) sunar.
- Komut çevirisi basit: komut ve parametre adları servis ve alan adlarıyla aynı, bu yüzden katalog doğrudan eşleşir.
- Ürünün tek sağlayıcıya kilitlenmemesi için yine de model sağlayıcıdan bağımsız tutuldu.

## Matter notları

Matter sertifikasyon tablosunda termostat, oda klimaları, fan, hava temizleyici, robot süpürge ve TV/oynatıcı cihaz türleri var. Radyatör için ayrı bir tür yok, termostat üzerinden gidiyor. ([Matter el kitabı](https://handbook.buildwithmatter.com/how-it-works/device-types/))

iOS tarafında MatterSupport ile bir uygulama, Matter cihazlarını kendi ekosistemine ekleyebilir. Bunun için uygulama bir uzantı hedefi ve Bonjour servis tanımları gerektirir. ([Apple dokümanı](https://developer.apple.com/documentation/mattersupport/adding-matter-support-to-your-ecosystem.md))

Google Home APIs: üçüncü taraf uygulamalara cihaz erişimi ve Matter cihaz ekleme sunuyor, ancak erişim bekleme listesi, sertifikasyon ve kullanıcı izni şartlı. Kaynak 2024 tarihli, günümüzdeki durumu doğrulanmadı. ([Google blog](https://developers.googleblog.com/en/home-apis-enabling-all-developers-to-build-for-the-home/))

## Home Assistant tarafı

- Robot süpürge: başlat, duraklat, durdur, şarja dön, bulma gibi özellikler ayrı bayraklarla tanımlı, her robot hepsini desteklemez. ([vacuum](https://developers.home-assistant.io/docs/core/entity/vacuum))
- Fan: hız yüzdesi, hazır mod, salınım. ([fan](https://developers.home-assistant.io/docs/core/entity/fan))
- TV: `media_player` güç, ses, kaynak seçimi, oynat/duraklat sunar. ([media_player](https://www.home-assistant.io/components/media_player))
- Kalorifer/kombi: OpenTherm Gateway entegrasyonu ayrı donanım ister, hangi kombilerle uyumlu olduğu dokümanda yok. ([OpenTherm Gateway](https://www.home-assistant.io/integrations/opentherm_gw))

## Açık sorular

1. Bridge'in teknik biçimi: Home Assistant eklentisi mi, bağımsız bir Docker konteyneri mi, ikisi de mi?
2. Bulut sağlayıcılardan hangisi hedef kitle için öncelikli (Türkiye'de yaygın markalar araştırılmalı)?
3. Android'de Matter ekleme için Google Home APIs erişimi alınabilir mi?
