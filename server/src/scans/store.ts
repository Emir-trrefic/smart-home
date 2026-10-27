import { randomUUID } from "node:crypto";
import type { ScanUpload } from "@smart-home/domain";

export interface StoredScan {
  id: string;
  placeId: string;
  uploadedBy: string;
  receivedAt: string;
  scan: ScanUpload;
}

export interface ScanStore {
  add(placeId: string, uploadedBy: string, scan: ScanUpload): Promise<StoredScan>;
  list(placeId: string): Promise<StoredScan[]>;
}

export class InMemoryScanStore implements ScanStore {
  private readonly scans: StoredScan[] = [];

  async add(placeId: string, uploadedBy: string, scan: ScanUpload): Promise<StoredScan> {
    const stored: StoredScan = { id: randomUUID(), placeId, uploadedBy, receivedAt: new Date().toISOString(), scan };
    this.scans.push(stored);
    return stored;
  }

  async list(placeId: string): Promise<StoredScan[]> {
    return this.scans.filter((s) => s.placeId === placeId);
  }
}
