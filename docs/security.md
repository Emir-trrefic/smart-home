# Güvenlik

Çok kullanıcılı bir sistem: korunan şeyler **fiziksel kontrol** (klima, kalorifer, robot, TV), **mahremiyet** (evin yerleşimi, kullanım izi) ve **kiracı sınırı** (bir kullanıcının başkasının mekânına erişememesi).

## Tehdit modeli

| # | Tehdit | Önlem |
|---|---|---|
| T1 | Cihaz sistemlerine internetten doğrudan erişim | İstemciler yalnızca gateway ile konuşur. Cihaz sistemi hiçbir istemciye açılmaz. Gerçek bağlantı evden dışarı doğru kurulacak (bridge, planlı). |
| T2 | Parola tahmini veya çalınması | scrypt ile saklama, en az 12 karakter. Giriş, kayıt, kurulum ve davet kabulü uçlarında sıkı hız sınırı (dakikada 5). Kullanıcı yokken de aynı sürede hash hesaplanır (kullanıcı adı zamanlamayla sızmaz). |
| T3 | Çalınan erişim belirteci | 15 dakika ömürlü JWT, sabit algoritma (HS256), `iss` ve `aud` kontrolü, `alg:none` reddi. |
| T4 | İstemciden serbest cihaz komutu | Komut kataloğu: türe özgü komutlar, katı parametre sınırları, bilinmeyen alan reddi. Kalorifer 5-28 °C, TV'de içerik komutları yok. |
| T5 | Yetki yükseltme | Roller mekân başına. `owner` davetle verilemez. Misafir yalnızca ışık. Rol her istekte üyelikten okunur (belirteçte rol yok). |
| T6 | **Kiracılar arası erişim (IDOR)** | Her kaynak mekâna bağlı. Her mekân rotası önce üyeliği yükler, üye olmayana 404 verir (mekânın varlığı sızmaz). Cihaz yalnızca çağıranın mekânında aranır, başka mekânın cihaz kimliği çalışmaz. Testlerle doğrulanıyor. |
| T7 | **SSRF** (sunucunun kullanıcı adresine istek atması) | Sunucu kullanıcı kaynaklı hiçbir URL'ye istek atmaz. Mekân bağlantıları yalnızca kod içinden bağlanır, bridge ileride evden dışarı doğru bağlanır. |
| T8 | Cihaz kaydıyla başka varlığı kontrol etme (ışık diye kilit kaydı) | Kayıtta tür ile sağlayıcı alanı eşleşmesi zorunlu, yetenekler katalogdan olmalı. HA'ya giden `entity_id` her zaman sunucudaki kayıttan gelir, istemci parametresi ezemez. |
| T9 | Davet kötüye kullanımı | 192 bit rastgele kod, yalnızca SHA-256 özeti saklanır, tek kullanımlık, 72 saat, mekân başına en fazla 20 aktif davet ve 20 üye. |
| T10 | Kötü niyetli tarama dosyası | Katı şema (tip, aralık, uzunluk, bilinmeyen alan reddi), 5 MB gövde sınırı, içerik hiç çalıştırılmaz. |
| T11 | İlk kurulumda hesap kapma | İlk hesap yalnızca sunucuda tanımlı tek seferlik belirteçle ve hiç kullanıcı yokken açılır. Belirteç sabit sürede karşılaştırılır. |
| T12 | Hata mesajından bilgi sızması | Genel hata gövdeleri, ayrıntı yalnızca sunucu günlüğünde. İstek başlığındaki `Authorization` günlüğe yazılmaz. |
| T13 | Bağımlılık zinciri | CI'da gizli bilgi taraması, Dependabot. Kilit dosyası henüz yok. |
| T14 | Bellek ve kaynak tüketimi | Mekân, üye, davet, cihaz sınırları, gövde boyutu sınırları, genel hız sınırı. |
| T15 | Mahremiyet ve KVKK | Adres ve konum tutulmaz, günlüklerde komut parametreleri yok. [privacy.md](privacy.md) |
| T16 | Bridge'in ele geçirilmesi (planlı) | Mekân başına ayrı, iptal edilebilir bridge belirteci. Tasarım ve inceleme bridge yazılırken yapılacak. |

