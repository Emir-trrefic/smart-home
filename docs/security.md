# Güvenlik

Evin cihazlarını kontrol eden ve evin planını saklayan bir sistem. İki şey korunuyor: **fiziksel kontrol** (klima, robot, kilit gibi cihazlar) ve **mahremiyet** (evin yerleşimi, kullanım alışkanlıkları).

## Tehdit modeli

| # | Tehdit | Önlem |
|---|---|---|
| T1 | İnternetten gelen yetkisiz erişim | HA internete açılmaz. Uzaktan erişim yalnızca Tailscale. Router'da port açılmaz. Sunucu varsayılan olarak yalnızca `127.0.0.1` dinler. |
| T2 | Çalınan veya tahmin edilen parola | Parolalar scrypt ile saklanır, en az 12 karakter. Giriş uç noktasında hız sınırı. Kullanıcı yokken de aynı sürede hash hesaplanır (kullanıcı adı sızdırmaz). |
| T3 | Çalınan erişim anahtarı | Kısa ömürlü JWT (15 dk), sabit algoritma (HS256), `iss` ve `aud` kontrolü. |
| T4 | İstemciden keyfi cihaz komutu | Komut izinli listesi. Cihaz türü başına izinli komutlar ve değer aralıkları (ör. klima 16-30 °C). Bilinmeyen komut reddedilir. |
| T5 | Yetki yükseltme | Roller: `owner`, `member`, `guest`. Her komut rol ve cihaz türüne göre kontrol edilir. |
| T6 | HA token'ının sızması | Token yalnızca sunucu ortam değişkeninde. Depoya yazılmaz, istemciye gönderilmez, günlüğe düşmez. |
| T7 | Kötü niyetli tarama dosyası | Katı şema doğrulama (tip, uzunluk, sınırlar), istek gövdesi boyut sınırı. Dosya içeriği çalıştırılmaz. |
| T8 | İlk kurulumda sahiplik kapma | İlk `owner` yalnızca sunucuda tanımlı tek seferlik `BOOTSTRAP_TOKEN` ile oluşturulur. Kullanıcı varsa uç nokta kapanır. |
| T9 | Hata mesajlarından bilgi sızması | Genel hata mesajları, ayrıntı yalnızca sunucu günlüğünde. |
| T10 | Bağımlılık zinciri saldırısı | Kilit dosyası, Dependabot, CI'da gizli bilgi taraması. |
| T11 | Veri kaybı veya gizlilik | Veri evdeki sunucuda tutulur, üçüncü taraf buluta gitmez. Yedekler şifreli olmalı (planlı). |

## Kimlik doğrulama

- **Kullanıcı:** kullanıcı adı + parola → kısa ömürlü JWT. Planlı: dönen yenileme belirteci ve passkey desteği.
- **Tarayıcı uygulaması eşleşmesi (planlı):** Sunucu tek kullanımlık, kısa ömürlü bir eşleşme kodu (QR) üretir. Uygulama kodu verip cihaz belirteci alır. Cihaz belirteci yalnızca tarama yüklemeye yetkilidir ve iptal edilebilir.

## Yetkilendirme

| Rol | Yapabilecekleri |
|---|---|
| `owner` | Her şey: kullanıcı ve cihaz yönetimi, tarama, tüm cihazları kontrol |
| `member` | Tarama yükleme, cihazları kontrol |
| `guest` | Yalnızca ışık kontrolü |

Roller basit tutuldu. Oda bazlı yetki (ör. misafir yalnızca salonu kontrol eder) planlı.

## Komut politikası

`server/src/policy/commands.ts` içinde. İstemci HA servis adı göndermez, yalnızca anlamlı bir komut gönderir:

| Cihaz türü | Komut | Parametre sınırı |
|---|---|---|
| `light` | `turn_on`, `turn_off` | parlaklık 0-255, renk 0-255 x3 |
| `switch` | `turn_on`, `turn_off` | yok |
| `climate` | `set_hvac_mode` | `off, cool, heat, dry, fan_only, auto` |
| `climate` | `set_temperature` | 16-30 |
| `vacuum` | `start`, `pause`, `return_to_base` | yok |

Sunucu bu komutu HA servis çağrısına çevirir. Alan adı, servis adı ve entity kimliği biçim kontrolünden geçer, böylece URL yolu enjeksiyonu mümkün olmaz.

## Gizli bilgi yönetimi

- Gizli bilgiler `.env` ile verilir, `.gitignore` içindedir. Şablon: `server/.env.example`.
- `JWT_SECRET` en az 32, `BOOTSTRAP_TOKEN` en az 24 karakter olmalı. Sunucu aksi halde açılmaz.
- CI'da gizli bilgi taraması çalışır.

## Durum tablosu

| Önlem | Durum |
|---|---|
| Parola hash (scrypt), yapılandırma doğrulama | Kodda, testler çalıştırıldı ve geçti |
| Komut izinli listesi ve rol izinleri (`policy`) | Kodda, testler çalıştırıldı ve geçti |
| Tarama şeması doğrulama | Kodda, testler çalıştırıldı ve geçti |
| HA REST istemcisi | Kodda, sahte fetch ile testler geçti, gerçek HA ile denenmedi |
| Kısa ömürlü JWT (imza, süre, `alg:none` reddi) | Kodda, testler GitHub Actions'ta geçti |
| HTTP uçları: ilk kurulum belirteci, giriş, hız sınırı, güvenlik başlıkları, rol kontrolü | Kodda, testler GitHub Actions'ta geçti |

> Tip kontrolü ve tüm testler GitHub Actions'ta yeşil (`.github/workflows/ci.yml`, commit `c8d7087`). Testler birim ve `inject` tabanlı entegrasyon testleridir. Gerçek Home Assistant, gerçek ağ ve gerçek cihazla denenmedi, güvenlik incelemesi veya sızma testi yapılmadı.
| Kalıcı veritabanı | Planlı (şu an bellekte) |
| Yenileme belirteci, passkey | Planlı |
| Cihaz eşleşmesi (QR) | Planlı |
| WebSocket ve HA olay akışı | Planlı |
| Denetim günlüğü | Planlı |
| TLS (Tailscale sertifikası) | Dağıtım aşamasında |
| Şifreli yedek | Planlı |

## Dağıtım için kontrol listesi

- [ ] HA yalnızca ev ağından ve sunucudan erişilebilir
- [ ] Sunucu internete doğrudan açık değil, uzaktan erişim Tailscale ile
- [ ] Cihazlar ayrı IoT ağında
- [ ] `JWT_SECRET` ve `BOOTSTRAP_TOKEN` rastgele üretildi
- [ ] İlk kurulumdan sonra `BOOTSTRAP_TOKEN` kaldırıldı veya değiştirildi
- [ ] Sunucu ve HA güncel
