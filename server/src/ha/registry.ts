import type { HaClient } from "./client.js";

/**
 * Mekân başına cihaz bağlantısı. Sunucu hiçbir zaman kullanıcının verdiği bir adrese istek atmaz
 * (SSRF riski). Gerçek bağlantılar ileride evdeki "bridge" aracısı üzerinden, evden dışarı
 * doğru kurulan bağlantıyla gelecek. Şimdilik yalnızca kod içinden bağlanabilir (test, geliştirme).
 */
export interface ConnectionRegistry {
  forPlace(placeId: string): HaClient | undefined;
}

export class InMemoryConnectionRegistry implements ConnectionRegistry {
  private readonly clients = new Map<string, HaClient>();

  bind(placeId: string, client: HaClient): void {
    this.clients.set(placeId, client);
  }

  forPlace(placeId: string): HaClient | undefined {
    return this.clients.get(placeId);
  }
}
