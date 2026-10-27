import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PASSWORD,
  addDevice,
  auth,
  climate,
  config,
  createPlace,
  createUser,
  heater,
  invite,
  lamp,
  login,
  makeEnv,
  registerWithInvite,
  validScan,
} from "./helpers.js";

// ---------- Temel ----------

test("sağlık ucu açık, güvenlik başlıkları var", async () => {
  const env = await makeEnv();
  const res = await env.app.inject({ url: "/healthz" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  await env.app.close();
});

test("kimliksiz istekler reddedilir", async () => {
  const env = await makeEnv();
  for (const [method, url] of [
    ["GET", "/me"],
    ["GET", "/places"],
    ["POST", "/places"],
    ["GET", "/places/x"],
    ["GET", "/places/x/devices"],
    ["POST", "/places/x/devices"],
    ["POST", "/places/x/devices/y/command"],
    ["POST", "/places/x/scans"],
    ["POST", "/places/x/invites"],
    ["POST", "/invites/accept"],
  ] as const) {
    const res = await env.app.inject({ method, url, payload: {} });
    assert.equal(res.statusCode, 401, `${method} ${url}`);
  }
  await env.app.close();
});

test("geçersiz JSON gövdesi 400 döner", async () => {
  const env = await makeEnv();
  const res = await env.app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { "content-type": "application/json" },
    payload: "{bozuk json",
  });
  assert.equal(res.statusCode, 400);
  await env.app.close();
});

// ---------- Kimlik ----------

test("ilk kurulum: yanlış belirteç reddedilir, doğru belirteç hesap açar, ikinci kez kapalı", async () => {
  const env = await makeEnv();
  const wrong = await env.app.inject({
    method: "POST",
    url: "/auth/bootstrap",
    payload: { username: "emir", password: PASSWORD, bootstrapToken: "yanlis-belirtec" },
  });
  assert.equal(wrong.statusCode, 401);

  const ok = await env.app.inject({
    method: "POST",
    url: "/auth/bootstrap",
    payload: { username: "emir", password: PASSWORD, bootstrapToken: config.BOOTSTRAP_TOKEN },
  });
  assert.equal(ok.statusCode, 201);
  assert.ok(!ok.body.includes("scrypt"), "hash yanıtta olmamalı");

  const again = await env.app.inject({
    method: "POST",
    url: "/auth/bootstrap",
    payload: { username: "baska", password: PASSWORD, bootstrapToken: config.BOOTSTRAP_TOKEN },
  });
  assert.equal(again.statusCode, 409);
  await env.app.close();
});

test("kısa parola ve geçersiz kullanıcı adı reddedilir", async () => {
  const env = await makeEnv();
  for (const payload of [
    { username: "emir", password: "kisa" },
    { username: "a b", password: PASSWORD },
    { username: "x", password: PASSWORD },
  ]) {
    const res = await env.app.inject({
      method: "POST",
      url: "/auth/bootstrap",
      payload: { ...payload, bootstrapToken: config.BOOTSTRAP_TOKEN },
    });
    assert.equal(res.statusCode, 400, JSON.stringify(payload));
  }
  await env.app.close();
});

test("giriş: yanlış parola ve olmayan kullanıcı aynı yanıtı verir, /me çalışır", async () => {
  const env = await makeEnv();
  await createUser(env, "emir");
  const wrongPass = await env.app.inject({ method: "POST", url: "/auth/login", payload: { username: "emir", password: "yanlis parola 123" } });
  const noUser = await env.app.inject({ method: "POST", url: "/auth/login", payload: { username: "yok", password: "yanlis parola 123" } });
  assert.equal(wrongPass.statusCode, 401);
  assert.equal(noUser.statusCode, 401);
  assert.deepEqual(wrongPass.json(), noUser.json());

  const token = await login(env, "emir");
  const me = await env.app.inject({ url: "/me", headers: auth(token) });
  assert.equal(me.statusCode, 200);
  assert.equal((me.json() as { username: string }).username, "emir");
  assert.ok(!me.body.includes("scrypt"));
  await env.app.close();
});

