# Mimari kararlar

Her karar: bağlam, karar, sonuç, **durum**. Durum değerleri: *geçerli*, *değişti*, *öneri* (onay bekliyor).

## 1. İstemciler yalnızca kendi sunucumuzla konuşur (gateway)
- **Bağlam:** Arayüzün doğrudan Home Assistant API'sine bağlanması, uzun ömürlü token'ı istemciye taşımayı gerektirir. Token çalınırsa tüm eve tam erişim verir.
- **Karar:** İstemciler gateway'e bağlanır. Cihaz sistemi anahtarları istemciye verilmez.
- **Durum:** geçerli

## 2. Komutlar izinli listeyle sınırlıdır
- **Bağlam:** Home Assistant'ın `call_service` çağrısı çok geniştir.
- **Karar:** İstemci servis adı değil, cihaz türüne özgü komut gönderir. Katalog `packages/domain` içinde, parametre sınırlarıyla birlikte.
- **Sonuç:** Yeni tür eklemek kod değişikliği ister ama saldırı yüzeyi dar kalır. TV'de `play_media` ve `browse_media` bilinçli olarak yok.
- **Durum:** geçerli, 4 türden 8 türe genişletildi (ışık, priz, klima, kalorifer, fan, hava temizleyici, TV, robot)

## 3. Uzaktan erişim: son kullanıcıdan Tailscale istemiyoruz
- **Bağlam (v1):** Tek evlik sistemde uzaktan erişim Tailscale ile düşünülmüştü.
- **Değişiklik:** Çok kullanıcılı üründe her kullanıcıdan VPN kurmasını beklemek gerçekçi değil. Yerine bridge aracısı geliyor (karar 10). Tailscale, geliştirme ve kendi sunucumuza erişim için isteğe bağlı kalır.
- **Durum:** değişti

## 4. Sunucu dili: TypeScript (Node.js)
- **Bağlam:** İstemci ve sunucu arasında şema paylaşımı isteniyor. Mobil de TypeScript ise (karar 11) aynı paket her yerde kullanılır.
- **Karar:** TypeScript, Fastify, doğrulama için zod. Ortak model `packages/domain`.
- **Durum:** geçerli

## 5. Tarama yalnızca iOS (RoomPlan) ile
- **Bağlam:** RoomPlan çok odalı yapıyı birleştirebilen hazır çerçeve ve LiDAR ister. Android'de karşılığı yok.
- **Karar:** Tarama LiDAR'lı iPhone/iPad'de yerel iOS koduyla yapılır. Diğer tüm istemciler tarama sonucunu kullanır.
- **Sonuç:** Android'de tarama için ayrı bir çözüm gerekir (açık).
- **Durum:** geçerli

## 6. Tarama verisi önce JSON olarak iletilir
- **Karar:** Yapılandırılmış JSON (oda, duvar, kapı, nesne) birincil veridir, arayüz evi bundan çizer. USDZ/GLB sonraya.
- **Durum:** geçerli

## 7. İlk sürümde veri bellekte
- **Karar:** Depolama arayüzlerin arkasında, ilk uygulama bellekte. Kalıcı veritabanı sonraki adım.
- **Sonuç:** Sunucu yeniden başlayınca veri kaybolur. Bilinçli ve geçici.
- **Durum:** geçerli (geçici)

## 8. Çok kiracılı model, roller mekân başına
- **Bağlam:** Ürün birçok kullanıcıya hizmet edecek, her kullanıcının birden çok mekânı olabilir.
- **Karar:** Her kaynak bir mekâna bağlıdır. Roller mekân başınadır (`owner`, `member`, `guest`). Belirteç yalnızca kimliği taşır, rol her istekte üyelikten okunur. Üye olmayan kişiye 404 döner.
- **Sonuç:** Çıkarılan üye anında erişimi kaybeder. Her istekte bir üyelik sorgusu yapılır (bellek içi şimdilik ucuz, veritabanında indeks gerekir).
- **Durum:** geçerli

## 9. Sağlayıcı adaptörleri, ilk sağlayıcı Home Assistant
- **Bağlam:** Kullanıcıların markaları belli değil ve çok çeşitli. Tek bir markaya bağlanmak ürünü sınırlar.
- **Karar:** Cihaz modeli sağlayıcıdan bağımsız. Her cihazın `provider` ve `externalId` alanı var. Şimdilik tek sağlayıcı Home Assistant (geniş marka kapsamı). Matter ve bulut API'leri aynı arayüze eklenecek ([integrations.md](integrations.md)).
- **Durum:** geçerli

## 10. Bridge aracısı, sunucu kullanıcı adresine bağlanmaz
- **Bağlam:** Kullanıcının Home Assistant adresini sunucuya girmesi, sunucuyu kullanıcı kontrollü adreslere istek atmaya iter (SSRF). Ayrıca her kullanıcının HA token'ını bulutta tutmak büyük risk.
- **Karar:** Evde çalışan bridge, buluta dışarı doğru bağlanır. Sunucu kullanıcı URL'sine hiç bağlanmaz, HA token'ı evden çıkmaz.
- **Sonuç:** Bridge yazılana kadar komutlar 409 `no_connection` döner. Bridge ayrı bir güvenlik incelemesi ister.
- **Durum:** öneri (tasarım onayı, kod yok)

## 11. Mobil çatı: Expo (React Native) + TypeScript
- **Bağlam:** Mobil öncelikli. Aynı dilde ortak alan paketi, 3D için three.js ekosistemi (react-three-fiber), web ile kod paylaşımı isteniyor. RoomPlan tarayıcısı ve Matter ekleme zaten yerel (native) kod ister.
- **Karar:** Expo ile React Native, 3D için react-three-fiber. Yerel kodlar (tarayıcı, Matter) yerel modül olarak eklenir. Karar, gerçek cihazda 3D performans denemesinden (spike) sonra kesinleşir.
- **Alternatif:** Önce yalnızca iOS yerel (Swift) uygulama. RoomPlan ve Matter ile en kolay, ama Android ve web için kod paylaşımı yok.
- **Durum:** öneri (spike ve onay bekliyor), ayrıntı: `apps/mobile/README.md`

## 12. Davetle katılım, açık kayıt sonra
- **Bağlam:** Açık kayıt e-posta doğrulaması, kötüye kullanım koruması ve KVKK metinleri ister.
- **Karar:** Şimdilik hesap, tek seferlik kurulum belirteciyle (ilk hesap) veya mekân owner'ının davetiyle açılır. Davet kodu 192 bit rastgele, yalnızca özeti saklanır, tek kullanımlık, 72 saat geçerli, owner rolü veremez.
- **Sonuç:** Bağımsız yeni müşteriler henüz kayıt olamaz. Bu bilinçli bir eksik ve yol haritasında.
- **Durum:** geçerli (geçici)

## 13. KVKK baştan tasarımda
- **Karar:** Adres ve konum toplamıyoruz, ham kamera görüntüsü sunucuya gitmiyor (yalnızca yapılandırılmış geometri), denetim günlüğünde parametre değerleri yok. Aydınlatma ve açık rıza ayrı metinlerle. Ayrıntı [privacy.md](privacy.md).
- **Durum:** geçerli (hukuki görüş alınmadı)
