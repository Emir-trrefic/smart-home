# apps/ios

iOS uygulaması: yerel Swift, SwiftUI + SceneKit. Karar: [docs/decisions.md](../../docs/decisions.md) #11.

## Ne var
- Giriş (sunucu adresi, kullanıcı adı, parola). Erişim belirteci Keychain'de, parola saklanmaz.
- Mekân listesi, mekân görünümü: son tarama SceneKit ile 3D çizilir (duvar, zemin, eşya), cihazlar turuncu küre olarak görünür, **dokununca** cihaz paneli açılır.
- Cihaz paneli kontrolleri cihazın `capabilities` listesinden çizilir (aç/kapat, sıcaklık, mod, hız, robot, ses). Sınırları ve yetkiyi sunucu yine doğrular.
- `https` zorunlu, yalnızca `localhost`, `127.0.0.1` ve `.local` adreslerine `http` izni var.

## Ne yok (henüz)
- RoomPlan ile oda tarama ve yükleme (sonraki adım, `apps/ios` içine ayrı hedef olarak)
- Üyeler ve davet ekranları (`ApiClient.createInvite` hazır, arayüz yok)
- Oturum yenileme (belirteç 15 dakika, süre dolunca yeniden giriş istenir)
- Cihaz durumunu canlı gösterme (sunucuda olay akışı yok)
- Kayıt/davetle hesap açma ekranı

## Derleme
Xcode projesi depoda tutulmaz, [XcodeGen](https://github.com/yonaskolb/XcodeGen) ile `project.yml`'den üretilir:

```
brew install xcodegen
cd apps/ios && xcodegen generate && open SmartHome.xcodeproj
```

Derleme ve testler GitHub Actions'ta macOS makinesinde (`ios` işi) simülatörde çalışır. Gerçek iPhone'a kurmak ve TestFlight için ücretli Apple Developer hesabı gerekir; `project.yml` içindeki `com.example.smarthome` paket kimliği değiştirilmeli.

## Doğrulanmayanlar
- 3D sahnenin gerçek iPhone'daki akıcılığı (gerçekçi ev boyutunda) ölçülmedi.
- RoomPlan gerçek tarama çıktısının `Scan` şemasına dönüştürülmesi yazılmadı.
