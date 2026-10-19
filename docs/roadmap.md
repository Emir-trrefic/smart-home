# Yol haritası

## Aşama 0: mimari ve güvenlik temeli (şu an)

- [x] Mimari, güvenlik, veri modeli ve karar dokümanları
- [x] Sunucu iskeleti: kimlik doğrulama, komut izinli listesi, tarama şeması, HA REST istemcisi
- [ ] CI'da tüm testlerin yeşil çalışması (JWT ve HTTP uç testleri henüz hiç çalıştırılmadı)
- [ ] Kalıcı veritabanı, yenileme belirteci, denetim günlüğü
- [ ] `apps/scanner-ios`: RoomPlan ile çok odalı tarama ve JSON dışa aktarma (Xcode yöntemi seçilince)
- [ ] Cihaz eşleşmesi (tek kullanımlık QR kodu)

## Sonraki aşamalar (ilk plan)

- [ ] **Hafta 1-2:** Home Assistant kurulumu, 1-2 cihaz bağlama (LED, priz)
- [ ] **Hafta 3:** Basit web paneli ile cihazları API üzerinden aç/kapat
- [ ] **Hafta 4-5:** Evin 3D modelini hazırla, Three.js sahnesine yükle
- [ ] **Hafta 6-7:** Nesnelere tıklama, kontrol menüleri, gerçek zamanlı durum senkronu
- [ ] **Hafta 8+:** Robot süpürge haritası, otomasyonlar, sesli komut, güvenlik sertleştirme

## İlke

Küçük başla: önce tek odada, tek cihazla çalışan bir prototip. Sonra odaları ve cihazları ekle.
