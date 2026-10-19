import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/auth/password.js";
import { loadConfig } from "../src/config.js";

test("parola doğru ise doğrulanır, yanlış ise reddedilir", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.ok(hash.startsWith("scrypt$"));
  assert.equal(await verifyPassword("correct horse battery", hash), true);
  assert.equal(await verifyPassword("wrong password!!", hash), false);
});

test("aynı parola iki kez farklı hash üretir (tuz)", async () => {
  const a = await hashPassword("same password 123");
  const b = await hashPassword("same password 123");
  assert.notEqual(a, b);
});

test("bozuk veya kurcalanmış hash reddedilir", async () => {
  assert.equal(await verifyPassword("x", "bozuk"), false);
  assert.equal(await verifyPassword("x", "scrypt$1073741824$8$1$AAAA$AAAA"), false);
  assert.equal(await verifyPassword("x", "bcrypt$32768$8$1$AAAA$AAAA"), false);
});

test("yapılandırma: kısa gizli anahtar reddedilir ve hata değeri içermez", () => {
  assert.throws(
    () => loadConfig({ JWT_SECRET: "kisa-sir", BOOTSTRAP_TOKEN: "x".repeat(24) }),
    (err: Error) => err.message.includes("JWT_SECRET") && !err.message.includes("kisa-sir"),
  );
});

test("yapılandırma: geçerli değerler kabul edilir, HOST varsayılanı yereldir", () => {
  const cfg = loadConfig({ JWT_SECRET: "a".repeat(32), BOOTSTRAP_TOKEN: "b".repeat(24) });
  assert.equal(cfg.HOST, "127.0.0.1");
  assert.equal(cfg.PORT, 3000);
});
