import type { FastifyReply, FastifyRequest } from "fastify";
import { IdSchema, type PlaceRole } from "@smart-home/domain";
import { type Claims, verifyAccessToken } from "../auth/tokens.js";
import type { Membership, PlaceStore } from "../places/store.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: Claims;
    membership?: Membership;
  }
}

export function createGuards(jwtSecret: string, places: PlaceStore) {
  /** Geçerli erişim belirteci ister. */
  const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return void reply.code(401).send({ error: "unauthorized" });
    }
    try {
      request.auth = await verifyAccessToken(jwtSecret, header.slice("Bearer ".length));
    } catch {
      return void reply.code(401).send({ error: "unauthorized" });
    }
  };

  /**
   * `:placeId` için çağıranın üyeliğini yükler. Üye değilse mekânın varlığı bile sızmasın diye
   * 403 değil 404 döner. Kiracı izolasyonunun ana kapısı burasıdır.
   */
  const loadMembership = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const raw = (request.params as { placeId?: unknown } | undefined)?.placeId;
    const parsed = IdSchema.safeParse(raw);
    if (!parsed.success || !request.auth) {
      return void reply.code(404).send({ error: "not_found" });
    }
    const membership = await places.getMembership(parsed.data, request.auth.sub);
    if (!membership) {
      return void reply.code(404).send({ error: "not_found" });
    }
    request.membership = membership;
  };

  /** Mekân içindeki rolü kontrol eder. `loadMembership` sonrasında kullanılır. */
  const requireRole =
    (...roles: PlaceRole[]) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.membership || !roles.includes(request.membership.role)) {
        return void reply.code(403).send({ error: "forbidden" });
      }
    };

  return { authenticate, loadMembership, requireRole };
}

export type Guards = ReturnType<typeof createGuards>;
