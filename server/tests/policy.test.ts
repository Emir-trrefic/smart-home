import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveCommand } from "../src/policy/commands.js";

const base = { role: "owner" as const, haEntityId: "climate.salon" };

test("klima sıcaklığı izinli aralıkta HA servisine çevrilir", () => {
  const r = resolveCommand({ ...base, deviceType: "climate", command: "set_temperature", params: { temperature: 24 } });
  assert.deepEqual(r, {
    ok: true,
    call: { domain: "climate", service: "set_temperature", data: { entity_id: "climate.salon", temperature: 24 } },
  });
});

test("klima sıcaklığı aralık dışıysa reddedilir", () => {
  for (const temperature of [5, 15.9, 30.1, 100, Number.NaN]) {
    const r = resolveCommand({ ...base, deviceType: "climate", command: "set_temperature", params: { temperature } });
    assert.deepEqual(r, { ok: false, reason: "invalid_params" }, String(temperature));
  }
});

test("bilinmeyen parametre reddedilir (entity_id ezme girişimi dahil)", () => {
  const r = resolveCommand({
    ...base,
    deviceType: "climate",
    command: "set_temperature",
    params: { temperature: 22, entity_id: "lock.front_door" },
  });
  assert.deepEqual(r, { ok: false, reason: "invalid_params" });
});

test("izinli listede olmayan komut reddedilir", () => {
  for (const command of ["delete_automation", "__proto__", "constructor", "toString", "restart"]) {
    const r = resolveCommand({ ...base, deviceType: "climate", command, params: {} });
    assert.deepEqual(r, { ok: false, reason: "unknown_command" }, command);
  }
});

test("başka cihaz türünün komutu reddedilir", () => {
  const r = resolveCommand({ ...base, deviceType: "light", command: "set_temperature", params: { temperature: 22 } });
  assert.deepEqual(r, { ok: false, reason: "unknown_command" });
});

test("misafir yalnızca ışığı kontrol edebilir", () => {
  const light = resolveCommand({ role: "guest", deviceType: "light", haEntityId: "light.salon", command: "turn_on", params: {} });
  assert.equal(light.ok, true);
  const vacuum = resolveCommand({ role: "guest", deviceType: "vacuum", haEntityId: "vacuum.robot", command: "start", params: {} });
  assert.deepEqual(vacuum, { ok: false, reason: "forbidden" });
  const climate = resolveCommand({ role: "guest", deviceType: "climate", haEntityId: "climate.salon", command: "set_hvac_mode", params: { hvac_mode: "off" } });
  assert.deepEqual(climate, { ok: false, reason: "forbidden" });
});

test("ışık renk ve parlaklık sınırları", () => {
  const ok = resolveCommand({ role: "owner", deviceType: "light", haEntityId: "light.led", command: "turn_on", params: { brightness: 200, rgb_color: [255, 0, 10] } });
  assert.equal(ok.ok, true);
  const bad = resolveCommand({ role: "owner", deviceType: "light", haEntityId: "light.led", command: "turn_on", params: { brightness: 300 } });
  assert.deepEqual(bad, { ok: false, reason: "invalid_params" });
  const badColor = resolveCommand({ role: "owner", deviceType: "light", haEntityId: "light.led", command: "turn_on", params: { rgb_color: [256, 0, 0] } });
  assert.deepEqual(badColor, { ok: false, reason: "invalid_params" });
});

test("geçersiz entity kimliği reddedilir", () => {
  for (const haEntityId of ["../config", "light.salon/../x", "LIGHT.Salon", "light", ""]) {
    const r = resolveCommand({ role: "owner", deviceType: "light", haEntityId, command: "turn_off", params: {} });
    assert.deepEqual(r, { ok: false, reason: "invalid_entity" }, haEntityId);
  }
});

test("parametresiz komutlara parametre verilirse reddedilir", () => {
  const r = resolveCommand({ role: "owner", deviceType: "vacuum", haEntityId: "vacuum.robot", command: "start", params: { x: 1 } });
  assert.deepEqual(r, { ok: false, reason: "invalid_params" });
});
