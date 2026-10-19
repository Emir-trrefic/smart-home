import assert from "node:assert/strict";
import { test } from "node:test";
import { signAccessToken } from "../src/auth/tokens.js";
import { OWNER, bootstrapOwner, config, makeApp, validScan } from "./helpers.js";

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

test("sağlık ucu açık, güvenlik başlıkları var", async () => {
  const { app } = await makeApp();
  const res = await app.inject({ url: "/healthz" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  await app.close();
});

test("kimliksiz istekler reddedilir", async () => {
  const { app } = await makeApp();
  for (const [method, url] of [
    ["GET", "/me"],
    ["GET", "/devices"],
    ["POST", "/scans"],
    ["POST", "/devices/x/command"],
  ] as const) {
    const res = await app.inject({ method, url, payload: {} });
    assert.equal(res.statusCode, 401, `${method} ${url}`);
  }
  await app.close();
});

test("ilk kurulum: yanlış belirteç reddedilir, doğru belirteç owner oluşturur, ikinci kez kapalı", async () => {
  const { app } = await makeApp();
  const wrong = await app.inject({
    method: "POST",
    url: "/auth/bootstrap",
    payload: { ...OWNER, bootstrapToken: "yanlis-belirtec" },
  });
  assert.equal(wrong.statusCode, 401);

  const ok = await app.inject({
    method: "POST",
    url: "/auth/bootstrap",
    payload: { ...OWNER, bootstrapToken: config.BOOTSTRAP_TOKEN },
  });
  assert.equal(ok.statusCode, 201);
  assert.equal((ok.json() as { role: string }).role, "owner");
  assert.ok(!JSON.stringify(ok.json()).includes("scrypt"), "hash yanıtta olmamalı");

  const again = await app.inject({
    method: "POST",
    url: "/auth/bootstrap",
    payload: { ...OWNER, username: "baska", bootstrapToken: config.BOOTSTRAP_TOKEN },
  });
  assert.equal(again.statusCode, 409);
  await app.close();
});

test("kısa parola ile kurulum reddedilir", async () => {
  const { app } = await makeApp();
  const res = await app.inject({
    method: "POST",
    url: "/auth/bootstrap",
    payload: { username: "emir", password: "kisa", bootstrapToken: config.BOOTSTRAP_TOKEN },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("giriş: yanlış parola ve olmayan kullanıcı aynı yanıtı verir", async () => {
  const { app } = await makeApp();
  await bootstrapOwner(app);
  const wrongPass = await app.inject({ method: "POST", url: "/auth/login", payload: { username: OWNER.username, password: "yanlis parola 123" } });
  const noUser = await app.inject({ method: "POST", url: "/auth/login", payload: { username: "yok", password: "yanlis parola 123" } });
  assert.equal(wrongPass.statusCode, 401);
  assert.equal(noUser.statusCode, 401);
  assert.deepEqual(wrongPass.json(), noUser.json());
  await app.close();
});

test("giriş uç noktası hız sınırlıdır", async () => {
  const { app } = await makeApp();
  const codes: number[] = [];
  for (let i = 0; i < 8; i++) {
    const res = await app.inject({ method: "POST", url: "/auth/login", payload: { username: "x", password: "y" } });
    codes.push(res.statusCode);
  }
  assert.ok(codes.includes(429), `429 bekleniyordu: ${codes.join(",")}`);
  await app.close();
});

test("owner cihaz ekler, komut HA'ya doğru servis çağrısıyla gider, istemci haEntityId görmez", async () => {
  const { app, ha } = await makeApp();
  const token = await bootstrapOwner(app);

  const add = await app.inject({
    method: "POST",
    url: "/devices",
    headers: auth(token),
    payload: { id: "salon-klima", name: "Salon klima", type: "climate", haEntityId: "climate.salon" },
  });
  assert.equal(add.statusCode, 201);

  const list = await app.inject({ url: "/devices", headers: auth(token) });
  assert.ok(!JSON.stringify(list.json()).includes("climate.salon"));

  const cmd = await app.inject({
    method: "POST",
    url: "/devices/salon-klima/command",
    headers: auth(token),
    payload: { command: "set_temperature", params: { temperature: 24 } },
  });
  assert.equal(cmd.statusCode, 202);
  assert.deepEqual(ha.calls, [
    { domain: "climate", service: "set_temperature", data: { entity_id: "climate.salon", temperature: 24 } },
  ]);
  await app.close();
});

test("aralık dışı sıcaklık 400 döner ve HA'ya hiçbir şey gitmez", async () => {
  const { app, ha } = await makeApp();
  const token = await bootstrapOwner(app);
  await app.inject({
    method: "POST",
    url: "/devices",
    headers: auth(token),
    payload: { id: "k", name: "Klima", type: "climate", haEntityId: "climate.k" },
  });
  const res = await app.inject({
    method: "POST",
    url: "/devices/k/command",
    headers: auth(token),
    payload: { command: "set_temperature", params: { temperature: 50 } },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(ha.calls.length, 0);
  await app.close();
});

test("misafir klimayı kontrol edemez (403), cihaz eklemeye de yetkisi yoktur", async () => {
  const { app, ha } = await makeApp();
  const ownerToken = await bootstrapOwner(app);
  await app.inject({
    method: "POST",
    url: "/devices",
    headers: auth(ownerToken),
    payload: { id: "k", name: "Klima", type: "climate", haEntityId: "climate.k" },
  });
  const guestToken = await signAccessToken(config.JWT_SECRET, { sub: "g1", role: "guest" });

  const cmd = await app.inject({
    method: "POST",
    url: "/devices/k/command",
    headers: auth(guestToken),
    payload: { command: "set_hvac_mode", params: { hvac_mode: "off" } },
  });
  assert.equal(cmd.statusCode, 403);
  assert.equal(ha.calls.length, 0);

  const add = await app.inject({
    method: "POST",
    url: "/devices",
    headers: auth(guestToken),
    payload: { id: "x", name: "X", type: "light", haEntityId: "light.x" },
  });
  assert.equal(add.statusCode, 403);
  await app.close();
});

test("olmayan cihaz 404, bozuk kimlik 404", async () => {
  const { app } = await makeApp();
  const token = await bootstrapOwner(app);
  for (const id of ["yok", "..%2Fetc"]) {
    const res = await app.inject({
      method: "POST",
      url: `/devices/${id}/command`,
      headers: auth(token),
      payload: { command: "turn_on" },
    });
    assert.equal(res.statusCode, 404, id);
  }
  await app.close();
});

test("HA hata verirse 502 döner ve iç ayrıntı sızmaz", async () => {
  const { app, ha } = await makeApp();
  ha.callService = async () => {
    throw new Error("HA içi gizli ayrıntı http://ha.local token=ABC");
  };
  const token = await bootstrapOwner(app);
  await app.inject({
    method: "POST",
    url: "/devices",
    headers: auth(token),
    payload: { id: "l", name: "Lamba", type: "light", haEntityId: "light.l" },
  });
  const res = await app.inject({
    method: "POST",
    url: "/devices/l/command",
    headers: auth(token),
    payload: { command: "turn_on" },
  });
  assert.equal(res.statusCode, 502);
  assert.ok(!res.body.includes("ABC") && !res.body.includes("ha.local"));
  await app.close();
});

test("tarama yükleme: geçerli kabul, geçersiz reddedilir, misafir yükleyemez", async () => {
  const { app } = await makeApp();
  const token = await bootstrapOwner(app);

  const ok = await app.inject({ method: "POST", url: "/scans", headers: auth(token), payload: validScan });
  assert.equal(ok.statusCode, 201);

  const bad = await app.inject({
    method: "POST",
    url: "/scans",
    headers: auth(token),
    payload: { ...validScan, version: 99 },
  });
  assert.equal(bad.statusCode, 400);

  const guest = await signAccessToken(config.JWT_SECRET, { sub: "g1", role: "guest" });
  const forbidden = await app.inject({ method: "POST", url: "/scans", headers: auth(guest), payload: validScan });
  assert.equal(forbidden.statusCode, 403);

  const list = await app.inject({ url: "/scans", headers: auth(token) });
  assert.equal((list.json() as unknown[]).length, 1);
  await app.close();
});

test("geçersiz JSON gövdesi 400 döner", async () => {
  const { app } = await makeApp();
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { "content-type": "application/json" },
    payload: "{bozuk json",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});
