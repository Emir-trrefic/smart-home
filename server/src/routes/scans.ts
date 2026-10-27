import type { FastifyInstance } from "fastify";
import { ScanUploadSchema } from "@smart-home/domain";
import { LIMITS, type Ctx } from "../http/context.js";

export function registerScanRoutes(app: FastifyInstance, ctx: Ctx): void {
  const { authenticate, loadMembership, requireRole } = ctx.guards;
  const writers = [authenticate, loadMembership, requireRole("owner", "member")];

  app.post("/places/:placeId/scans", { preHandler: writers, bodyLimit: LIMITS.scansBodyBytes }, async (request, reply) => {
    const body = ScanUploadSchema.safeParse(request.body);
    const membership = request.membership;
    if (!membership) return reply.code(404).send({ error: "not_found" });
    if (!body.success) {
      return reply.code(400).send({
        error: "invalid_scan",
        issues: body.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const stored = await ctx.scans.add(membership.placeId, membership.userId, body.data);
    request.log.info({ event: "scan_uploaded", scanId: stored.id, userId: membership.userId, placeId: membership.placeId });
    return reply.code(201).send({ id: stored.id });
  });

  /** Mekânın en son planı. Tüm üyeler (misafir dahil) 3D görünüm için okuyabilir. */
  app.get("/places/:placeId/scans/latest", { preHandler: [authenticate, loadMembership] }, async (request, reply) => {
    const placeId = request.membership?.placeId;
    const all = placeId ? await ctx.scans.list(placeId) : [];
    const latest = all[all.length - 1];
    if (!latest) return reply.code(404).send({ error: "not_found" });
    return latest.scan;
  });

  app.get("/places/:placeId/scans", { preHandler: writers }, async (request) => {
    const placeId = request.membership?.placeId;
    const all = placeId ? await ctx.scans.list(placeId) : [];
    return all.map((s) => ({ id: s.id, receivedAt: s.receivedAt, capturedAt: s.scan.capturedAt, rooms: s.scan.rooms.length }));
  });
}
