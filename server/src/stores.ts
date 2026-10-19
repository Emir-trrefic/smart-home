import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DEVICE_TYPES } from "./policy/commands.js";
import type { ScanUpload } from "./scan/schema.js";

export const DeviceSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,64}$/),
    name: z.string().trim().min(1).max(80),
    type: z.enum(DEVICE_TYPES),
    haEntityId: z.string().regex(/^[a-z_]+\.[a-z0-9_]+$/),
    roomId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
    position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  })
  .strict();

export type Device = z.infer<typeof DeviceSchema>;

export interface DeviceStore {
  list(): Promise<Device[]>;
  get(id: string): Promise<Device | undefined>;
  add(device: Device): Promise<void>;
}

export class InMemoryDeviceStore implements DeviceStore {
  private readonly devices = new Map<string, Device>();

  async list(): Promise<Device[]> {
    return [...this.devices.values()];
  }

  async get(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async add(device: Device): Promise<void> {
    if (this.devices.has(device.id)) throw new Error("Cihaz zaten var");
    this.devices.set(device.id, device);
  }
}

export interface StoredScan {
  id: string;
  uploadedBy: string;
  receivedAt: string;
  scan: ScanUpload;
}

export interface ScanStore {
  add(uploadedBy: string, scan: ScanUpload): Promise<StoredScan>;
  list(): Promise<StoredScan[]>;
}

export class InMemoryScanStore implements ScanStore {
  private readonly scans: StoredScan[] = [];

  async add(uploadedBy: string, scan: ScanUpload): Promise<StoredScan> {
    const stored: StoredScan = { id: randomUUID(), uploadedBy, receivedAt: new Date().toISOString(), scan };
    this.scans.push(stored);
    return stored;
  }

  async list(): Promise<StoredScan[]> {
    return [...this.scans];
  }
}
