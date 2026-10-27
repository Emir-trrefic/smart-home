import { createHash, randomBytes } from "node:crypto";
import type { InviteRole } from "@smart-home/domain";

export interface Invite {
  /** Davet kodunun SHA-256 özeti. Kodun kendisi saklanmaz. */
  codeHash: string;
  placeId: string;
  role: InviteRole;
  createdBy: string;
  expiresAt: number;
  usedAt?: number;
}

export interface InviteStore {
  create(invite: Invite): Promise<void>;
  /** Atomik: geçerli (kullanılmamış, süresi dolmamış) daveti tek seferlik kullanır ve döndürür. */
  consume(codeHash: string, now: number): Promise<Invite | undefined>;
  countActive(placeId: string, now: number): Promise<number>;
}

export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** 192 bit rastgelelik, tahmin edilemez. */
export function newInviteCode(): { code: string; codeHash: string } {
  const code = randomBytes(24).toString("base64url");
  return { code, codeHash: hashInviteCode(code) };
}

export class InMemoryInviteStore implements InviteStore {
  private readonly invites = new Map<string, Invite>();

  async create(invite: Invite): Promise<void> {
    this.invites.set(invite.codeHash, { ...invite });
  }

  async consume(codeHash: string, now: number): Promise<Invite | undefined> {
    const invite = this.invites.get(codeHash);
    if (!invite || invite.usedAt !== undefined || invite.expiresAt <= now) return undefined;
    invite.usedAt = now;
    return { ...invite };
  }

  async countActive(placeId: string, now: number): Promise<number> {
    let count = 0;
    for (const i of this.invites.values()) {
      if (i.placeId === placeId && i.usedAt === undefined && i.expiresAt > now) count++;
    }
    return count;
  }
}
