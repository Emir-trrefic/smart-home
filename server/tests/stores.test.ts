import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryDeviceStore } from "../src/devices/store.js";
import { InMemoryInviteStore, hashInviteCode, newInviteCode } from "../src/places/invites.js";
import { InMemoryPlaceStore } from "../src/places/store.js";

test("davet kodu rastgele, uzun ve yalnızca özeti saklanır", () => {
  const a = newInviteCode();
  const b = newInviteCode();
  assert.notEqual(a.code, b.code);
  assert.ok(a.code.length >= 32);
  assert.equal(a.codeHash, hashInviteCode(a.code));
  assert.notEqual(a.codeHash, a.code);
});

test("davet tek kullanımlıktır ve süresi dolunca geçersiz olur", async () => {
  const store = new InMemoryInviteStore();
  const { code, codeHash } = newInviteCode();
  await store.create({ codeHash, placeId: "p1", role: "guest", createdBy: "u1", expiresAt: 1000 });
  assert.equal(await store.countActive("p1", 0), 1);

  assert.equal((await store.consume(hashInviteCode(code), 500))?.role, "guest");
  assert.equal(await store.consume(hashInviteCode(code), 500), undefined, "ikinci kullanım");
  assert.equal(await store.countActive("p1", 0), 0);

  const second = newInviteCode();
  await store.create({ codeHash: second.codeHash, placeId: "p1", role: "member", createdBy: "u1", expiresAt: 1000 });
  assert.equal(await store.consume(second.codeHash, 1000), undefined, "süre sınırında geçersiz");
  assert.equal(await store.consume(hashInviteCode("bilinmeyen"), 0), undefined);
});

test("mekân oluşturan owner olur, üyelik ve sayım doğru çalışır", async () => {
  const store = new InMemoryPlaceStore();
  const place = await store.create({ name: "Ev", kind: "home" }, "u1");
  assert.equal((await store.getMembership(place.id, "u1"))?.role, "owner");
  assert.equal(await store.getMembership(place.id, "u2"), undefined);
  assert.equal(await store.countOwnedBy("u1"), 1);

  assert.equal(await store.addMember({ placeId: place.id, userId: "u2", role: "guest" }), "added");
  assert.equal(await store.addMember({ placeId: place.id, userId: "u2", role: "member" }), "exists");
  assert.equal((await store.getMembership(place.id, "u2"))?.role, "guest", "var olan üyelik değişmez");
  assert.equal(await store.countOwnedBy("u2"), 0);
  assert.equal((await store.listForUser("u2")).length, 1);

  assert.equal(await store.removeMember(place.id, "u2"), true);
  assert.equal(await store.removeMember(place.id, "u2"), false);
  assert.equal((await store.listForUser("u2")).length, 0);
});

test("cihazlar mekân kapsamındadır, aynı kimlik farklı mekânda ayrı cihazdır", async () => {
  const store = new InMemoryDeviceStore();
  const device = (placeId: string) => ({
    id: "lamba",
    name: "Lamba",
    kind: "light" as const,
    provider: "home_assistant" as const,
    externalId: "light.salon",
    placeId,
    capabilities: ["turn_on", "turn_off"],
  });
  assert.equal(await store.add(device("a")), true);
  assert.equal(await store.add(device("a")), false, "aynı mekânda tekrar");
  assert.equal(await store.add(device("b")), true);
  assert.ok(await store.get("a", "lamba"));
  assert.equal(await store.get("c", "lamba"), undefined, "başka mekân göremez");
  assert.equal(await store.count("a"), 1);
});
