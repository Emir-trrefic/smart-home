import { COMMANDS, EXPECTED_HA_DOMAIN, type DeviceKind } from "@smart-home/domain";
import type { HaServiceCall } from "./client.js";

/**
 * Doğrulanmış ürün komutunu Home Assistant servis çağrısına çevirir.
 * Home Assistant için komut adları servis adlarıyla, parametre adları alan adlarıyla birebir aynıdır
 * (ör. climate.set_temperature, media_player.volume_set). Başka sağlayıcılar kendi çeviricisini yazar.
 */
export function toHaServiceCall(
  kind: DeviceKind,
  entityId: string,
  command: string,
  params: Record<string, unknown>,
): HaServiceCall {
  if (!Object.hasOwn(COMMANDS[kind], command)) {
    throw new Error(`Katalogda olmayan komut: ${kind}.${command}`);
  }
  return {
    domain: EXPECTED_HA_DOMAIN[kind],
    service: command,
    data: { ...params, entity_id: entityId },
  };
}
