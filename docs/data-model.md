# Veri modeli

Şemaların tek doğruluk kaynağı [`packages/domain`](../packages/domain). Bu doküman onların özetidir.

## Varlıklar

| Varlık | Alanlar | Not |
|---|---|---|
| **Kullanıcı** | id, kullanıcı adı, parola özeti | Parola scrypt ile saklanır |
| **Mekân** | id, ad, tür (`home`, `office`, `other`) | Adres veya konum tutulmaz |
| **Üyelik** | mekân, kullanıcı, rol (`owner`, `member`, `guest`) | Tüm yetki kararlarının dayanağı |
| **Davet** | kod özeti, mekân, rol (`member`, `guest`), son kullanma | Kodun kendisi saklanmaz |
| **Kat / Oda** | tarama verisinin parçası | Aşağıda |
| **Cihaz** | id, ad, tür, sağlayıcı, dış kimlik, oda, 3D konum, yetenekler | Dış kimlik istemciye gösterilmez |

Kısıtlar: kullanıcı başına en fazla 10 sahip olunan mekân, mekân başına en fazla 20 üye, 20 aktif davet, 500 cihaz.

## Roller

| Rol | Yapabilecekleri |
|---|---|
| `owner` | Her şey: cihaz kaydı, davet, üye çıkarma, tarama, tüm cihazları kontrol |
| `member` | Tarama yükleme, üye listesini görme, tüm cihazları kontrol |
| `guest` | Yalnızca ışığı görme ve kontrol etme |

`owner` davetle verilemez. Mekânı oluşturan tek sahiptir ve üyelikten çıkarılamaz. (Sahiplik devri ve mekân silme planlı.)

## Cihaz türleri ve komutlar

Komutlar ve sınırlar `packages/domain/src/commands.ts` içindedir.

| Tür | Komutlar | Sınırlar |
|---|---|---|
| `light` | `turn_on` (parlaklık, renk), `turn_off` | parlaklık 0-255, renk 0-255 x3 |
| `switch` | `turn_on`, `turn_off` | |
| `air_conditioner` | `set_hvac_mode`, `set_temperature` | 16-30 °C, modlar: off, cool, heat, dry, fan_only, auto |
| `heater` | `set_hvac_mode`, `set_temperature` | **5-28 °C**, modlar: off, heat, auto |
| `fan` | `turn_on`, `turn_off`, `set_percentage`, `set_preset_mode`, `oscillate` | yüzde 0-100 tam sayı |
| `air_purifier` | `turn_on`, `turn_off`, `set_percentage`, `set_preset_mode` | yüzde 0-100 tam sayı |
| `tv` | `turn_on`, `turn_off`, `volume_up`, `volume_down`, `volume_set`, `volume_mute`, `select_source`, `media_play`, `media_pause` | ses 0-1. `play_media` ve `browse_media` yok |
| `robot_vacuum` | `start`, `pause`, `stop`, `return_to_base`, `locate` | |

Cihazın **yetenekleri** türün komutlarından bir alt kümedir (ör. bazı TV'ler yalnızca açma kapama destekler). Kayıtta verilmezse türün tüm komutları geçerlidir. Katalogda olmayan yetenek kaydedilemez.

Kayıtta ayrıca tür ile sağlayıcı alanı eşleşmesi zorunludur: `light` türüne `lock.front_door` kaydedilemez (Home Assistant için klima ve kalorifer `climate.*`, fan ve hava temizleyici `fan.*`, TV `media_player.*`, robot `vacuum.*`).

## Koordinat sistemi

- Birim: metre
- Sağ elli, **Y yukarı** (RoomPlan ve three.js ile uyumlu)
- Yer düzlemi X-Z, kat yüksekliği `elevation` ile verilir

## Tarama yükü (`POST /places/:placeId/scans`)

```jsonc
{
  "version": 1,
  "source": "roomplan",
  "capturedAt": "2026-10-19T12:00:00Z",
  "levels": [{ "id": "l0", "name": "Zemin kat", "elevation": 0 }],
  "rooms": [
    {
      "id": "r1",
      "name": "Salon",
      "levelId": "l0",
      "height": 2.6,
      "walls": [{ "id": "w1", "start": [0, 0], "end": [4, 0], "thickness": 0.12, "height": 2.6 }],
      "doors": [{ "id": "d1", "wallId": "w1", "offset": 1.0, "width": 0.9, "height": 2.0 }],
      "windows": [{ "id": "n1", "wallId": "w1", "offset": 2.5, "width": 1.2, "height": 1.1, "sill": 0.9 }],
      "objects": [
        { "id": "o1", "category": "sofa", "position": [1.5, 0.4, 2.0], "dimensions": [2.0, 0.8, 0.9], "rotationY": 0, "confidence": "high" }
      ]
    }
  ]
}
```

`start`, `end` `[x, z]` duvarın zemindeki uçları, `offset` duvarın başından kapı veya pencere kenarına mesafe. Sayılar sonlu ve sınırlı olmalı, diziler üst sınırlı, bilinmeyen alan reddedilir.

## API özeti

| Uç | Yetki |
|---|---|
| `POST /auth/bootstrap`, `POST /auth/register`, `POST /auth/login`, `GET /me` | bkz. [security.md](security.md) |
| `POST /invites/accept` | giriş |
| `POST /places`, `GET /places`, `GET /places/:placeId` | giriş / üye |
| `GET /places/:placeId/members` | owner, member |
| `POST /places/:placeId/invites` | owner |
| `DELETE /places/:placeId/members/:userId` | owner (başkası için), herkes (kendisi için) |
| `POST /places/:placeId/devices` | owner |
| `GET /places/:placeId/devices` | üye (rolün kontrol edebildiği türler) |
| `POST /places/:placeId/devices/:deviceId/command` | üye (rol izni kataloğa göre) |
| `POST /places/:placeId/scans`, `GET /places/:placeId/scans` | owner, member |

## Sürümleme

Tarama yükündeki `version` şema değişikliklerini yönetir. Sunucu bilmediği sürümü reddeder.
