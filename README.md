# Smart Home 3D

Evdeki akıllı cihazları (klima, LED ışık, robot süpürge, priz vb.) tek yerden yöneten, evin 3D modeli üzerinden oyun gibi kontrol edilen uygulama. Telefondan ve bilgisayardan aynı arayüzle çalışır.

> Durum: iskelet aşaması. Henüz çalışan kod yok, yapı ve plan hazır.

## Hedefler

- Evin 3D modeli üzerinde cihazlara tıklayarak kontrol (klima aç/kapat, derece ayarı, LED aç/kapat ve renk, robot başlat/durdur)
- Telefon ve bilgisayardan aynı uygulama
- Cihaz durumunun gerçek zamanlı senkronu
- İnternet olmadan ev ağında da çalışabilmesi
- Güvenli uzaktan erişim

## Mimari (özet)

```
[Telefon / PC]  <-->  [Sunucu (ev içi)]  <-->  [Home Assistant]  <-->  [Cihazlar]
  Three.js UI          Node.js / Python          MQTT, Zigbee,           Klima, LED,
  (PWA)                API + WebSocket           Wi-Fi, IR               robot, priz
```

Ayrıntı: [docs/architecture.md](docs/architecture.md)

## Klasör yapısı

| Klasör | İçerik |
|---|---|
| `apps/web/` | Three.js + React 3D arayüz (PWA, bilgisayar ve telefon) |
| `server/` | Arayüz ile Home Assistant arasındaki API katmanı |
| `homeassistant/` | Home Assistant yapılandırma notları ve örnekleri |
| `firmware/esp32/` | ESP32 + MQTT ile kendi yapacağımız cihazlar (LED şerit, IR verici) |
| `assets/models/` | Evin 3D modeli (`.glb`) |
| `docs/` | Mimari, yol haritası, cihaz listesi |

## Teknoloji yığını (planlanan)

- 3D arayüz: Three.js, React, Vite
- Sunucu: Node.js (TypeScript) ya da Python
- Cihaz katmanı: Home Assistant, MQTT
- Özel cihazlar: ESP32
- Mobil: PWA, istenirse Capacitor
- Masaüstü: aynı web uygulaması, istenirse Electron
- Uzaktan erişim: Tailscale ya da Home Assistant Cloud

## Yol haritası

[docs/roadmap.md](docs/roadmap.md) dosyasına bak.

## Güvenlik notu

Evin kontrolü hassas bir iştir. Şifreler, API anahtarları ve Home Assistant token'ları asla depoya yazılmaz. `.env` dosyaları `.gitignore` içindedir; örnek değerler `.env.example` dosyalarında tutulur.
