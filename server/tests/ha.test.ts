import assert from "node:assert/strict";
import { test } from "node:test";
import { RestHaClient } from "../src/ha/client.js";

type Captured = { url: string; init: { method: string; headers: Record<string, string>; body: string } };

function fakeFetch(status: number, captured: Captured[]) {
  return async (url: string, init: Captured["init"] & { signal: AbortSignal }) => {
    captured.push({ url, init });
    return { ok: status >= 200 && status < 300, status };
  };
}

test("HA REST isteği doğru adrese, token ve gövdeyle gider", async () => {
  const captured: Captured[] = [];
  const client = new RestHaClient("http://ha.local:8123/", "TOKEN123", fakeFetch(200, captured));
  await client.callService({ domain: "light", service: "turn_on", data: { entity_id: "light.salon" } });
  assert.equal(captured[0]?.url, "http://ha.local:8123/api/services/light/turn_on");
  assert.equal(captured[0]?.init.method, "POST");
  assert.equal(captured[0]?.init.headers.Authorization, "Bearer TOKEN123");
  assert.deepEqual(JSON.parse(captured[0]?.init.body ?? "{}"), { entity_id: "light.salon" });
});

test("HA hata kodu istisna fırlatır ve token hata mesajına girmez", async () => {
  const client = new RestHaClient("http://ha.local:8123", "TOKEN123", fakeFetch(401, []));
  await assert.rejects(
    client.callService({ domain: "light", service: "turn_on", data: {} }),
    (err: Error) => err.message.includes("401") && !err.message.includes("TOKEN123"),
  );
});

test("URL yolu enjeksiyonu engellenir", async () => {
  const captured: Captured[] = [];
  const client = new RestHaClient("http://ha.local:8123", "T", fakeFetch(200, captured));
  await assert.rejects(client.callService({ domain: "light/../config", service: "turn_on", data: {} }));
  await assert.rejects(client.callService({ domain: "light", service: "turn_on?x=1", data: {} }));
  assert.equal(captured.length, 0);
});
