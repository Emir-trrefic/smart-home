# Cihaz notları

Cihaz türleri, komutları ve sınırları [data-model.md](data-model.md) içinde. Bu dosya, her tür için pratik notları ve henüz doğrulanmamış noktaları tutar.

| Tür | Home Assistant alanı | Notlar |
|---|---|---|
| `light` | `light` | En kolay tür |
| `switch` | `switch` | |
| `air_conditioner` | `climate` | IR verici ile bağlanırsa klimanın gerçek oda sıcaklığı okunamaz (IR tek yönlü), ayrı sıcaklık sensörü gerekir. |
| `heater` | `climate` | Güvenlik açısından en hassas tür, sıcaklık sınırı 5-28 °C. Kombiyi akıllı yapmanın yollarından biri OpenTherm Gateway, ayrı donanım ister ve uyumlu kombi markaları doğrulanmadı. Radyatör vanası veya kombinin kendi akıllı termostatı alternatif. |
| `fan` | `fan` | Hız yüzdesi, hazır mod, salınım |
| `air_purifier` | `fan` | Hava temizleyicilerin HA'da hangi türde göründüğü cihazın entegrasyonuna bağlı, doğrulanmadı |
| `tv` | `media_player` | Markaya göre entegrasyon değişir (LG webOS için resmi entegrasyon var, diğer markalar doğrulanmadı). Bekleme modundan ağ üzerinden açmak markaya göre çalışmayabilir. |
| `robot_vacuum` | `vacuum` | Oda bazlı temizlik ve harita her robotta yok, bunlar entegrasyona bağlı ek yetenekler |

Gerçek marka ve model listesi, kullanıcılar belli olunca ve entegrasyon yolları doğrulandıkça buraya eklenecek.
