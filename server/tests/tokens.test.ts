import assert from "node:assert/strict";
import { test } from "node:test";
import { SignJWT } from "jose";
import { signAccessToken, verifyAccessToken } from "../src/auth/tokens.js";

const SECRET = "test-secret-test-secret-test-secret-123";
const key = new TextEncoder().encode(SECRET);

function validJwt(): SignJWT {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("smart-home")
    .setAudience("smart-home-clients")
    .setIssuedAt(now)
    .setExpirationTime(now + 60);
}

test("erişim belirteci imzalanır ve doğrulanır, yalnızca kimlik taşır", async () => {
  const token = await signAccessToken(SECRET, { sub: "u1" });
  assert.deepEqual(await verifyAccessToken(SECRET, token), { sub: "u1" });
  const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
  assert.equal("role" in payload, false, "belirteçte küresel rol olmamalı");
});

test("yanlış anahtarla imzalı belirteç reddedilir", async () => {
  const token = await signAccessToken("another-secret-another-secret-123456", { sub: "u1" });
  await assert.rejects(verifyAccessToken(SECRET, token));
});

test("süresi dolmuş belirteç reddedilir", async () => {
  const token = await signAccessToken(SECRET, { sub: "u1" }, -10);
  await assert.rejects(verifyAccessToken(SECRET, token));
});

test("kimlik (sub) olmayan belirteç reddedilir", async () => {
  const token = await validJwt().sign(key);
  await assert.rejects(verifyAccessToken(SECRET, token));
});

test("yanlış issuer veya audience reddedilir", async () => {
  const now = Math.floor(Date.now() / 1000);
  const wrongIssuer = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("u1")
    .setIssuer("baska")
    .setAudience("smart-home-clients")
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(key);
  await assert.rejects(verifyAccessToken(SECRET, wrongIssuer));
  const wrongAudience = await validJwt().setSubject("u1").setAudience("baska").sign(key);
  await assert.rejects(verifyAccessToken(SECRET, wrongAudience));
});

test("alg:none belirteci reddedilir", async () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const forged = `${b64({ alg: "none", typ: "JWT" })}.${b64({
    sub: "u1",
    iss: "smart-home",
    aud: "smart-home-clients",
    exp: now + 60,
  })}.`;
  await assert.rejects(verifyAccessToken(SECRET, forged));
});