test("giriş uç noktası hız sınırlıdır", async () => {
  const env = await makeEnv();
  const codes: number[] = [];
  for (let i = 0; i < 8; i++) {
    const res = await env.app.inject({ method: "POST", url: "/auth/login", payload: { username: "x", password: "y" } });
    codes.push(res.statusCode);
  }
  assert.ok(codes.includes(429), `429 bekleniyordu: ${codes.join(",")}`);
  await env.app.close();
});

// ---------- Mekânlar ----------

test("kullanıcı mekân oluşturur, owner olur ve listesinde görür", async () => {
  const env = await makeEnv();
  const emir = await createUser(env, "emir");
  const evId = await createPlace(env, emir.token, "Ev", "home");
  const ofisId = await createPlace(env, emir.token, "Ofis", "office");

  const list = await env.app.inject({ url: "/places", headers: auth(emir.token) });
  const rows = list.json() as Array<{ id: string; kind: string; role: string }>;
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.role === "owner"));
  assert.deepEqual(rows.map((r) => r.id).sort(), [evId, ofisId].sort());

  const bad = await env.app.inject({ method: "POST", url: "/places", headers: auth(emir.token), payload: { name: "", kind: "home" } });
  assert.equal(bad.statusCode, 400);
  await env.app.close();
});

test("kullanıcı başına sahip olunabilecek mekân sayısı sınırlıdır", async () => {
  const env = await makeEnv();
  const emir = await createUser(env, "emir");
  for (let i = 0; i < 10; i++) await createPlace(env, emir.token, `Yer ${i}`);
  const res = await env.app.inject({ method: "POST", url: "/places", headers: auth(emir.token), payload: { name: "Fazla", kind: "home" } });
  assert.equal(res.statusCode, 409);
  assert.equal((res.json() as { error: string }).error, "place_limit");
  await env.app.close();
});

// ---------- Kiracı izolasyonu ----------

test("başka kullanıcının mekânına hiçbir uçtan erişilemez (404), kendi listesinde görünmez", async () => {
  const env = await makeEnv();
  const a = await createUser(env, "ayse");
  const b = await createUser(env, "can");
  const placeA = await createPlace(env, a.token, "Ayşe'nin evi");
  await addDevice(env, a.token, placeA, lamp);
  env.connections.bind(placeA, env.ha);

  const probes: Array<[string, string, unknown]> = [
    ["GET", `/places/${placeA}`, undefined],
    ["GET", `/places/${placeA}/devices`, undefined],
    ["POST", `/places/${placeA}/devices`, { provider: "home_assistant", ...climate }],
    ["POST", `/places/${placeA}/devices/${lamp.id}/command`, { command: "turn_on" }],
    ["GET", `/places/${placeA}/members`, undefined],
    ["POST", `/places/${placeA}/invites`, { role: "member" }],
    ["GET", `/places/${placeA}/scans`, undefined],
    ["POST", `/places/${placeA}/scans`, validScan],
  ];
  for (const [method, url, payload] of probes) {
    const res = await env.app.inject({ method: method as "GET" | "POST", url, headers: auth(b.token), ...(payload ? { payload: payload as object } : {}) });
    assert.equal(res.statusCode, 404, `${method} ${url}`);
  }
  assert.equal(env.ha.calls.length, 0, "yetkisiz istek HA'ya ulaşmamalı");

  const bList = await env.app.inject({ url: "/places", headers: auth(b.token) });
  assert.deepEqual(bList.json(), []);
  await env.app.close();
});

