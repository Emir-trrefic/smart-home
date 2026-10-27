import assert from "node:assert/strict";
import { test } from "node:test";
import { DEVICE_KINDS, EXPECTED_HA_DOMAIN, commandNames } from "@smart-home/domain";
import { toHaServiceCall } from "../src/ha/translate.js";

test("klima sıcaklığı climate.set_temperature olur", () => {
  assert.deepEqual(toHaServiceCall("air_conditioner", "climate.salon", "set_temperature", { temperature: 24 }), {
    domain: "climate",
    service: "set_temperature",
    data: { temperature: 24, entity_id: "climate.salon" },
  });
});

test("kalorifer climate alanına, TV media_player alanına, robot vacuum alanına gider", () => {
  assert.equal(toHaServiceCall("heater", "climate.salon", "set_hvac_mode", { hvac_mode: "heat" }).domain, "climate");
  assert.deepEqual(toHaServiceCall("tv", "media_player.tv", "volume_set", { volume_level: 0.3 }), {
    domain: "media_player",
    service: "volume_set",
    data: { volume_level: 0.3, entity_id: "media_player.tv" },
  });
  assert.equal(toHaServiceCall("robot_vacuum", "vacuum.robot", "return_to_base", {}).domain, "vacuum");
  assert.equal(toHaServiceCall("air_purifier", "fan.hava", "set_percentage", { percentage: 40 }).domain, "fan");
});

test("katalogdaki her komut çevrilebilir ve doğru alana gider", () => {
  for (const kind of DEVICE_KINDS) {
    for (const command of commandNames(kind)) {
      const call = toHaServiceCall(kind, `${EXPECTED_HA_DOMAIN[kind]}.x`, command, {});
      assert.equal(call.domain, EXPECTED_HA_DOMAIN[kind]);
      assert.equal(call.service, command);
    }
  }
});

test("entity_id her zaman sunucunun verdiği değerdir, parametre ezemez", () => {
  const call = toHaServiceCall("light", "light.salon", "turn_on", { entity_id: "lock.front_door" });
  assert.equal(call.data.entity_id, "light.salon");
});

test("katalogda olmayan komut istisna fırlatır", () => {
  assert.throws(() => toHaServiceCall("tv", "media_player.tv", "play_media", {}));
  assert.throws(() => toHaServiceCall("light", "light.x", "__proto__", {}));
});