## Kimlik doğrulama

- Kullanıcı adı ve parola ile giriş, 15 dakikalık erişim belirteci.
- Hesap açma: ilk hesap tek seferlik kurulum belirteciyle, diğerleri mekân sahibinin daveti ile. Açık kayıt, e-posta doğrulama, parola sıfırlama, yenileme belirteci ve passkey **henüz yok**.
- Belirteç yalnızca kimlik taşır. Üyelikten çıkarılan kişi, belirteci geçerli olsa bile mekâna erişemez.

## Bilinen eksikler ve zayıflıklar (dürüst liste)

- **Depolama bellekte:** Sunucu yeniden başlayınca her şey silinir. Kalıcı ve şifreli depolama yok.
- **Hız sınırı süreç içi:** Tek sunucuda çalışır. Birden çok örnek veya ters vekil (reverse proxy) arkasında `trustProxy` ve ortak bir sayaç deposu gerekir. Şu an `trustProxy` kapalı, vekil arkasında tüm istemciler tek IP görünür.
- **Hesap devre dışı bırakma yok:** Parola değişince veya hesap kapanınca verilmiş belirteçler süresi dolana kadar (en çok 15 dk) geçerli kalır. Mekân erişimi ise üyelikten anında kesilir.
- **Kullanıcı adı sorgulanabilir:** `/auth/register` alınmış kullanıcı adına 409 verir. Davet kodu ister ve hız sınırlıdır ama tamamen kapatılmış değil.
- **Denetim günlüğü yalnızca sunucu günlüğüne yazılıyor**, kalıcı ve sorgulanabilir bir kayıt değil.
- **TLS** sunucunun dışında (ters vekil veya barındırma) sağlanmalı, sunucu kendisi TLS sonlandırmaz.
- Güvenlik incelemesi veya sızma testi yapılmadı.

## Durum

| Önlem | Durum |
|---|---|
| Parola hash, belirteç, yapılandırma doğrulama | Kodda, testli |
| Komut kataloğu, rol izinleri, parametre sınırları | Kodda, testli |
| Kiracı izolasyonu (üyelik kapısı, mekân kapsamlı cihaz ve tarama) | Kodda, testli |
| Davetle katılım, davet sınırları, üye çıkarma | Kodda, testli |
| Cihaz kaydında tür ve alan eşleşmesi | Kodda, testli |
| Tarama şeması doğrulama | Kodda, testli |
| Giriş hız sınırı, güvenlik başlıkları, hata gizleme | Kodda, testli |
| HA komut çevirisi ve REST istemcisi | Kodda, sahte `fetch` ile testli. **Gerçek HA ile denenmedi.** |
| Kalıcı veritabanı, şifreli saklama, yedek | Planlı |
| Bridge aracısı, olay akışı (WebSocket, push) | Planlı |
| Açık kayıt, e-posta doğrulama, parola sıfırlama, yenileme belirteci, passkey | Planlı |
| Kalıcı denetim günlüğü | Planlı |
| Hesap ve mekân silme | Planlı |
| TLS ve dağıtım güvenliği | Dağıtım aşamasında |

> Testler GitHub Actions'ta çalışıyor ve yeşil (`.github/workflows/ci.yml`). Birim testleri ve sahte sağlayıcıyla yapılan uçtan uca HTTP testleridir. Gerçek ağ, gerçek cihaz veya gerçek yük altında denenmedi.

## Dağıtım için kontrol listesi

- [ ] Sunucu TLS arkasında, ters vekil doğru `trustProxy` ayarıyla
- [ ] `JWT_SECRET` ve `BOOTSTRAP_TOKEN` rastgele üretildi, ilk hesaptan sonra `BOOTSTRAP_TOKEN` değiştirildi
- [ ] Kalıcı veritabanı ve şifreli yedek
- [ ] Hız sınırı için ortak sayaç deposu (birden çok örnek varsa)
- [ ] Günlük saklama süresi belirlendi (bkz. privacy.md)
- [ ] Bağımlılıklar güncel, kilit dosyası var
