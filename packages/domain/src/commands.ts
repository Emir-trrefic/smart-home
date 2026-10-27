import { z } from "zod";
import type { PlaceRole } from "./place.js";

/**
 * Ürün düzeyindeki cihaz türleri. Home Assistant alanından (climate, fan...) bağımsızdır:
 * klima ve kalorifer ikisi de HA'da `climate` olsa da güvenlik sınırları farklıdır.
 */
export const DEVICE_KINDS = [
  "light",
  "switch",
  "air_conditioner",
  "heater",
  "fan",
  "air_purifier",
  "tv",
  "robot_vacuum",
] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];
export const DeviceKindSchema = z.enum(DEVICE_KINDS);

export interface CommandSpec {
  readonly params: z.ZodTypeAny;
}

const byte = z.number().int().min(0).max(255);
const percent = z.number().int().min(0).max(100);
/** Hazır mod ve kaynak adları cihaza özgü serbest metindir, bu yüzden yalnızca karakter kümesi sınırlanır. */
const label = z.string().regex(/^[\p{L}\p{N} _.+-]{1,40}$/u);
const noParams = z.object({}).strict();

const turnOn = { params: noParams } satisfies CommandSpec;
const turnOff = { params: noParams } satisfies CommandSpec;
const setPercentage = { params: z.object({ percentage: percent }).strict() } satisfies CommandSpec;
const setPresetMode = { params: z.object({ preset_mode: label }).strict() } satisfies CommandSpec;

/**
 * İzinli komut kataloğu. İstemci bunun dışında hiçbir komut gönderemez.
 * Parametreler katı doğrulanır, bilinmeyen alan reddedilir.
 *
 * Bilinçli olarak yok: TV için `play_media` ve `browse_media` (içerik ve mahremiyet),
 * kalorifer için kombinin güvenlik mantığına müdahale eden her şey.
 */
export const COMMANDS = {
  light: {
    turn_on: {
      params: z
        .object({ brightness: byte.optional(), rgb_color: z.tuple([byte, byte, byte]).optional() })
        .strict(),
    },
    turn_off: turnOff,
  },
  switch: { turn_on: turnOn, turn_off: turnOff },
  air_conditioner: {
    set_hvac_mode: {
      params: z.object({ hvac_mode: z.enum(["off", "cool", "heat", "dry", "fan_only", "auto"]) }).strict(),
    },
    set_temperature: { params: z.object({ temperature: z.number().min(16).max(30) }).strict() },
  },
  heater: {
    set_hvac_mode: { params: z.object({ hvac_mode: z.enum(["off", "heat", "auto"]) }).strict() },
    set_temperature: { params: z.object({ temperature: z.number().min(5).max(28) }).strict() },
  },
  fan: {
    turn_on: turnOn,
    turn_off: turnOff,
    set_percentage: setPercentage,
    set_preset_mode: setPresetMode,
    oscillate: { params: z.object({ oscillating: z.boolean() }).strict() },
  },
  air_purifier: {
    turn_on: turnOn,
    turn_off: turnOff,
    set_percentage: setPercentage,
    set_preset_mode: setPresetMode,
  },
  tv: {
    turn_on: turnOn,
    turn_off: turnOff,
    volume_up: { params: noParams },
    volume_down: { params: noParams },
    volume_set: { params: z.object({ volume_level: z.number().min(0).max(1) }).strict() },
    volume_mute: { params: z.object({ is_volume_muted: z.boolean() }).strict() },
    select_source: { params: z.object({ source: label }).strict() },
    media_play: { params: noParams },
    media_pause: { params: noParams },
  },
  robot_vacuum: {
    start: { params: noParams },
    pause: { params: noParams },
    stop: { params: noParams },
    return_to_base: { params: noParams },
    locate: { params: noParams },
  },
} as const satisfies Record<DeviceKind, Record<string, CommandSpec>>;

export function commandNames(kind: DeviceKind): string[] {
  return Object.keys(COMMANDS[kind]);
}

/** Rol başına kontrol edebileceği cihaz türleri. Misafir yalnızca ışığı kontrol eder. */
const ROLE_KINDS: Record<PlaceRole, readonly DeviceKind[]> = {
  owner: DEVICE_KINDS,
  member: DEVICE_KINDS,
  guest: ["light"],
};

export function canControl(role: PlaceRole, kind: DeviceKind): boolean {
  return ROLE_KINDS[role].includes(kind);
}

export type ResolveResult =
  | { ok: true; command: string; params: Record<string, unknown> }
  | { ok: false; reason: "forbidden" | "unknown_command" | "not_supported" | "invalid_params" };

/**
 * İstemciden gelen komutu doğrular. Sağlayıcıdan bağımsızdır: sonuç, sağlayıcı adaptörüne
 * (ör. Home Assistant) verilecek doğrulanmış komut ve parametreleridir.
 */
export function resolveCommand(input: {
  role: PlaceRole;
  kind: DeviceKind;
  command: string;
  params: unknown;
  /** Cihazın desteklediği komutlar. Verilmezse türün tüm komutları kabul edilir. */
  capabilities?: readonly string[];
}): ResolveResult {
  if (!canControl(input.role, input.kind)) return { ok: false, reason: "forbidden" };

  const table: Record<string, CommandSpec> = COMMANDS[input.kind];
  const spec = Object.hasOwn(table, input.command) ? table[input.command] : undefined;
  if (!spec) return { ok: false, reason: "unknown_command" };
  if (input.capabilities && !input.capabilities.includes(input.command)) {
    return { ok: false, reason: "not_supported" };
  }

  const parsed = spec.params.safeParse(input.params ?? {});
  if (!parsed.success) return { ok: false, reason: "invalid_params" };
  return { ok: true, command: input.command, params: parsed.data as Record<string, unknown> };
}
