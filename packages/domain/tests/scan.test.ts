import assert from "node:assert/strict";
import { test } from "node:test";
import { ScanUploadSchema } from "../src/index.js";
import { validScan } from "./fixtures.js";

const clone = () => structuredClone(validScan) as typeof validScan & Record<string, unknown>;

test("geçerli tarama kabul edilir", () => {
  assert.equal(ScanUploadSchema.safeParse(validScan).success, true);
});

test("bilinmeyen alan reddedilir", () => {
  const scan = { ...clone(), extra: "x" };
  assert.equal(ScanUploadSchema.safeParse(scan).success, false);
});

test("bilinmeyen sürüm reddedilir", () => {
  const scan = { ...clone(), version: 2 };
  assert.equal(ScanUploadSchema.safeParse(scan).success, false);
});

test("bilinmeyen kata bağlı oda reddedilir", () => {
  const scan = clone();
  scan.rooms[0]!.levelId = "yok";
  assert.equal(ScanUploadSchema.safeParse(scan).success, false);
});

test("bilinmeyen duvara bağlı kapı reddedilir", () => {
  const scan = clone();
  scan.rooms[0]!.doors[0]!.wallId = "yok";
  assert.equal(ScanUploadSchema.safeParse(scan).success, false);
});

test("sonsuz ve NaN sayılar reddedilir", () => {
  for (const bad of [Number.POSITIVE_INFINITY, Number.NaN, 1e9]) {
    const scan = clone();
    scan.rooms[0]!.walls[0]!.start = [bad, 0];
    assert.equal(ScanUploadSchema.safeParse(scan).success, false, String(bad));
  }
});

test("aşırı büyük diziler reddedilir", () => {
  const scan = clone();
  const wall = scan.rooms[0]!.walls[0]!;
  scan.rooms[0]!.walls = Array.from({ length: 201 }, (_, i) => ({ ...wall, id: `w${i}` }));
  assert.equal(ScanUploadSchema.safeParse(scan).success, false);
});

test("geçersiz kimlik biçimi reddedilir", () => {
  const scan = clone();
  scan.rooms[0]!.id = "../../etc/passwd";
  assert.equal(ScanUploadSchema.safeParse(scan).success, false);
});
