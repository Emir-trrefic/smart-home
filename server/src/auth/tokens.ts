import { SignJWT, jwtVerify } from "jose";

export const ROLES = ["owner", "member", "guest"] as const;
export type Role = (typeof ROLES)[number];

export interface Claims {
  sub: string;
  role: Role;
}

const ISSUER = "smart-home";
const AUDIENCE = "smart-home-clients";
const ALGORITHM = "HS256";

function keyOf(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export async function signAccessToken(secret: string, claims: Claims, ttlSeconds = 900): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(keyOf(secret));
}

/** Geçersiz, süresi dolmuş veya beklenmeyen biçimdeki belirteçte hata fırlatır. */
export async function verifyAccessToken(secret: string, token: string): Promise<Claims> {
  const { payload } = await jwtVerify(token, keyOf(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: [ALGORITHM],
  });
  if (typeof payload.sub !== "string" || !isRole(payload.role)) {
    throw new Error("Geçersiz belirteç içeriği");
  }
  return { sub: payload.sub, role: payload.role };
}
