# Mimari kararlar

Her karar: bağlam, karar, sonuç.

## 1. İstemciler yalnızca kendi sunucumuzla konuşur (gateway)

- **Bağlam:** Arayüzün doğrudan Home Assistant API'sine bağlanması, uzun ömürlü HA token'ını istemciye taşımayı gerektirir. Token çalınırsa tüm eve tam erişim verir.
- **Karar:** İstemciler gateway sunucuya bağlanır, HA token'ı yalnızca sunucuda durur.
- **Sonuç:** Bir katman daha yazılır, karşılığında yetki, komut sınırı ve denetim tek noktada toplanır.

## 2. Komutlar izinli listeyle sınırlıdır

- **Bağlam:** HA'nın `call_service` çağrısı çok geniştir (ör. otomasyon silme, sistem servisleri).
- **Karar:** İstemci HA servis adı değil, cihaz türüne özgü komut gönderir. Sunucu komutu doğrular ve HA servisine çevirir.
- **Sonuç:** Yeni cihaz türü eklemek kod değişikliği ister, ama saldırı yüzeyi dar kalır.

## 3. Uzaktan erişim Tailscale ile

- **Bağlam:** Router'da port açmak veya sunucuyu herkese açık yayınlamak saldırı yüzeyini büyütür.
- **Karar:** Sunucu yalnızca ev ağı ve Tailscale ağında erişilebilir.
- **Sonuç:** Her istemci cihazda Tailscale kurulmalı. Alternatifler (Nabu Casa, Cloudflare Tunnel) ileride değerlendirilebilir.

## 4. Sunucu dili: TypeScript (Node.js)

- **Bağlam:** Web arayüzü de TypeScript. İstemci ve sunucu arasında şema paylaşımı mümkün.
- **Karar:** TypeScript, Fastify, doğrulama için zod.
- **Sonuç:** Tek dil, ortak tipler. Python seçeneği, HA ile aynı dilde olma avantajı ama şema paylaşımı zayıf.

## 5. Tarama yalnızca iOS (RoomPlan) ile

- **Bağlam:** RoomPlan, çok odalı yapıyı birleştirebilen hazır çerçeve ve LiDAR ister. Android'de karşılığı yok.
- **Karar:** Tarama, LiDAR'lı iPhone/iPad'de yerel iOS uygulamasıyla yapılır. Diğer tüm istemciler yalnızca kullanır.
- **Sonuç:** Tarama için ayrı bir iOS uygulaması gerekir ve derleme için Xcode lazım. Android tarama sonraya bırakıldı.

## 6. Tarama verisi önce JSON olarak iletilir

- **Bağlam:** USDZ'yi Three.js için GLB'ye çevirmek ek araç ister.
- **Karar:** Yapılandırılmış JSON (oda, duvar, kapı, nesne) birincil veridir. 3D arayüz evi bundan çizer. USDZ ikincil ve sonraya bırakıldı.
- **Sonuç:** Düşük poligonlu temiz bir görünüm ve basit hat. Gerçekçi görsellik gerekirse USDZ/GLB hattı eklenir.

## 7. Ilk sürümde veri bellekte, kalıcılık sonra

- **Bağlam:** Veri modeli henüz oturmadı.
- **Karar:** Depolama bir arayüz arkasında tutulur, ilk uygulama bellekte. Kalıcı veritabanı seçimi sonraki adım.
- **Sonuç:** Sunucu yeniden başlayınca veri kaybolur. Bu bilinçli ve geçici.
