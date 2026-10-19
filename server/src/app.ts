import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import type { Config } from "./config.js";
import { hashPassword, verifyPassword } from "./auth/password.js";
import type { UserStore } from "./auth/store.js";
import { type Claims, type Role, signAccessToken, verifyAccessToken } from "./auth/tokens.js";
import type { HaClient } from "./ha/client.js";
import { resolveCommand } from "./policy/commands.js";
import { ScanUploadSchema } from "./scan/schema.js";
import {
  DeviceSchema,
  InMemoryDeviceStore,
  InMemoryScanStore,
  type DeviceStore,
  type ScanStore,
} from "./stores.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: Claims;
  }
}

export interface AppDeps {
  users: UserStore;
  ha: HaClient;
  devices?: DeviceStore;
  scans?: ScanStore;
}

const credentials = z
  .object({
    username: z.string().trim().min(3).max(64),
    password: z.string().min(12).max(256),
  })
  .strict();

const loginBody = z
  .object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(256) })
  .strict();

const bootstrapBody = credentials.extend({ bootstrapToken: z.string().min(1).max(256) }).strict();

const commandBody = z
  .object({ command: z.string().min(1).max(40), params: z.unknown().optional() })
  .strict();

const DEVICE_ID = /^[a-z0-9_-]{1,64}$/;
const STRICT_LIMIT = { rateLimit: { max: 5, timeWindow: "1 minute" } };

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Fastify hata nesnesinden HTTP durum kodunu güvenle okur, bulamazsa 500 döner. */
function statusOf(error: unknown): number {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const code = (error as { statusCode: unknown }).statusCode;
    if (typeof code === "number") return code;
  }
  return 500;
}

/** Sabit sürede karşılaştırma (uzunluk bilgisi de sızmasın diye önce hash'lenir). */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export async function buildApp(config: Config, deps: AppDeps): Promise<FastifyInstance> {
  const devices = deps.devices ?? new InMemoryDeviceStore();
  const scans = deps.scans ?? new InMemoryScanStore();

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

  // Zamanlama farkıyla kullanıcı adı sızmasın diye, kullanıcı yokken de bu hash'e karşı doğrulanır.
  const dummyHash = await hashPassword(randomUUID());

  const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return void reply.code(401).send({ error: "unauthorized" });
    }
    try {
      request.auth = await verifyAccessToken(config.JWT_SECRET, header.slice("Bearer ".length));
    } catch {
      return void reply.code(401).send({ error: "unauthorized" });
    }
  };

  const requireRole =
    (...roles: Role[]) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.auth || !roles.includes(request.auth.role)) {
        return void reply.code(403).send({ error: "forbidden" });
      }
    };

  app.get("/healthz", async () => ({ status: "ok" }));

  app.post("/auth/bootstrap", { config: STRICT_LIMIT }, async (request, reply) => {
    const body = bootstrapBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });
    if ((await deps.users.count()) > 0) return reply.code(409).send({ error: "already_initialized" });
    if (!safeEqual(body.data.bootstrapToken, config.BOOTSTRAP_TOKEN)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const user = await deps.users.create({
      username: body.data.username,
      passwordHash: await hashPassword(body.data.password),
      role: "owner",
    });
    request.log.info({ event: "bootstrap_owner_created", userId: user.id });
    return reply.code(201).send({ id: user.id, username: user.username, role: user.role });
  });

  app.post("/auth/login", { config: STRICT_LIMIT }, async (request, reply) => {
    const body = loginBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });
    const user = await deps.users.findByUsername(body.data.username);
    const valid = await verifyPassword(body.data.password, user?.passwordHash ?? dummyHash);
    if (!user || !valid) {
      request.log.warn({ event: "login_failed" });
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const accessToken = await signAccessToken(config.JWT_SECRET, { sub: user.id, role: user.role });
    return { accessToken, tokenType: "Bearer", expiresIn: 900 };
  });

  app.get("/me", { preHandler: authenticate }, async (request) => ({
    id: request.auth?.sub,
    role: request.auth?.role,
  }));

  app.post(
    "/scans",
    { preHandler: [authenticate, requireRole("owner", "member")], bodyLimit: 5 * 1024 * 1024 },
    async (request, reply) => {
      const body = ScanUploadSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({
          error: "invalid_scan",
          issues: body.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      const stored = await scans.add(request.auth?.sub ?? "unknown", body.data);
      request.log.info({ event: "scan_uploaded", scanId: stored.id, userId: stored.uploadedBy });
      return reply.code(201).send({ id: stored.id });
    },
  );

  app.get("/scans", { preHandler: [authenticate, requireRole("owner", "member")] }, async () => {
    const all = await scans.list();
    return all.map((s) => ({ id: s.id, receivedAt: s.receivedAt, capturedAt: s.scan.capturedAt, rooms: s.scan.rooms.length }));
  });

  app.post("/devices", { preHandler: [authenticate, requireRole("owner")] }, async (request, reply) => {
    const body = DeviceSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_device" });
    try {
      await devices.add(body.data);
    } catch {
      return reply.code(409).send({ error: "device_exists" });
    }
    return reply.code(201).send({ id: body.data.id });
  });

  // haEntityId istemciye verilmez, komutlar yalnızca cihaz kimliği üzerinden gider.
  app.get("/devices", { preHandler: authenticate }, async () => {
    const all = await devices.list();
    return all.map(({ id, name, type, roomId, position }) => ({ id, name, type, roomId, position }));
  });

  app.post<{ Params: { id: string } }>(
    "/devices/:id/command",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params;
      if (!DEVICE_ID.test(id)) return reply.code(404).send({ error: "not_found" });
      const body = commandBody.safeParse(request.body);
      if (!body.success) return reply.code(400).send({ error: "invalid_request" });

      const device = await devices.get(id);
      if (!device || !request.auth) return reply.code(404).send({ error: "not_found" });

      const result = resolveCommand({
        role: request.auth.role,
        deviceType: device.type,
        haEntityId: device.haEntityId,
        command: body.data.command,
        params: body.data.params,
      });
      if (!result.ok) {
        const status = result.reason === "forbidden" ? 403 : result.reason === "invalid_entity" ? 500 : 400;
        return reply.code(status).send({ error: result.reason });
      }

      try {
        await deps.ha.callService(result.call);
      } catch (err) {
        request.log.error({ err, deviceId: id }, "ha call failed");
        return reply.code(502).send({ error: "upstream_error" });
      }
      // Denetim günlüğü: kim, hangi cihaza, hangi komut. Parametre değerleri yazılmaz.
      request.log.info({ event: "device_command", userId: request.auth.sub, deviceId: id, command: body.data.command });
      return reply.code(202).send({ ok: true });
    },
  );

  return app;
}
