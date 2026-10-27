import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { Config } from "./config.js";
import { hashPassword } from "./auth/password.js";
import { type UserStore } from "./auth/store.js";
import { InMemoryDeviceStore, type DeviceStore } from "./devices/store.js";
import { InMemoryConnectionRegistry, type ConnectionRegistry } from "./ha/registry.js";
import type { Ctx } from "./http/context.js";
import { createGuards } from "./http/guards.js";
import { InMemoryInviteStore, type InviteStore } from "./places/invites.js";
import { InMemoryPlaceStore, type PlaceStore } from "./places/store.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerDeviceRoutes } from "./routes/devices.js";
import { registerPlaceRoutes } from "./routes/places.js";
import { registerScanRoutes } from "./routes/scans.js";
import { InMemoryScanStore, type ScanStore } from "./scans/store.js";

export interface AppDeps {
  users: UserStore;
  places?: PlaceStore;
  invites?: InviteStore;
  devices?: DeviceStore;
  scans?: ScanStore;
  connections?: ConnectionRegistry;
  clock?: () => number;
}

/** Fastify hata nesnesinden HTTP durum kodunu güvenle okur, bulamazsa 500 döner. */
function statusOf(error: unknown): number {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const code = (error as { statusCode: unknown }).statusCode;
    if (typeof code === "number") return code;
  }
  return 500;
}

export async function buildApp(config: Config, deps: AppDeps): Promise<FastifyInstance> {
  const places = deps.places ?? new InMemoryPlaceStore();

  const ctx: Ctx = {
    config,
    clock: deps.clock ?? Date.now,
    users: deps.users,
    places,
    invites: deps.invites ?? new InMemoryInviteStore(),
    devices: deps.devices ?? new InMemoryDeviceStore(),
    scans: deps.scans ?? new InMemoryScanStore(),
    connections: deps.connections ?? new InMemoryConnectionRegistry(),
    guards: createGuards(config.JWT_SECRET, places),
    dummyHash: await hashPassword(randomUUID()),
  };

  const app = Fastify({
    logger:
      config.NODE_ENV === "test"
        ? false
        : { level: "info", redact: ["req.headers.authorization"] },
    bodyLimit: 256 * 1024,
    trustProxy: false,
  });

  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  app.setErrorHandler((error, request, reply) => {
    const status = statusOf(error);
    if (status >= 500) {
      request.log.error({ err: error }, "unhandled error");
      return reply.code(500).send({ error: "internal_error" });
    }
    return reply.code(status).send({ error: "bad_request" });
  });

  registerAuthRoutes(app, ctx);
  registerPlaceRoutes(app, ctx);
  registerDeviceRoutes(app, ctx);
  registerScanRoutes(app, ctx);

  return app;
}