test("cihaz kimliği mekânlar arasında geçmez (IDOR)", async () => {
  const env = await makeEnv();
  const a = await createUser(env, "ayse");
  const b = await createUser(env, "can");
  const placeA = await createPlace(env, a.token);
  const placeB = await createPlace(env, b.token);
  await addDevice(env, a.token, placeA, lamp);
  env.connections.bind(placeA, env.ha);
  env.connections.bind(placeB, env.ha);

  // Can kendi mekânında, Ayşe'nin cihaz kimliğini dener.
  const res = await env.app.inject({
    method: "POST",
    url: `/places/${placeB}/devices/${lamp.id}/command`,
    headers: auth(b.token),
    payload: { command: "turn_on" },
  });
  assert.equal(res.statusCode, 404);
  assert.equal(env.ha.calls.length, 0);
  await env.app.close();
});

test("aynı cihaz kimliği farklı mekânlarda ayrı cihazdır", async () => {
  const env = await makeEnv();
  const a = await createUser(env, "ayse");
  const b = await createUser(env, "can");
  const placeA = await createPlace(env, a.token);
  const placeB = await createPlace(env, b.token);
  assert.equal(await addDevice(env, a.token, placeA, lamp), 201);
  assert.equal(await addDevice(env, b.token, placeB, lamp), 201);
  assert.equal(await addDevice(env, b.token, placeB, lamp), 409);
  await env.app.close();
});

// ---------- Davetler ve üyelik ----------

test("davetle misafir katılır: kayıt, rol ve yetkiler", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  await addDevice(env, owner.token, placeId, lamp);
  await addDevice(env, owner.token, placeId, climate);
  env.connections.bind(placeId, env.ha);

  const code = await invite(env, owner.token, placeId, "guest");
  const reg = await registerWithInvite(env, "misafir", code);
  assert.equal(reg.statusCode, 201);
  const guestToken = await login(env, "misafir");

  const places = await env.app.inject({ url: "/places", headers: auth(guestToken) });
  assert.deepEqual((places.json() as Array<{ role: string }>).map((p) => p.role), ["guest"]);

  // Misafir yalnızca ışığı görür ve kontrol eder.
  const devices = await env.app.inject({ url: `/places/${placeId}/devices`, headers: auth(guestToken) });
  assert.deepEqual((devices.json() as Array<{ id: string }>).map((d) => d.id), [lamp.id]);

  const light = await env.app.inject({ method: "POST", url: `/places/${placeId}/devices/${lamp.id}/command`, headers: auth(guestToken), payload: { command: "turn_on" } });
  assert.equal(light.statusCode, 202);
  const ac = await env.app.inject({ method: "POST", url: `/places/${placeId}/devices/${climate.id}/command`, headers: auth(guestToken), payload: { command: "set_hvac_mode", params: { hvac_mode: "off" } } });
  assert.equal(ac.statusCode, 403);

  // Cihaz ekleyemez, davet oluşturamaz, üyeleri göremez, tarama yükleyemez.
  assert.equal(await addDevice(env, guestToken, placeId, { ...lamp, id: "x" }), 403);
  const inv = await env.app.inject({ method: "POST", url: `/places/${placeId}/invites`, headers: auth(guestToken), payload: { role: "guest" } });
  assert.equal(inv.statusCode, 403);
  const members = await env.app.inject({ url: `/places/${placeId}/members`, headers: auth(guestToken) });
  assert.equal(members.statusCode, 403);
  const scan = await env.app.inject({ method: "POST", url: `/places/${placeId}/scans`, headers: auth(guestToken), payload: validScan });
  assert.equal(scan.statusCode, 403);
  await env.app.close();
});

test("davet tek kullanımlıktır, süresi dolar, owner rolü verilemez", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);

  const code = await invite(env, owner.token, placeId, "member");
  assert.equal((await registerWithInvite(env, "uye1", code)).statusCode, 201);
  const reuse = await registerWithInvite(env, "uye2", code);
  assert.equal(reuse.statusCode, 401);

  const expiring = await invite(env, owner.token, placeId, "guest");
  env.advance(73 * 60 * 60 * 1000);
  const late = await registerWithInvite(env, "gec", expiring);
  assert.equal(late.statusCode, 401);

  const escalate = await env.app.inject({ method: "POST", url: `/places/${placeId}/invites`, headers: auth(owner.token), payload: { role: "owner" } });
  assert.equal(escalate.statusCode, 400);
  const unknownCode = await registerWithInvite(env, "yeni", "bu-kod-gecerli-degil-0123456789");
  assert.equal(unknownCode.statusCode, 401);
  await env.app.close();
});

