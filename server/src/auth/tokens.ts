import { SignJWT, jwtVerify } from "jose";

/** Belirteç yalnızca kimliği taşır. Roller mekân başınadır ve her istekte üyelikten okunur. */
export interface Claims {
  sub: string;
}

const ISSUER = "smart-home";
const AUDIENCE = "smart-home-clients";
const ALGORITHM = "HS256";

function keyOf(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(secret: string, claims: Claims, ttlSeconds = 900): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
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
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Geçersiz belirteç içeriği");
  }
  return { sub: payload.sub };
}
