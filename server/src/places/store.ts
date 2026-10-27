import { randomUUID } from "node:crypto";
import type { PlaceKind, PlaceRole } from "@smart-home/domain";

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  createdAt: string;
}

export interface Membership {
  placeId: string;
  userId: string;
  role: PlaceRole;
}

/** Mekân ve üyelik deposu. Tüm yetki kararları buradaki üyelik kaydına dayanır. */
export interface PlaceStore {
  create(input: { name: string; kind: PlaceKind }, ownerId: string): Promise<Place>;
  get(id: string): Promise<Place | undefined>;
  listForUser(userId: string): Promise<Array<{ place: Place; role: PlaceRole }>>;
  countOwnedBy(userId: string): Promise<number>;
  getMembership(placeId: string, userId: string): Promise<Membership | undefined>;
  listMembers(placeId: string): Promise<Membership[]>;
  addMember(membership: Membership): Promise<"added" | "exists">;
  removeMember(placeId: string, userId: string): Promise<boolean>;
}

export class InMemoryPlaceStore implements PlaceStore {
  private readonly places = new Map<string, Place>();
  private readonly members = new Map<string, Membership>();

  private key(placeId: string, userId: string): string {
    return `${placeId}:${userId}`;
  }

  async create(input: { name: string; kind: PlaceKind }, ownerId: string): Promise<Place> {
    const place: Place = { id: randomUUID(), name: input.name, kind: input.kind, createdAt: new Date().toISOString() };
    this.places.set(place.id, place);
    this.members.set(this.key(place.id, ownerId), { placeId: place.id, userId: ownerId, role: "owner" });
    return place;
  }

  async get(id: string): Promise<Place | undefined> {
    return this.places.get(id);
  }

  async listForUser(userId: string): Promise<Array<{ place: Place; role: PlaceRole }>> {
    const result: Array<{ place: Place; role: PlaceRole }> = [];
    for (const m of this.members.values()) {
      if (m.userId !== userId) continue;
      const place = this.places.get(m.placeId);
      if (place) result.push({ place, role: m.role });
    }
    return result;
  }

  async countOwnedBy(userId: string): Promise<number> {
    let count = 0;
    for (const m of this.members.values()) if (m.userId === userId && m.role === "owner") count++;
    return count;
  }

  async getMembership(placeId: string, userId: string): Promise<Membership | undefined> {
    return this.members.get(this.key(placeId, userId));
  }

  async listMembers(placeId: string): Promise<Membership[]> {
    return [...this.members.values()].filter((m) => m.placeId === placeId);
  }

  async addMember(membership: Membership): Promise<"added" | "exists"> {
    const key = this.key(membership.placeId, membership.userId);
    if (this.members.has(key)) return "exists";
    this.members.set(key, { ...membership });
    return "added";
  }

  async removeMember(placeId: string, userId: string): Promise<boolean> {
    return this.members.delete(this.key(placeId, userId));
  }
}
