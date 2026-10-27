import assert from "node:assert/strict";
import { test } from "node:test";
import { DeviceInputSchema, PlaceInputSchema, EXPECTED_HA_DOMAIN, DEVICE_KINDS, commandNames, toPublicDevice } from "../src/index.js";

const base = {
  id: "salon-klima",
  name: "Salon klima",
  kind: "air_conditioner",
  provider: "home_assistant",
  externalId: "climate.salon",
};

test("geçerli cihaz kabul edilir", () => {
  assert.equal(DeviceInputSchema.safeParse(base).success, true);
});

test("her tür kendi HA alanıyla kabul edilir", () => {
  for (const kind of DEVICE_KINDS) {
    const device = { ...base, kind, externalId: `${EXPECTED_HA_DOMAIN[kind]}.cihaz_1` };
    assert.equal(DeviceInputSchema.safeParse(device).success, true, kind);
  }
});

test("tür ile varlık alanı uyuşmazsa reddedilir (ışık olarak kilit kaydı)", () => {
  assert.equal(DeviceInputSchema.safeParse({ ...base, kind: "light", externalId: "lock.front_door" }).success, false);
  assert.equal(DeviceInputSchema.safeParse({ ...base, kind: "tv", externalId: "climate.salon" }).success, false);
});

test("bilinmeyen komut yeteneği reddedilir, geçerli alt küme kabul edilir", () => {
  assert.equal(DeviceInputSchema.safeParse({ ...base, capabilities: ["set_temperature"] }).success, true);
  assert.equal(DeviceInputSchema.safeParse({ ...base, capabilities: ["play_media"] }).success, false);
});

test("bozuk kimlik, bilinmeyen alan ve bilinmeyen sağlayıcı reddedilir", () => {
  assert.equal(DeviceInputSchema.safeParse({ ...base, id: "../x" }).success, false);
  assert.equal(DeviceInputSchema.safeParse({ ...base, externalId: "climate.salon/../x" }).success, false);
  assert.equal(DeviceInputSchema.safeParse({ ...base, extra: 1 }).success, false);
  assert.equal(DeviceInputSchema.safeParse({ ...base, provider: "tuya" }).success, false);
});

test("istemci görünümü sağlayıcı ve dış kimlik içermez", () => {
  const view = toPublicDevice({ id: "a", name: "A", kind: "air_conditioner" });
  assert.deepEqual(view.capabilities, commandNames("air_conditioner"));
  const text = JSON.stringify(view);
  assert.ok(!text.includes("externalId") && !text.includes("provider") && !text.includes("climate."));
});

test("mekân girdisi", () => {
  assert.equal(PlaceInputSchema.safeParse({ name: "Ev", kind: "home" }).success, true);
  assert.equal(PlaceInputSchema.safeParse({ name: "Ofis", kind: "office" }).success, true);
  assert.equal(PlaceInputSchema.safeParse({ name: "", kind: "home" }).success, false);
  assert.equal(PlaceInputSchema.safeParse({ name: "X", kind: "castle" }).success, false);
  assert.equal(PlaceInputSchema.safeParse({ name: "X", kind: "home", owner: "me" }).success, false);
});
