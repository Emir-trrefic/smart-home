import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default("127.0.0.1"),
  JWT_SECRET: z.string().min(32),
  BOOTSTRAP_TOKEN: z.string().min(24),
  HA_URL: z.string().url().optional(),
  HA_TOKEN: z.string().min(1).optional(),
});

export type Config = z.infer<typeof schema>;

/** Ortam değişkenlerini doğrular. Hata mesajı değer içermez, yalnızca alan adı ve sebep. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Geçersiz yapılandırma: ${details}`);
  }
  return parsed.data;
}