test("alınmış kullanıcı adı 409 verir ve daveti harcamaz", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  const code = await invite(env, owner.token, placeId, "guest");
  const taken = await registerWithInvite(env, "sahip", code);
  assert.equal(taken.statusCode, 409);
  // Davet harcanmamış olmalı.
  assert.equal((await registerWithInvite(env, "misafir", code)).statusCode, 201);
  await env.app.close();
});

test("mevcut kullanıcı davetle ikinci bir mekâna katılır, tekrar katılamaz", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const other = await createUser(env, "diger");
  const placeId = await createPlace(env, owner.token, "Ofis", "office");

  const code = await invite(env, owner.token, placeId, "member");
  const accepted = await env.app.inject({ method: "POST", url: "/invites/accept", headers: auth(other.token), payload: { inviteCode: code } });
  assert.equal(accepted.statusCode, 200);
  assert.deepEqual(accepted.json(), { placeId, role: "member" });

  const second = await invite(env, owner.token, placeId, "member");
  const again = await env.app.inject({ method: "POST", url: "/invites/accept", headers: auth(other.token), payload: { inviteCode: second } });
  assert.equal(again.statusCode, 409);
  await env.app.close();
});

test("aktif davet sayısı sınırlıdır", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  for (let i = 0; i < 19; i++) await invite(env, owner.token, placeId, "guest");
  // 1 üye + 19 davet = 20: sınıra ulaşıldı.
  const res = await env.app.inject({ method: "POST", url: `/places/${placeId}/invites`, headers: auth(owner.token), payload: { role: "guest" } });
  assert.equal(res.statusCode, 409);
  await env.app.close();
});

test("üye yönetimi: listeleme, çıkarma, kendi kendine ayrılma, owner korunur", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);

  const m1 = await registerWithInvite(env, "uye1", await invite(env, owner.token, placeId, "member"));
  const m2 = await registerWithInvite(env, "uye2", await invite(env, owner.token, placeId, "member"));
  const member1 = (m1.json() as { id: string }).id;
  const member2 = (m2.json() as { id: string }).id;
  const token1 = await login(env, "uye1");

  const list = await env.app.inject({ url: `/places/${placeId}/members`, headers: auth(owner.token) });
  const rows = list.json() as Array<{ username: string; role: string }>;
  assert.deepEqual(rows.map((r) => r.username).sort(), ["sahip", "uye1", "uye2"]);
  assert.ok(!list.body.includes("scrypt"));

  // Üye başkasını çıkaramaz.
  const forbidden = await env.app.inject({ method: "DELETE", url: `/places/${placeId}/members/${member2}`, headers: auth(token1) });
  assert.equal(forbidden.statusCode, 403);
  // Owner kendini çıkaramaz.
  const ownerSelf = await env.app.inject({ method: "DELETE", url: `/places/${placeId}/members/${owner.id}`, headers: auth(owner.token) });
  assert.equal(ownerSelf.statusCode, 409);
  // Owner üyeyi çıkarır, çıkarılan kişi mekâna erişimini kaybeder.
  const removed = await env.app.inject({ method: "DELETE", url: `/places/${placeId}/members/${member2}`, headers: auth(owner.token) });
  assert.equal(removed.statusCode, 204);
  const token2 = await login(env, "uye2");
  const after = await env.app.inject({ url: `/places/${placeId}`, headers: auth(token2) });
  assert.equal(after.statusCode, 404);
  // Üye kendi isteğiyle ayrılır.
  const leave = await env.app.inject({ method: "DELETE", url: `/places/${placeId}/members/${member1}`, headers: auth(token1) });
  assert.equal(leave.statusCode, 204);
  const gone = await env.app.inject({ url: `/places/${placeId}`, headers: auth(token1) });
  assert.equal(gone.statusCode, 404);
  await env.app.close();
});

