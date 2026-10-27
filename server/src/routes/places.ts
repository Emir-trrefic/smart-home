import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { IdSchema, InviteRoleSchema, PlaceInputSchema } from "@smart-home/domain";
import { LIMITS, type Ctx } from "../http/context.js";
import { newInviteCode } from "../places/invites.js";

const inviteBody = z.object({ role: InviteRoleSchema }).strict();

export function registerPlaceRoutes(app: FastifyInstance, ctx: Ctx): void {
  const { authenticate, loadMembership, requireRole } = ctx.guards;
  const member = [authenticate, loadMembership];
  const ownerOnly = [authenticate, loadMembership, requireRole("owner")];

  app.post("/places", { preHandler: authenticate }, async (request, reply) => {
    const body = PlaceInputSchema.safeParse(request.body);
    if (!body.success || !request.auth) return reply.code(400).send({ error: "invalid_place" });
    if ((await ctx.places.countOwnedBy(request.auth.sub)) >= LIMITS.ownedPlacesPerUser) {
      return reply.code(409).send({ error: "place_limit" });
    }
    const place = await ctx.places.create(body.data, request.auth.sub);
    request.log.info({ event: "place_created", userId: request.auth.sub, placeId: place.id });
    return reply.code(201).send({ id: place.id, name: place.name, kind: place.kind, role: "owner" });
  });

  app.get("/places", { preHandler: authenticate }, async (request) => {
    const list = request.auth ? await ctx.places.listForUser(request.auth.sub) : [];
    return list.map(({ place, role }) => ({ id: place.id, name: place.name, kind: place.kind, role }));
  });

  app.get("/places/:placeId", { preHandler: member }, async (request, reply) => {
    const membership = request.membership;
    const place = membership ? await ctx.places.get(membership.placeId) : undefined;
    if (!membership || !place) return reply.code(404).send({ error: "not_found" });
    return { id: place.id, name: place.name, kind: place.kind, role: membership.role };
  });

  app.get("/places/:placeId/members", { preHandler: [...member, requireRole("owner", "member")] }, async (request) => {
    const members = await ctx.places.listMembers(request.membership?.placeId ?? "");
    const rows = await Promise.all(
      members.map(async (m) => ({
        userId: m.userId,
        username: (await ctx.users.findById(m.userId))?.username ?? null,
        role: m.role,
      })),
    );
    return rows;
  });

  /** Davet oluşturur. Yalnızca owner. owner rolü davetle verilemez (yetki yükseltmeyi önler). */
  app.post("/places/:placeId/invites", { preHandler: ownerOnly }, async (request, reply) => {
    const body = inviteBody.safeParse(request.body);
    const membership = request.membership;
    if (!body.success || !membership) return reply.code(400).send({ error: "invalid_request" });

    const now = ctx.clock();
    const members = await ctx.places.listMembers(membership.placeId);
    const active = await ctx.invites.countActive(membership.placeId, now);
    if (active >= LIMITS.activeInvitesPerPlace) return reply.code(409).send({ error: "invite_limit" });
    if (members.length + active >= LIMITS.membersPerPlace) return reply.code(409).send({ error: "place_full" });

    const { code, codeHash } = newInviteCode();
    const expiresAt = now + LIMITS.inviteTtlMs;
    await ctx.invites.create({
      codeHash,
      placeId: membership.placeId,
      role: body.data.role,
      createdBy: membership.userId,
      expiresAt,
    });
    request.log.info({ event: "invite_created", userId: membership.userId, placeId: membership.placeId, role: body.data.role });
    return reply.code(201).send({ code, role: body.data.role, expiresAt: new Date(expiresAt).toISOString() });
  });

  /**
   * Üyelikten çıkarma. owner başkalarını çıkarabilir, herkes kendi üyeliğinden çıkabilir.
   * owner mekânda tek sahip olduğu için kendi üyeliğini bırakamaz.
   */
  app.delete<{ Params: { placeId: string; userId: string } }>(
    "/places/:placeId/members/:userId",
    { preHandler: member },
    async (request, reply) => {
      const actor = request.membership;
      const target = IdSchema.safeParse(request.params.userId);
      if (!actor || !target.success) return reply.code(404).send({ error: "not_found" });

      const isSelf = target.data === actor.userId;
      if (!isSelf && actor.role !== "owner") return reply.code(403).send({ error: "forbidden" });

      const targetMembership = await ctx.places.getMembership(actor.placeId, target.data);
      if (!targetMembership) return reply.code(404).send({ error: "not_found" });
      if (targetMembership.role === "owner") return reply.code(409).send({ error: "owner_cannot_be_removed" });

      await ctx.places.removeMember(actor.placeId, target.data);
      request.log.info({ event: "member_removed", userId: actor.userId, placeId: actor.placeId, targetUserId: target.data });
      return reply.code(204).send();
    },
  );
}
