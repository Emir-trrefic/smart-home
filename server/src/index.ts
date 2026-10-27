import { buildApp } from "./app.js";
import { InMemoryUserStore } from "./auth/store.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

const app = await buildApp(config, { users: new InMemoryUserStore() });

app.log.warn("Hiçbir mekâna cihaz bağlantısı yok: bridge aracısı henüz yazılmadı, cihaz komutları 409 no_connection döner.");
if (config.HOST !== "127.0.0.1" && config.HOST !== "::1") {
  app.log.warn(`Sunucu ${config.HOST} adresinde dinliyor. Yalnızca güvenilir ağ arayüzüne bağlı olmalı ve TLS arkasında çalışmalı.`);
}

await app.listen({ host: config.HOST, port: config.PORT });