// ---------- Cihazlar ----------

test("cihaz kaydı: yalnızca owner, tür ile alan uyuşmalı, yetenekler katalogda olmalı", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);

  assert.equal(await addDevice(env, owner.token, placeId, climate), 201);
  assert.equal(await addDevice(env, owner.token, placeId, climate), 409);
  // Işık olarak kilit kaydetmeye çalışma.
  assert.equal(await addDevice(env, owner.token, placeId, { id: "kilit", name: "Kilit", kind: "light", externalId: "lock.front_door" }), 400);
  // Katalogda olmayan yetenek.
  assert.equal(await addDevice(env, owner.token, placeId, { id: "tv", name: "TV", kind: "tv", externalId: "media_player.tv", capabilities: ["play_media"] }), 400);
  // Bilinmeyen tür.
  assert.equal(await addDevice(env, owner.token, placeId, { id: "kapi", name: "Kapı", kind: "door_lock", externalId: "lock.x" }), 400);
  await env.app.close();
});

test("cihaz listesi dış kimlik ve sağlayıcı göstermez, yetenekleri verir", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  await addDevice(env, owner.token, placeId, climate);
  const res = await env.app.inject({ url: `/places/${placeId}/devices`, headers: auth(owner.token) });
  assert.ok(!res.body.includes("climate.salon"));
  assert.ok(!res.body.includes("home_assistant"));
  const [device] = res.json() as Array<{ kind: string; capabilities: string[] }>;
  assert.equal(device?.kind, "air_conditioner");
  assert.deepEqual(device?.capabilities, ["set_hvac_mode", "set_temperature"]);
  await env.app.close();
});

// ---------- Komutlar ----------

test("klima komutu doğru servis çağrısıyla sağlayıcıya gider", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  await addDevice(env, owner.token, placeId, climate);
  env.connections.bind(placeId, env.ha);

  const res = await env.app.inject({
    method: "POST",
    url: `/places/${placeId}/devices/${climate.id}/command`,
    headers: auth(owner.token),
    payload: { command: "set_temperature", params: { temperature: 24 } },
  });
  assert.equal(res.statusCode, 202);
  assert.deepEqual(env.ha.calls, [
    { domain: "climate", service: "set_temperature", data: { temperature: 24, entity_id: "climate.salon" } },
  ]);
  await env.app.close();
});

test("kalorifer sınırı klimadan dardır: 30 °C reddedilir, 22 °C kabul edilir", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  await addDevice(env, owner.token, placeId, heater);
  env.connections.bind(placeId, env.ha);
  const send = (temperature: number) =>
    env.app.inject({
      method: "POST",
      url: `/places/${placeId}/devices/${heater.id}/command`,
      headers: auth(owner.token),
      payload: { command: "set_temperature", params: { temperature } },
    });
  assert.equal((await send(30)).statusCode, 400);
  assert.equal(env.ha.calls.length, 0);
  assert.equal((await send(22)).statusCode, 202);
  assert.equal(env.ha.calls.length, 1);
  await env.app.close();
});

test("TV içerik komutları ve cihazın desteklemediği komutlar reddedilir", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  await addDevice(env, owner.token, placeId, { id: "tv", name: "TV", kind: "tv", externalId: "media_player.tv", capabilities: ["turn_on"] });
  await addDevice(env, owner.token, placeId, { id: "tv2", name: "TV 2", kind: "tv", externalId: "media_player.tv2" });
  env.connections.bind(placeId, env.ha);
  const send = (id: string, command: string, params?: unknown) =>
    env.app.inject({
      method: "POST",
      url: `/places/${placeId}/devices/${id}/command`,
      headers: auth(owner.token),
      payload: { command, ...(params ? { params } : {}) },
    });

  assert.equal((await send("tv2", "play_media", { media_content_id: "x" })).statusCode, 400);
  assert.equal((await send("tv", "turn_off")).statusCode, 400, "yetenek listesinde yok");
  assert.equal((await send("tv", "turn_on")).statusCode, 202);
  assert.equal((await send("tv2", "volume_set", { volume_level: 0.4 })).statusCode, 202);
  assert.equal(env.ha.calls.length, 2);
  await env.app.close();
});

