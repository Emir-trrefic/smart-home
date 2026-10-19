# Veri modeli

Tarama sonucu ve ev yapısı JSON ile ifade edilir. Doğrulama şeması: `server/src/scan/schema.ts` (tek doğruluk kaynağı).

## Koordinat sistemi

- Birim: metre
- Sağ elli, **Y yukarı** (RoomPlan ve Three.js ile uyumlu)
- Yer düzlemi X-Z
- Kat yüksekliği `elevation` ile verilir

## Tarama yükü (`POST /scans`)

```jsonc
{
  "version": 1,
  "source": "roomplan",
  "capturedAt": "2026-10-19T12:00:00Z",
  "levels": [{ "id": "l0", "name": "Zemin kat", "elevation": 0 }],
  "rooms": [
    {
      "id": "r1",
      "name": "Salon",                  // kullanıcı sonradan düzenler
      "levelId": "l0",
      "height": 2.6,
      "walls": [
        { "id": "w1", "start": [0, 0], "end": [4, 0], "thickness": 0.12, "height": 2.6 }
      ],
      "doors":   [{ "id": "d1", "wallId": "w1", "offset": 1.0, "width": 0.9, "height": 2.0 }],
      "windows": [{ "id": "n1", "wallId": "w1", "offset": 2.5, "width": 1.2, "height": 1.1, "sill": 0.9 }],
      "objects": [
        {
          "id": "o1",
          "category": "sofa",
          "position": [1.5, 0.4, 2.0],
          "dimensions": [2.0, 0.8, 0.9],
          "rotationY": 0,
          "confidence": "high"
        }
      ]
    }
  ]
}
```

Alanlar:
- `start`, `end`: `[x, z]`, duvarın zemin düzlemindeki uçları
- `offset`: duvarın başlangıcından kapı veya pencere kenarına mesafe
- `confidence`: `low`, `medium`, `high`
- `category`: kısa küçük harfli ad (RoomPlan'ın nesne sınıfları buraya eşlenir)

## Cihaz

```jsonc
{
  "id": "salon-klima",
  "name": "Salon klima",
  "type": "climate",                    // light | switch | climate | vacuum
  "haEntityId": "climate.salon",
  "roomId": "r1",
  "position": [2.0, 2.2, 0.1]           // 3D sahnedeki yeri
}
```

`haEntityId` yalnızca sunucuda kullanılır, istemciye cihaz kimliği (`id`) üzerinden komut verilir.

## Sürümleme

`version` alanı şema değişikliklerini yönetir. Sunucu bilmediği sürümü reddeder.
