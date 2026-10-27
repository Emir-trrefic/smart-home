# Yol haritası

Öncelik: **mobil uygulama**. Sunucu ve ortak model, mobilin dayanacağı sözleşmeyi sağlıyor.

## Aşama 0: temel (tamamlandı)

- [x] Mimari, güvenlik, veri modeli, karar, entegrasyon ve gizlilik dokümanları
- [x] `packages/domain`: mekân, rol, tarama, cihaz, komut kataloğu (8 cihaz türü)
- [x] Sunucu: kimlik, mekân başına üyelik ve roller, davetle katılım, kiracı izolasyonu, cihaz kaydı, komut çözümü, tarama yükleme
- [x] CI: tip kontrolü, testler, gizli bilgi taraması

## Aşama 1: iOS temel

- [x] Karar: iOS yerel Swift (karar #11)
- [x] Sunucu: `GET /places/:id/scans/latest` (3D görünüm için)
- [x] iOS iskeleti: giriş, mekânlar, 3D görünüm, cihaz paneli, CI'da derleme ve test
- [ ] Gerçek iPhone'da 3D sahne akıcılığı ölçümü
- [ ] Üyeler ve davet ekranları, davetle hesap açma
- [ ] Kalıcı veritabanı seçimi ve geçişi
- [ ] `package-lock.json` ve CI'da `npm ci`

## Aşama 2: gerçek cihazlar

- [ ] Bridge aracısı tasarımı, güvenlik incelemesi ve yazımı
- [ ] Home Assistant ile uçtan uca deneme (ışık, klima, TV, robot)
- [ ] Cihaz keşfi: HA varlıklarını listeleme, owner onayı ile tür, oda ve konum atama
- [ ] Cihaz durumu: olay akışı (WebSocket) ve gerekirse anlık bildirim
- [ ] Kalorifer için güvenlik değerlendirmesi (sınırlar, kombi uyumu)

## Aşama 3: ev tarama ve 3D

- [ ] Tarayıcı (`apps/ios` içinde ayrı hedef): RoomPlan, çok odalı birleştirme, JSON dışa aktarma
- [ ] Tarama sonrası düzenleme: oda adı, cihaz yerleşimi (yapay zeka önerisi opsiyonel)
- [ ] 3D sahne çizimi, cihaz etkileşimi ve görsel geri bildirim (klima efekti, TV ışığı vb.)
- [ ] Robot haritası ve konumu (özel geliştirme)

## Aşama 4: ürünleşme

- [ ] Açık kayıt, e-posta doğrulama, parola sıfırlama, yenileme belirteci, passkey
- [ ] Hesap ve mekân silme, sahiplik devri
- [ ] KVKK: hukuki görüş, aydınlatma ve (gerekirse) açık rıza metinleri, saklama süreleri
- [ ] Matter doğrudan ekleme (iOS MatterSupport, Android Google Home APIs) ve bulut sağlayıcı entegrasyonları
- [ ] Web ve masaüstü istemci
- [ ] Bağımsız güvenlik incelemesi ve sızma testi

## İlke

Küçük başla: önce tek mekân, tek cihazla uçtan uca çalışan dilim. Sonra türleri, sağlayıcıları ve kullanıcıları çoğalt.