test("bağlantı yoksa 409, sağlayıcı hata verirse 502 ve iç ayrıntı sızmaz", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  await addDevice(env, owner.token, placeId, lamp);
  const send = () =>
    env.app.inject({
      method: "POST",
      url: `/places/${placeId}/devices/${lamp.id}/command`,
      headers: auth(owner.token),
      payload: { command: "turn_on" },
    });

  const noConn = await send();
  assert.equal(noConn.statusCode, 409);
  assert.equal((noConn.json() as { error: string }).error, "no_connection");

  env.ha.callService = async () => {
    throw new Error("HA içi gizli ayrıntı http://ha.local token=ABC");
  };
  env.connections.bind(placeId, env.ha);
  const failed = await send();
  assert.equal(failed.statusCode, 502);
  assert.ok(!failed.body.includes("ABC") && !failed.body.includes("ha.local"));
  await env.app.close();
});

test("olmayan cihaz ve bozuk kimlikler 404 verir", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeId = await createPlace(env, owner.token);
  env.connections.bind(placeId, env.ha);
  for (const id of ["yok", "..%2Fetc"]) {
    const res = await env.app.inject({
      method: "POST",
      url: `/places/${placeId}/devices/${id}/command`,
      headers: auth(owner.token),
      payload: { command: "turn_on" },
    });
    assert.equal(res.statusCode, 404, id);
  }
  const badPlace = await env.app.inject({ url: "/places/..%2Fetc", headers: auth(owner.token) });
  assert.equal(badPlace.statusCode, 404);
  await env.app.close();
});

// ---------- Taramalar ----------

test("tarama yükleme: geçerli kabul, geçersiz reddedilir, mekâna özel listelenir", async () => {
  const env = await makeEnv();
  const owner = await createUser(env, "sahip");
  const placeA = await createPlace(env, owner.token, "Ev");
  const placeB = await createPlace(env, owner.token, "Ofis", "office");

  const ok = await env.app.inject({ method: "POST", url: `/places/${placeA}/scans`, headers: auth(owner.token), payload: validScan });
  assert.equal(ok.statusCode, 201);
  const bad = await env.app.inject({ method: "POST", url: `/places/${placeA}/scans`, headers: auth(owner.token), payload: { ...validScan, version: 99 } });
  assert.equal(bad.statusCode, 400);

  const listA = await env.app.inject({ url: `/places/${placeA}/scans`, headers: auth(owner.token) });
  const listB = await env.app.inject({ url: `/places/${placeB}/scans`, headers: auth(owner.token) });
  assert.equal((listA.json() as unknown[]).length, 1);
  assert.equal((listB.json() as unknown[]).length, 0, "tarama yalnızca kendi mekânında görünür");

  const latestA = await env.app.inject({ url: `/places/${placeA}/scans/latest`, headers: auth(owner.token) });
  assert.equal(latestA.statusCode, 200);
  assert.equal((latestA.json() as { version: number }).version, 1);
  const latestB = await env.app.inject({ url: `/places/${placeB}/scans/latest`, headers: auth(owner.token) });
  assert.equal(latestB.statusCode, 404, "planı olmayan mekân 404 verir");
  const stranger = await createUser(env, "yabanci");
  const latestStranger = await env.app.inject({ url: `/places/${placeA}/scans/latest`, headers: auth(stranger.token) });
  assert.equal(latestStranger.statusCode, 404, "üye olmayan planı göremez");
  await env.app.close();
});
