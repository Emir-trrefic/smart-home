import { buildApp } from "./app.js";
import { InMemoryUserStore } from "./auth/store.js";
import { loadConfig } from "./config.js";
import { MockHaClient, RestHaClient, type HaClient } from "./ha/client.js";

const config = loadConfig();

let ha: HaClient;
if (config.HA_URL && config.HA_TOKEN) {
  ha = new RestHaClient(config.HA_URL, config.HA_TOKEN);
} else {
  console.warn("HA_URL/HA_TOKEN tanımlı değil, komutlar sahte istemciye gidiyor (hiçbir cihaz çalışmaz).");
  ha = new MockHaClient();
}

const app = await buildApp(config, { users: new InMemoryUserStore(), ha });

if (config.HOST !== "127.0.0.1" && config.HOST !== "::1") {
  app.log.warn(`Sunucu ${config.HOST} adresinde dinliyor. Yalnızca ev ağı veya Tailscale arayüzüne bağlı olmalı.`);
}

await app.listen({ host: config.HOST, port: config.PORT });
