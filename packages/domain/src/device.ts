import { z } from "zod";
import { type DeviceKind, DeviceKindSchema, commandNames } from "./commands.js";
import { Vec3Schema } from "./geometry.js";
import { IdSchema, NameSchema } from "./ids.js";

/** Cihaza ulaşma yolları. Şu an yalnızca Home Assistant, diğerleri planlı (bkz. docs/integrations.md). */
export const PROVIDERS = ["home_assistant"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** Cihaz türüne göre beklenen Home Assistant alanı. Tür ile varlık uyuşmazsa kayıt reddedilir. */
export const EXPECTED_HA_DOMAIN: Record<DeviceKind, string> = {
  light: "light",
  switch: "switch",
  air_conditioner: "climate",
  heater: "climate",
  fan: "fan",
  air_purifier: "fan",
  tv: "media_player",
  robot_vacuum: "vacuum",
};

export const DeviceInputSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,64}$/),
    name: NameSchema,
    kind: DeviceKindSchema,
    provider: z.enum(PROVIDERS),
    /** Sağlayıcıdaki kimlik. Home Assistant için entity_id. İstemciye hiç gösterilmez. */
    externalId: z.string().regex(/^[a-z_]+\.[a-z0-9_]+$/),
    roomId: IdSchema.optional(),
    position: Vec3Schema.optional(),
    /** Cihazın desteklediği komutlar. Verilmezse türün tüm komutları. */
    capabilities: z.array(z.string().min(1).max(40)).max(20).optional(),
  })
  .strict()
  .superRefine((device, ctx) => {
    const domain = device.externalId.split(".")[0];
    if (domain !== EXPECTED_HA_DOMAIN[device.kind]) {
      ctx.addIssue({
        code: "custom",
        path: ["externalId"],
        message: `${device.kind} türü için ${EXPECTED_HA_DOMAIN[device.kind]}.* bekleniyor`,
      });
    }
    const allowed = commandNames(device.kind);
    device.capabilities?.forEach((capability, i) => {
      if (!allowed.includes(capability)) {
        ctx.addIssue({ code: "custom", path: ["capabilities", i], message: "Bu tür için tanımsız komut" });
      }
    });
  });

export type DeviceInput = z.infer<typeof DeviceInputSchema>;

/** İstemciye gösterilen cihaz görünümü: sağlayıcı ve dış kimlik içermez. */
export interface PublicDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  roomId?: string | undefined;
  position?: [number, number, number] | undefined;
  capabilities: string[];
}

export function toPublicDevice(device: {
  id: string;
  name: string;
  kind: DeviceKind;
  roomId?: string | undefined;
  position?: [number, number, number] | undefined;
  capabilities?: readonly string[] | undefined;
}): PublicDevice {
  return {
    id: device.id,
    name: device.name,
    kind: device.kind,
    roomId: device.roomId,
    position: device.position,
    capabilities: [...(device.capabilities ?? commandNames(device.kind))],
  };
}
