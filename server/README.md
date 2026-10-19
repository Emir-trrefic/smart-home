# server

Gateway sunucu (TypeScript, Fastify). İstemciler yalnızca bununla konuşur, Home Assistant token'ı yalnızca burada durur.

## Çalıştırma

```
cp .env.example .env     # JWT_SECRET ve BOOTSTRAP_TOKEN değerlerini rastgele üret
npm install
npm test
npm run dev
```

`.env` depoya girmez. Sunucu varsayılan olarak yalnızca `127.0.0.1` dinler.

## İlk kurulum

Hiç kullanıcı yokken, `.env` içindeki `BOOTSTRAP_TOKEN` ile ilk `owner` hesabı oluşturulur:

```
POST /auth/bootstrap   { "username": "...", "password": "(en az 12 karakter)", "bootstrapToken": "..." }
POST /auth/login       { "username": "...", "password": "..." }   ->  { "accessToken": "..." }
```

Kurulumdan sonra `BOOTSTRAP_TOKEN` değerini değiştir veya kaldır.

## Uçlar

| Uç | Yetki | Açıklama |
|---|---|---|
| `GET /healthz` | yok | Sağlık |
| `POST /auth/bootstrap` | tek seferlik belirteç | İlk owner |
| `POST /auth/login` | yok (hız sınırlı) | Erişim belirteci |
| `GET /me` | giriş | Kimlik |
| `POST /scans`, `GET /scans` | owner, member | Tarama yükle, listele |
| `POST /devices` | owner | Cihaz kaydet |
| `GET /devices` | giriş | Cihaz listesi (HA entity kimliği gizli) |
| `POST /devices/:id/command` | giriş + rol izni | İzinli listedeki komutu çalıştır |

Tasarım ve güvenlik: [../docs/security.md](../docs/security.md)

## Durum

Veri şimdilik bellekte, sunucu yeniden başlayınca silinir. Güvenlik önlemlerinin durumu `docs/security.md` sonundaki tabloda.
