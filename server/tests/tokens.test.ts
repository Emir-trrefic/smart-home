import assert from "node:assert/strict";
import { test } from "node:test";
import { SignJWT } from "jose";
import { signAccessToken, verifyAccessToken } from "../src/auth/tokens.js";

const SECRET = "test-secret-test-secret-test-secret-123";

test("erişim belirteci imzalanır ve doğrulanır", async () => {
  const token = await signAccessToken(SECRET, { sub: "u1", role: "member" });
  assert.deepEqual(await verifyAccessToken(SECRET, token), { sub: "u1", role: "member" });
});

test("yanlış anahtarla imzalı belirteç reddedilir", async () => {
  const token = await signAccessToken("another-secret-another-secret-123456", { sub: "u1", role: "owner" });
  await assert.rejects(verifyAccessToken(SECRET, token));
});

test("süresi dolmuş belirteç reddedilir", async () => {
  const token = await signAccessToken(SECRET, { sub: "u1", role: "owner" }, -10);
  await assert.rejects(verifyAccessToken(SECRET, token));
});

test("geçersiz rol içeren belirteç reddedilir", async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("u1")
    .setIssuer("smart-home")
    .setAudience("smart-home-clients")
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(new TextEncoder().encode(SECRET));
  await assert.rejects(verifyAccessToken(SECRET, token));
});

test("alg:none belirteci reddedilir", async () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const forged = `${b64({ alg: "none", typ: "JWT" })}.${b64({
    sub: "u1",
    role: "owner",
    iss: "smart-home",
    aud: "smart-home-clients",
    exp: now + 60,
  })}.`;
  await assert.rejects(verifyAccessToken(SECRET, forged));
});
