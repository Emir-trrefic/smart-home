# server

Gateway sunucu (TypeScript, Fastify). İstemciler yalnızca bununla konuşur. Kimlik, mekân başına üyelik ve roller, komut doğrulama, mekân ve cihaz kayıtları, tarama yükleme.

Ortak şemalar ve komut kataloğu [`packages/domain`](../packages/domain) içindedir.

## Çalıştırma

Depo kökünden:

```
npm install
npm test            # alan modeli ve sunucu testleri
npm run typecheck
```

Sunucuyu başlatmak için:

```
cd server
cp .env.example .env     # JWT_SECRET ve BOOTSTRAP_TOKEN değerlerini rastgele üret
npm run dev
```

`.env` depoya girmez. Sunucu varsayılan olarak yalnızca `127.0.0.1` dinler.

## Hesap açma

- **İlk hesap:** Hiç kullanıcı yokken, `.env` içindeki `BOOTSTRAP_TOKEN` ile.
  `POST /auth/bootstrap { username, password (en az 12 karakter), bootstrapToken }`
- **Diğer hesaplar:** Mekân sahibinin davetiyle.
  `POST /places/:placeId/invites { role: "member" | "guest" }` → `{ code }`, ardından
  `POST /auth/register { username, password, inviteCode }`
- Giriş: `POST /auth/login` → `{ accessToken }` (15 dakika)

Kurulumdan sonra `BOOTSTRAP_TOKEN` değerini değiştir.

## Uçlar

Tam liste ve yetkiler: [../docs/data-model.md](../docs/data-model.md) sonundaki API özeti. Güvenlik tasarımı: [../docs/security.md](../docs/security.md).

## Bilinen sınırlar

- Veri bellekte, sunucu yeniden başlayınca silinir.
- Hiçbir mekâna cihaz bağlantısı yok (bridge henüz yazılmadı), bu yüzden cihaz komutları `409 no_connection` döner. Kayıt, yetki ve doğrulama akışı testlerde sahte sağlayıcıyla doğrulanıyor.
