# Gizlilik ve KVKK notları

> **Bu bir tasarım notudur, hukuki görüş değildir.** Ürün yayına alınmadan önce KVKK konusunda bir avukata danışılmalıdır.

Ev planı, cihaz listesi ve kullanım izi kişisel veridir ve bir kişinin ev yaşamı hakkında bilgi verir. Bu yüzden gizlilik sonradan eklenmez, tasarımın parçasıdır.

## İşlenen veriler

| Veri | Neden | Not |
|---|---|---|
| Kullanıcı adı, parola özeti | Hesap | Parola scrypt ile, düz metin saklanmaz |
| Mekân adı ve türü | Ürün işlevi | Adres veya konum **tutulmaz** |
| Ev planı (oda, duvar, kapı, nesne yerleşimi) | 3D görünüm | Yalnızca yapılandırılmış geometri, ham kamera görüntüsü sunucuya gönderilmez (tasarım kararı) |
| Cihaz listesi ve konumları | Kontrol | Sağlayıcı dış kimliği istemciye gösterilmez |
| Denetim günlüğü: kim, hangi mekân ve cihaz, hangi komut, ne zaman | Güvenlik, hata ayıklama | Parametre değerleri (ör. hedef sıcaklık) yazılmaz. Bu günlük de kişisel veridir, saklama süresi belirlenmeli |

## Bilinçli olarak toplamadıklarımız

Adres, GPS konumu, kamera veya mikrofon kaydı, cihazların ham kullanım geçmişi.

## KVKK ilke kararı (2026/347)

Kişisel Verileri Koruma Kurulu'nun 18/02/2026 tarihli ve 2026/347 sayılı ilke kararına göre (Resmi Gazete, 24 Mart 2026), basın özetinden anladığımız kadarıyla:

- Aydınlatma yükümlülüğü, hangi hukuki sebebe dayanılırsa dayanılsın, veri işlenmeden önce yerine getirilmelidir.
- Açık rıza yalnızca işleme gerçekten açık rızaya dayanıyorsa gerekir. Bu durumda aydınlatma metni ve açık rıza metni **ayrı** hazırlanır, her biri için ayrı beyan alınır.
- Aydınlatma metninin sonunda "kabul ediyorum" yerine "okudum ve anladım" gibi bir bilgilendirme teyidi kullanılır.
- Metinlerde veri kategorileri, işleme amacı ve hukuki sebep açık yazılmalı. Başka kurumun metni aynen kopyalanmamalı, yurt dışı aktarım yoksa varmış izlenimi veren ifade kullanılmamalı.
- İspat yükü veri sorumlusundadır.

Bu bir özetin özetidir. Karar metninin kendisi okunmalı ve avukatla değerlendirilmelidir. ([özet haber](https://www.alomaliye.com/2026/03/24/kvkkdan-yeni-ilke-karari-acik-riza-metni-ile-aydinlatma-metni-artik-ayri-duzenlenmeli/))

## Yapılacaklar

- [ ] Hukuki görüş: veri sorumlusu kim, hukuki sebepler, VERBİS kaydı gerekip gerekmediği
- [ ] Sunucu barındırma yeri kararı (Türkiye içi veya dışı) ve yurt dışı aktarım durumu
- [ ] Aydınlatma metni ve (gerekirse) açık rıza metni, ayrı ve kısa
- [ ] Saklama süreleri (özellikle denetim günlüğü)
- [ ] Veri sahibi hakları: dışa aktarma, silme (hesap silme ve mekân silme uçları henüz yok)
- [ ] Mekân üyelerinin birbirinin verisini görme kuralları (şu an owner ve member üye listesini görür)
