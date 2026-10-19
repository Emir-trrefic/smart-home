# Mimari

## Katmanlar

1. **Cihaz katmanı:** Klima, LED, robot süpürge, priz gibi cihazlar. Farklı markalar ve protokoller (Wi-Fi, Zigbee, Matter, IR, MQTT).
2. **Köprü katmanı:** Home Assistant. Tüm cihazları tek API arkasında toplar.
3. **Sunucu katmanı:** Evde sürekli açık duran küçük sunucu (ör. Raspberry Pi). Arayüzün konuştuğu API ve WebSocket burada.
4. **Arayüz katmanı:** Three.js ile 3D ev sahnesi. Telefon ve bilgisayarda aynı kod.

## Veri akışı

- **Komut:** Kullanıcı 3D sahnede cihaza tıklar, arayüz sunucuya komut gönderir, sunucu Home Assistant API'sini çağırır, cihaz çalışır.
- **Durum:** Cihaz durumu değişince Home Assistant olay yayar, sunucu WebSocket ile arayüze iletir, sahnedeki nesne güncellenir (ışık yanar, klima efekti başlar).

## 3D sahne

- Ev modeli `.glb` formatında `assets/models/` altında tutulur.
- Her cihaz sahnede adlandırılmış bir nesne olur ve bir Home Assistant `entity_id` ile eşlenir (`docs/devices.md`).
- Nesneye tıklayınca cihaza özel kontrol menüsü açılır.

## Güvenlik

- Giriş doğrulama zorunlu.
- Uzaktan erişim yalnızca HTTPS veya VPN (Tailscale) üzerinden, router'da port açılmaz.
- Gizli bilgiler ortam değişkenlerinde tutulur, depoya yazılmaz.

## Açık kararlar

- Sunucu dili: Node.js (TypeScript) mi, Python mı
- Mobil: sadece PWA mı, Capacitor ile sarmalama mı
- Ev modeli: elle Blender mi, telefonla tarama mı
