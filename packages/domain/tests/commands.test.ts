import assert from "node:assert/strict";
import { test } from "node:test";
import { DEVICE_KINDS, COMMANDS, canControl, commandNames, resolveCommand, type DeviceKind, type PlaceRole } from "../src/index.js";

function run(kind: DeviceKind, command: string, params: unknown, role: PlaceRole = "owner", capabilities?: string[]) {
  return resolveCommand({ role, kind, command, params, ...(capabilities ? { capabilities } : {}) });
}

test("klima sıcaklığı 16-30 aralığında kabul edilir", () => {
  assert.deepEqual(run("air_conditioner", "set_temperature", { temperature: 24 }), {
    ok: true,
    command: "set_temperature",
    params: { temperature: 24 },
  });
  assert.equal(run("air_conditioner", "set_temperature", { temperature: 16 }).ok, true);
  assert.equal(run("air_conditioner", "set_temperature", { temperature: 30 }).ok, true);
});

test("klima sıcaklığı aralık dışı veya geçersizse reddedilir", () => {
  for (const temperature of [5, 15.9, 30.1, 100, Number.NaN, "24", null]) {
    assert.deepEqual(
      run("air_conditioner", "set_temperature", { temperature }),
      { ok: false, reason: "invalid_params" },
      String(temperature),
    );
  }
});

test("kalorifer sınırı klimadan daha dardır (5-28)", () => {
  assert.equal(run("heater", "set_temperature", { temperature: 22 }).ok, true);
  assert.equal(run("heater", "set_temperature", { temperature: 5 }).ok, true);
  assert.equal(run("heater", "set_temperature", { temperature: 28 }).ok, true);
  for (const temperature of [4.9, 28.1, 30, 45]) {
    assert.deepEqual(run("heater", "set_temperature", { temperature }), { ok: false, reason: "invalid_params" }, String(temperature));
  }
  assert.equal(run("air_conditioner", "set_temperature", { temperature: 30 }).ok, true);
});

test("kalorifer modları yalnızca off, heat, auto", () => {
  assert.equal(run("heater", "set_hvac_mode", { hvac_mode: "heat" }).ok, true);
  assert.deepEqual(run("heater", "set_hvac_mode", { hvac_mode: "cool" }), { ok: false, reason: "invalid_params" });
  assert.equal(run("air_conditioner", "set_hvac_mode", { hvac_mode: "cool" }).ok, true);
});

test("fan ve hava temizleyici: hız yüzdesi ve hazır mod", () => {
  for (const kind of ["fan", "air_purifier"] as const) {
    assert.equal(run(kind, "set_percentage", { percentage: 50 }).ok, true, kind);
    assert.equal(run(kind, "set_percentage", { percentage: 101 }).ok, false, kind);
    assert.equal(run(kind, "set_percentage", { percentage: 50.5 }).ok, false, kind);
    assert.equal(run(kind, "set_preset_mode", { preset_mode: "Auto" }).ok, true, kind);
    assert.equal(run(kind, "set_preset_mode", { preset_mode: "x; drop" }).ok, false, kind);
  }
  assert.equal(run("fan", "oscillate", { oscillating: true }).ok, true);
  assert.deepEqual(run("air_purifier", "oscillate", { oscillating: true }), { ok: false, reason: "unknown_command" });
});

test("TV: güç, ses, kaynak kabul edilir; içerik komutları yoktur", () => {
  assert.equal(run("tv", "turn_on", {}).ok, true);
  assert.equal(run("tv", "volume_set", { volume_level: 0.4 }).ok, true);
  assert.equal(run("tv", "volume_set", { volume_level: 1.5 }).ok, false);
  assert.equal(run("tv", "volume_mute", { is_volume_muted: true }).ok, true);
  assert.equal(run("tv", "select_source", { source: "HDMI 1" }).ok, true);
  assert.equal(run("tv", "select_source", { source: "Giriş 2" }).ok, true, "Türkçe karakterler");
  for (const command of ["play_media", "browse_media", "search_media", "join", "send_command"]) {
    assert.deepEqual(run("tv", command, {}), { ok: false, reason: "unknown_command" }, command);
  }
});

test("robot süpürge komutları", () => {
  for (const command of ["start", "pause", "stop", "return_to_base", "locate"]) {
    assert.equal(run("robot_vacuum", command, {}).ok, true, command);
  }
  assert.deepEqual(run("robot_vacuum", "send_command", {}), { ok: false, reason: "unknown_command" });
});

test("ışık renk ve parlaklık sınırları", () => {
  assert.equal(run("light", "turn_on", { brightness: 200, rgb_color: [255, 0, 10] }).ok, true);
  assert.equal(run("light", "turn_on", {}).ok, true);
  assert.equal(run("light", "turn_on", undefined).ok, true);
  assert.equal(run("light", "turn_on", { brightness: 300 }).ok, false);
  assert.equal(run("light", "turn_on", { rgb_color: [256, 0, 0] }).ok, false);
});

test("bilinmeyen parametre reddedilir (entity_id ezme girişimi dahil)", () => {
  assert.deepEqual(
    run("air_conditioner", "set_temperature", { temperature: 22, entity_id: "lock.front_door" }),
    { ok: false, reason: "invalid_params" },
  );
  assert.deepEqual(run("robot_vacuum", "start", { x: 1 }), { ok: false, reason: "invalid_params" });
});

test("izinli listede olmayan ve prototip anahtarları reddedilir", () => {
  for (const command of ["delete_automation", "__proto__", "constructor", "toString", "hasOwnProperty", "restart"]) {
    assert.deepEqual(run("air_conditioner", command, {}), { ok: false, reason: "unknown_command" }, command);
  }
  assert.deepEqual(run("light", "set_temperature", { temperature: 22 }), { ok: false, reason: "unknown_command" });
});

test("misafir yalnızca ışığı kontrol edebilir", () => {
  assert.equal(run("light", "turn_on", {}, "guest").ok, true);
  for (const kind of DEVICE_KINDS.filter((k) => k !== "light")) {
    assert.equal(canControl("guest", kind), false, kind);
    const first = commandNames(kind)[0] ?? "";
    assert.deepEqual(run(kind, first, {}, "guest"), { ok: false, reason: "forbidden" }, kind);
  }
});

test("owner ve member tüm türleri kontrol edebilir", () => {
  for (const role of ["owner", "member"] as const) {
    for (const kind of DEVICE_KINDS) assert.equal(canControl(role, kind), true, `${role} ${kind}`);
  }
});

test("cihaz yetenek listesi dışındaki komut reddedilir", () => {
  assert.equal(run("air_conditioner", "set_temperature", { temperature: 22 }, "owner", ["set_temperature"]).ok, true);
  assert.deepEqual(
    run("air_conditioner", "set_hvac_mode", { hvac_mode: "off" }, "owner", ["set_temperature"]),
    { ok: false, reason: "not_supported" },
  );
});

test("her tür için en az bir komut vardır ve katalogda tür eksik yoktur", () => {
  for (const kind of DEVICE_KINDS) {
    assert.ok(commandNames(kind).length > 0, kind);
    assert.ok(kind in COMMANDS, kind);
  }
});
