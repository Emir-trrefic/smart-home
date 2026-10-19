import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

type ScryptOptions = { N: number; r: number; p: number; maxmem: number };

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_ACCEPTED_N = 2 ** 17; // kurcalanmış hash ile aşırı bellek harcatılmasını önler

function maxmem(n: number, r: number): number {
  return 128 * n * r * 2;
}

/** Biçim: scrypt$N$r$p$salt(base64)$anahtar(base64) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: maxmem(N, R) });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltB64 = parts[4];
  const keyB64 = parts[5];
  if (!saltB64 || !keyB64) return false;
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (n < 2 ** 14 || n > MAX_ACCEPTED_N || r < 1 || r > 16 || p < 1 || p > 4) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(keyB64, "base64");
  if (expected.length === 0) return false;

  const key = await scrypt(password, salt, expected.length, { N: n, r, p, maxmem: maxmem(n, r) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
