import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { InMemoryUserStore } from "../src/auth/store.js";
import type { Config } from "../src/config.js";
import { MockHaClient } from "../src/ha/client.js";

export { validScan } from "./fixtures.js";

export const config: Config = {
  NODE_ENV: "test",
  PORT: 3000,
  HOST: "127.0.0.1",
  JWT_SECRET: "test-secret-test-secret-test-secret-123",
  BOOTSTRAP_TOKEN: "test-bootstrap-token-0123456789",
};

export const OWNER = { username: "emir", password: "correct horse battery" };

export async function makeApp(): Promise<{ app: FastifyInstance; ha: MockHaClient }> {
  const ha = new MockHaClient();
  const app = await buildApp(config, { users: new InMemoryUserStore(), ha });
  return { app, ha };
}

export async function bootstrapOwner(app: FastifyInstance): Promise<string> {
  const created = await app.inject({
    method: "POST",
    url: "/auth/bootstrap",
    payload: { ...OWNER, bootstrapToken: config.BOOTSTRAP_TOKEN },
  });
  if (created.statusCode !== 201) throw new Error(`bootstrap failed: ${created.statusCode}`);
  const login = await app.inject({ method: "POST", url: "/auth/login", payload: OWNER });
  return (login.json() as { accessToken: string }).accessToken;
}
