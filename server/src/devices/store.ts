import type { DeviceInput } from "@smart-home/domain";

/** Mekâna bağlı cihaz kaydı. `externalId` yalnızca sunucuda kalır. */
export type StoredDevice = Omit<DeviceInput, "capabilities"> & {
  placeId: string;
  capabilities: string[];
};

export interface DeviceStore {
  list(placeId: string): Promise<StoredDevice[]>;
  /** Cihaz her zaman mekân kapsamında aranır, başka mekânın cihazına ulaşılamaz. */
  get(placeId: string, id: string): Promise<StoredDevice | undefined>;
  count(placeId: string): Promise<number>;
  add(device: StoredDevice): Promise<boolean>;
}

export class InMemoryDeviceStore implements DeviceStore {
  private readonly devices = new Map<string, StoredDevice>();

  private key(placeId: string, id: string): string {
    return `${placeId}:${id}`;
  }

  async list(placeId: string): Promise<StoredDevice[]> {
    return [...this.devices.values()].filter((d) => d.placeId === placeId);
  }

  async get(placeId: string, id: string): Promise<StoredDevice | undefined> {
    return this.devices.get(this.key(placeId, id));
  }

  async count(placeId: string): Promise<number> {
    return (await this.list(placeId)).length;
  }

  async add(device: StoredDevice): Promise<boolean> {
    const key = this.key(device.placeId, device.id);
    if (this.devices.has(key)) return false;
    this.devices.set(key, device);
    return true;
  }
}
