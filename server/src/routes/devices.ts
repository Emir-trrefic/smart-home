import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DeviceInputSchema, IdSchema, canControl, commandNames, resolveCommand, toPublicDevice } from "@smart-home/domain";
import { LIMITS, type Ctx } from "../http/context.js";
import { toHaServiceCall } from "../ha/translate.js";

const commandBody = z.object({ command: z.string().min(1).max(40), params: z.unknown().optional() }).strict();

export function registerDeviceRoutes(app: FastifyInstance, ctx: Ctx): void {
  const { authenticate, loadMembership, requireRole } = ctx.guards;
  const member = [authenticate, loadMembership];

  /** Cihaz kaydı. Yalnızca owner. Tür ile Home Assistant alanı uyuşmalı, yetenekler katalogda olmalı. */
  app.post("/places/:placeId/devices", { preHandler: [...member, requireRole("owner")] }, async (request, reply) => {
    const body = DeviceInputSchema.safeParse(request.body);
    const membership = request.membership;
    if (!body.success || !membership) {
      return reply.code(400).send({
        error: "invalid_device",
        issues: body.success ? [] : body.error.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    if ((await ctx.devices.count(membership.placeId)) >= LIMITS.devicesPerPlace) {
      return reply.code(409).send({ error: "device_limit" });
    }
    const added = await ctx.devices.add({
      ...body.data,
      placeId: membership.placeId,
      capabilities: body.data.capabilities ?? commandNames(body.data.kind),
    });
    if (!added) return reply.code(409).send({ error: "device_exists" });
    request.log.info({ event: "device_added", userId: membership.userId, placeId: membership.placeId, deviceId: body.data.id });
    return reply.code(201).send({ id: body.data.id });
  });

  /** Cihaz listesi. Sağlayıcı ve dış kimlik gösterilmez, kişi yalnızca kontrol edebildiği türleri görür. */
  app.get("/places/:placeId/devices", { preHandler: member }, async (request) => {
    const membership = request.membership;
    if (!membership) return [];
    const all = await ctx.devices.list(membership.placeId);
    return all.filter((d) => canControl(membership.role, d.kind)).map((d) => toPublicDevice(d));
  });

  app.post<{ Params: { placeId: string; deviceId: string } }>(
    "/places/:placeId/devices/:deviceId/command",
    { preHandler: member },
    async (request, reply) => {
      const membership = request.membership;
      const deviceId = IdSchema.safeParse(request.params.deviceId);
      const body = commandBody.safeParse(request.body);
      if (!membership || !deviceId.success) return reply.code(404).send({ error: "not_found" });
      if (!body.success) return reply.code(400).send({ error: "invalid_request" });

      // Cihaz her zaman bu mekân kapsamında aranır: başka mekânın cihaz kimliği 404 verir.
      const device = await ctx.devices.get(membership.placeId, deviceId.data);
      if (!device) return reply.code(404).send({ error: "not_found" });

      const result = resolveCommand({
        role: membership.role,
        kind: device.kind,
        command: body.data.command,
        params: body.data.params,
        capabilities: device.capabilities,
      });
      if (!result.ok) {
        return reply.code(result.reason === "forbidden" ? 403 : 400).send({ error: result.reason });
      }

      const client = ctx.connections.forPlace(membership.placeId);
      if (!client) return reply.code(409).send({ error: "no_connection" });

      try {
        await client.callService(toHaServiceCall(device.kind, device.externalId, result.command, result.params));
      } catch (err) {
        request.log.error({ err, deviceId: device.id, placeId: membership.placeId }, "provider call failed");
        return reply.code(502).send({ error: "upstream_error" });
      }
      // Denetim günlüğü: kim, hangi mekân ve cihaz, hangi komut. Parametre değerleri yazılmaz.
      request.log.info({
        event: "device_command",
        userId: membership.userId,
        placeId: membership.placeId,
        deviceId: device.id,
        command: result.command,
      });
      return reply.code(202).send({ ok: true });
    },
  );
}
