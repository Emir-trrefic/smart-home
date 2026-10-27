import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signAccessToken } from "../auth/tokens.js";
import { LIMITS, STRICT_LIMIT, type Ctx } from "../http/context.js";
import { hashInviteCode } from "../places/invites.js";

const username = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_.@-]{3,64}$/);
const credentials = z.object({ username, password: z.string().min(12).max(256) }).strict();
const loginBody = z
  .object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(256) })
  .strict();
const bootstrapBody = credentials.extend({ bootstrapToken: z.string().min(1).max(256) }).strict();
const registerBody = credentials.extend({ inviteCode: z.string().min(16).max(128) }).strict();
const acceptBody = z.object({ inviteCode: z.string().min(16).max(128) }).strict();

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Sabit sürede karşılaştırma (uzunluk bilgisi de sızmasın diye önce hash'lenir). */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export function registerAuthRoutes(app: FastifyInstance, ctx: Ctx): void {
  const { authenticate } = ctx.guards;

  app.get("/healthz", async () => ({ status: "ok" }));

  /** İlk hesap (platform sahibi). Yalnızca hiç kullanıcı yokken ve sunucudaki tek seferlik belirteçle. */
  app.post("/auth/bootstrap", { config: STRICT_LIMIT }, async (request, reply) => {
    const body = bootstrapBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });
    if ((await ctx.users.count()) > 0) return reply.code(409).send({ error: "already_initialized" });
    if (!safeEqual(body.data.bootstrapToken, ctx.config.BOOTSTRAP_TOKEN)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const user = await ctx.users.create({
      username: body.data.username,
      passwordHash: await hashPassword(body.data.password),
    });
    request.log.info({ event: "bootstrap_user_created", userId: user.id });
    return reply.code(201).send({ id: user.id, username: user.username });
  });

  /**
   * Davetle kayıt. Açık kayıt (e-posta doğrulamalı) ayrı bir aşama, bkz. docs/roadmap.md.
   * Davet kodu tek kullanımlıktır, süresi 72 saattir ve owner rolü veremez.
   */
  app.post("/auth/register", { config: STRICT_LIMIT }, async (request, reply) => {
    const body = registerBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });
    if (await ctx.users.findByUsername(body.data.username)) {
      return reply.code(409).send({ error: "username_taken" });
    }
    const invite = await ctx.invites.consume(hashInviteCode(body.data.inviteCode), ctx.clock());
    if (!invite) return reply.code(401).send({ error: "invalid_invite" });

    const members = await ctx.places.listMembers(invite.placeId);
    if (members.length >= LIMITS.membersPerPlace) return reply.code(409).send({ error: "place_full" });

    const user = await ctx.users.create({
      username: body.data.username,
      passwordHash: await hashPassword(body.data.password),
    });
    await ctx.places.addMember({ placeId: invite.placeId, userId: user.id, role: invite.role });
    request.log.info({ event: "user_registered_by_invite", userId: user.id, placeId: invite.placeId });
    return reply.code(201).send({ id: user.id, username: user.username });
  });

  app.post("/auth/login", { config: STRICT_LIMIT }, async (request, reply) => {
    const body = loginBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_request" });
    const user = await ctx.users.findByUsername(body.data.username);
    const valid = await verifyPassword(body.data.password, user?.passwordHash ?? ctx.dummyHash);
    if (!user || !valid) {
      request.log.warn({ event: "login_failed" });
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const accessToken = await signAccessToken(ctx.config.JWT_SECRET, { sub: user.id });
    return { accessToken, tokenType: "Bearer", expiresIn: 900 };
  });

  app.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const user = request.auth ? await ctx.users.findById(request.auth.sub) : undefined;
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { id: user.id, username: user.username };
  });

  /** Mevcut kullanıcı başka bir mekâna davetle katılır. Davet kullanıldıktan sonra yanar. */
  app.post("/invites/accept", { preHandler: authenticate, config: STRICT_LIMIT }, async (request, reply) => {
    const body = acceptBody.safeParse(request.body);
    if (!body.success || !request.auth) return reply.code(400).send({ error: "invalid_request" });
    const invite = await ctx.invites.consume(hashInviteCode(body.data.inviteCode), ctx.clock());
    if (!invite) return reply.code(401).send({ error: "invalid_invite" });

    const members = await ctx.places.listMembers(invite.placeId);
    if (members.length >= LIMITS.membersPerPlace) return reply.code(409).send({ error: "place_full" });

    const result = await ctx.places.addMember({
      placeId: invite.placeId,
      userId: request.auth.sub,
      role: invite.role,
    });
    if (result === "exists") return reply.code(409).send({ error: "already_member" });
    request.log.info({ event: "invite_accepted", userId: request.auth.sub, placeId: invite.placeId });
    return reply.code(200).send({ placeId: invite.placeId, role: invite.role });
  });
}
