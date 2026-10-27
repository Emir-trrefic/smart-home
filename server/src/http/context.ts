import type { UserStore } from "../auth/store.js";
import type { Config } from "../config.js";
import type { DeviceStore } from "../devices/store.js";
import type { ConnectionRegistry } from "../ha/registry.js";
import type { InviteStore } from "../places/invites.js";
import type { PlaceStore } from "../places/store.js";
import type { ScanStore } from "../scans/store.js";
import type { Guards } from "./guards.js";

export interface Ctx {
  config: Config;
  /** Şimdiki zaman (ms). Davet süresi gibi zamana bağlı kuralları test edilebilir kılar. */
  clock: () => number;
  users: UserStore;
  places: PlaceStore;
  invites: InviteStore;
  devices: DeviceStore;
  scans: ScanStore;
  connections: ConnectionRegistry;
  guards: Guards;
  /** Kullanıcı yokken de aynı sürede hash hesaplanması için (kullanıcı adı sızmasın). */
  dummyHash: string;
}

/** Kaba kuvvete açık uçlar için sıkı hız sınırı. */
export const STRICT_LIMIT = { rateLimit: { max: 5, timeWindow: "1 minute" } };

/** Mekân başına üst sınırlar (kötüye kullanım ve bellek koruması). */
export const LIMITS = {
  ownedPlacesPerUser: 10,
  membersPerPlace: 20,
  activeInvitesPerPlace: 20,
  devicesPerPlace: 500,
  scansBodyBytes: 5 * 1024 * 1024,
  inviteTtlMs: 72 * 60 * 60 * 1000,
} as const;
