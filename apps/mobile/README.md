# apps/mobile

Mobil uygulama (iOS ve Android). **Henüz kod yok.** Bu doküman çatı önerisini, araştırmada neyin doğrulandığını ve neyin doğrulanmadığını, ve ilk denemenin (spike) kontrol listesini içerir.

## Öneri: Expo (React Native) + TypeScript + react-three-fiber

- Ortak `packages/domain` paketini (şemalar, komut kataloğu) doğrudan kullanır.
- 3D için three.js ekosistemi, sonradan web ile kod paylaşımı mümkün.
- Tarayıcı (RoomPlan) ve Matter ekleme gibi yerel kodlar gerekecek. Bunlar Expo Go'da çalışmaz, **özel derleme (development build)** ister.

Alternatif: yalnızca iOS yerel (Swift) uygulama. RoomPlan ve Matter için en kolayı, ama Android ve web ile kod paylaşımı olmaz.

## Araştırmada doğrulananlar

- `expo-gl` `GLView` bileşeni OpenGL ES yüzeyi sağlıyor, Expo Go içinde var, Android, iOS ve web destekli. three.js için `expo-three` öneriliyor. Uzaktan hata ayıklama desteklenmiyor, bazı eski Android cihazlarda WebGL2 yok. ([Expo GLView](https://docs.expo.dev/versions/v58.0.0/sdk/gl-view.md))
- Bir geliştirici react-three-fiber ile GLB modelini Expo'da gerçek cihazda dokulu gösterebildi. **Yazı Şubat 2024 tarihli** (Expo SDK 50, R3F 8), "çoğunlukla zahmetli ama başarılı" diyor, performans ölçmemiş. ([makale](https://trifonstatkov.medium.com/the-current-state-of-using-react-three-fiber-in-react-native-expo-c65918593eaf))
- `npx testflight` EAS Build ile iOS uygulamasını derleyip TestFlight'a gönderiyor. Ücretli Apple Developer hesabı ve Expo hesabı gerekiyor. Sayfa "Mac gerekmez" diye açıkça yazmıyor, derlemenin EAS panelinden izlendiğini gösteriyor. ([Expo](https://docs.expo.dev/build-reference/npx-testflight.md))
- iOS'ta MatterSupport ile uygulama Matter cihazlarını kendi ekosistemine ekleyebilir, ama bir uygulama uzantısı hedefi, Bonjour tanımları ve yetkilendirmeler ister. ([Apple](https://developer.apple.com/documentation/mattersupport/adding-matter-support-to-your-ecosystem.md))

## Doğrulanmayanlar (deneme ile netleşecek)

- Güncel Expo SDK ve react-three-fiber sürümlerinde performans ve kararlılık
- `packages/domain` gibi bir çalışma alanı paketinin Expo (Metro) içinde sorunsuz kullanılması
- Expo içinde MatterSupport uzantısı eklemenin zorluğu
- Android'de Matter ekleme için Google Home APIs erişimi
- 3D sahnede hedef kare hızı (henüz belirlenmedi, deneme sonrası konulacak)

## Deneme (spike) kontrol listesi

Amaç tek bir soruyu yanıtlamak: **Expo + react-three-fiber bu ürün için yeterli mi?**

1. Güncel Expo SDK ile boş proje, development build.
2. `packages/domain` içeri alınabiliyor mu?
3. `ScanUploadSchema` örneğinden duvarları kutu olarak çizen sahne. Gerçekçi boyut: 30 oda, yaklaşık 200 duvar, 20 cihaz.
4. Gerçek bir iPhone'da ve orta seviye bir Android'de kare hızı ölçümü.
5. Dokunma etkileşimi: tek parmakla döndürme, iki parmakla yakınlaştırma, cihaza dokunarak seçme (raycast).
6. Sonuç yazılı olarak: devam et, ya da alternatife (önce yerel iOS) geç.

## İlk sürüm ekranları

1. Giriş
2. Mekân listesi (ev, ofis, ...)
3. Mekân görünümü: 3D sahne ve seçilen cihazın paneli (kontroller `capabilities` listesinden çizilir)
4. Üyeler ve davet
5. (Sonra) tarama

## Sizden gereken kararlar

- **Derleme yolu:** Kodun bilgisayarda durmaması tercihi için EAS bulut derlemesi uygun. Bunun için Expo hesabı ve (iOS için) ücretli Apple Developer hesabı gerekir. Alternatif, geçici olarak bilgisayarda geliştirme sunucusu çalıştırmak.
- **Çatı onayı:** Expo önerisi mi, önce yerel iOS mu.
