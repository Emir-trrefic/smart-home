import { z } from "zod";
import type { Role } from "../auth/tokens.js";

export const DEVICE_TYPES = ["light", "switch", "climate", "vacuum"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface HaServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

const byte = z.number().int().min(0).max(255);

const noParams = z.object({}).strict().default({});

/**
 * İzinli komut listesi. İstemci HA servis adı göndermez, yalnızca buradaki komutları kullanabilir.
 * Her komutun parametreleri katı doğrulanır (bilinmeyen alan reddedilir).
 */
const commands = {
  light: {
    turn_on: {
      params: z
        .object({
          brightness: byte.optional(),
          rgb_color: z.tuple([byte, byte, byte]).optional(),
        })
        .strict()
        .default({}),
      service: "turn_on",
    },
    turn_off: { params: noParams, service: "turn_off" },
  },
  switch: {
    turn_on: { params: noParams, service: "turn_on" },
    turn_off: { params: noParams, service: "turn_off" },
  },
  climate: {
    set_hvac_mode: {
      params: z
        .object({ hvac_mode: z.enum(["off", "cool", "heat", "dry", "fan_only", "auto"]) })
        .strict(),
      service: "set_hvac_mode",
    },
    set_temperature: {
      params: z.object({ temperature: z.number().min(16).max(30) }).strict(),
      service: "set_temperature",
    },
  },
  vacuum: {
    start: { params: noParams, service: "start" },
    pause: { params: noParams, service: "pause" },
    return_to_base: { params: noParams, service: "return_to_base" },
  },
} as const satisfies Record<DeviceType, Record<string, { params: z.ZodTypeAny; service: string }>>;

/** Rol başına kontrol edebileceği cihaz türleri. */
const ROLE_PERMISSIONS: Record<Role, readonly DeviceType[]> = {
  owner: DEVICE_TYPES,
  member: DEVICE_TYPES,
  guest: ["light"],
};

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;

export type PolicyResult =
  | { ok: true; call: HaServiceCall }
  | { ok: false; reason: "forbidden" | "unknown_command" | "invalid_params" | "invalid_entity" };

export function canControl(role: Role, deviceType: DeviceType): boolean {
  return ROLE_PERMISSIONS[role].includes(deviceType);
}

export function resolveCommand(input: {
  role: Role;
  deviceType: DeviceType;
  haEntityId: string;
  command: string;
  params: unknown;
}): PolicyResult {
  if (!canControl(input.role, input.deviceType)) return { ok: false, reason: "forbidden" };
  if (!ENTITY_ID.test(input.haEntityId)) return { ok: false, reason: "invalid_entity" };

  const table: Record<string, { params: z.ZodTypeAny; service: string }> = commands[input.deviceType];
  const spec = Object.hasOwn(table, input.command) ? table[input.command] : undefined;
  if (!spec) return { ok: false, reason: "unknown_command" };

  const parsed = spec.params.safeParse(input.params ?? {});
  if (!parsed.success) return { ok: false, reason: "invalid_params" };

  return {
    ok: true,
    call: {
      domain: input.deviceType,
      service: spec.service,
      data: { entity_id: input.haEntityId, ...(parsed.data as Record<string, unknown>) },
    },
  };
}
