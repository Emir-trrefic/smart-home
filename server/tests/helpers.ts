import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { hashPassword } from "../src/auth/password.js";
import { InMemoryUserStore } from "../src/auth/store.js";
import { signAccessToken } from "../src/auth/tokens.js";
import type { Config } from "../src/config.js";
import { MockHaClient } from "../src/ha/client.js";
import { InMemoryConnectionRegistry } from "../src/ha/registry.js";

export { validScan } from "./fixtures.js";

export const config: Config = {
  NODE_ENV: "test",
  PORT: 3000,
  HOST: "127.0.0.1",
  JWT_SECRET: "test-secret-test-secret-test-secret-123",
  BOOTSTRAP_TOKEN: "test-bootstrap-token-0123456789",
};

export const PASSWORD = "a-long-test-password-1";

export interface Env {
  app: FastifyInstance;
  users: InMemoryUserStore;
  connections: InMemoryConnectionRegistry;
  ha: MockHaClient;
  /** Sahte saati ileri alır (davet süresi testleri için). */
  advance(ms: number): void;
}

export async function makeEnv(): Promise<Env> {
  const users = new InMemoryUserStore();
  const connections = new InMemoryConnectionRegistry();
  const ha = new MockHaClient();
  let now = Date.UTC(2026, 9, 27, 12, 0, 0);
  const app = await buildApp(config, { users, connections, clock: () => now });
  return { app, users, connections, ha, advance: (ms) => void (now += ms) };
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}` });

/** Kayıt akışını atlayarak doğrudan kullanıcı ve erişim belirteci üretir. */
export async function createUser(env: Env, username: string): Promise<{ id: string; token: string }> {
  const user = await env.users.create({ username, passwordHash: await hashPassword(PASSWORD) });
  return { id: user.id, token: await signAccessToken(config.JWT_SECRET, { sub: user.id }) };
}

export async function createPlace(env: Env, token: string, name = "Ev", kind = "home"): Promise<string> {
  const res = await env.app.inject({ method: "POST", url: "/places", headers: auth(token), payload: { name, kind } });
  if (res.statusCode !== 201) throw new Error(`createPlace failed: ${res.statusCode} ${res.body}`);
  return (res.json() as { id: string }).id;
}

export async function addDevice(
  env: Env,
  token: string,
  placeId: string,
  device: Record<string, unknown>,
): Promise<number> {
  const res = await env.app.inject({
    method: "POST",
    url: `/places/${placeId}/devices`,
    headers: auth(token),
    payload: { provider: "home_assistant", ...device },
  });
  return res.statusCode;
}

export async function invite(env: Env, token: string, placeId: string, role: string): Promise<string> {
  const res = await env.app.inject({
    method: "POST",
    url: `/places/${placeId}/invites`,
    headers: auth(token),
    payload: { role },
  });
  if (res.statusCode !== 201) throw new Error(`invite failed: ${res.statusCode} ${res.body}`);
  return (res.json() as { code: string }).code;
}

export async function registerWithInvite(env: Env, username: string, inviteCode: string) {
  return env.app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { username, password: PASSWORD, inviteCode },
  });
}

export async function login(env: Env, username: string): Promise<string> {
  const res = await env.app.inject({ method: "POST", url: "/auth/login", payload: { username, password: PASSWORD } });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.statusCode}`);
  return (res.json() as { accessToken: string }).accessToken;
}

export const climate = { id: "salon-klima", name: "Salon klima", kind: "air_conditioner", externalId: "climate.salon" };
export const lamp = { id: "salon-lamba", name: "Salon lambası", kind: "light", externalId: "light.salon" };
export const heater = { id: "kalorifer", name: "Salon kalorifer", kind: "heater", externalId: "climate.kalorifer" };
