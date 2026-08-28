import "server-only";
import { z } from "zod";

function withDefaultWhenInvalidNumber(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric < 1) return undefined;
  return value;
}

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z.string().url().optional()
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  DIRECT_URL: z.string().optional(),
  APP_URL: z.string().url().optional(),
  SESSION_COOKIE_NAME: z.string().min(1).default("padel_session"),
  ARENA_COOKIE_NAME: z.string().min(1).default("padel_arena"),
  SESSION_TTL_DAYS: z.preprocess(withDefaultWhenInvalidNumber, z.coerce.number().int().min(1).max(90).default(14)),
  LOGIN_MAX_ATTEMPTS: z.preprocess(withDefaultWhenInvalidNumber, z.coerce.number().int().min(3).max(20).default(5)),
  LOGIN_LOCK_MINUTES: z.preprocess(withDefaultWhenInvalidNumber, z.coerce.number().int().min(1).max(120).default(15)),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional(),
  EVOLUTION_API_URL: optionalUrl,
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().optional(),
  CRON_SECRET: z.string().min(24).optional()
});

const parsedResult = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  APP_URL: process.env.APP_URL,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  ARENA_COOKIE_NAME: process.env.ARENA_COOKIE_NAME,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
  LOGIN_MAX_ATTEMPTS: process.env.LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_MINUTES: process.env.LOGIN_LOCK_MINUTES,
  MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  MERCADO_PAGO_WEBHOOK_SECRET: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
  EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME,
  EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET,
  CRON_SECRET: process.env.CRON_SECRET
});

if (!parsedResult.success) {
  const details = parsedResult.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");

  throw new Error(
    `Invalid environment variables. ${details} ` +
      `Create/update your .env file based on .env.example.`
  );
}

const parsed = parsedResult.data;

export const env = {
  databaseUrl: parsed.DATABASE_URL,
  directUrl: parsed.DIRECT_URL,
  appUrl: parsed.APP_URL,
  sessionCookieName: parsed.SESSION_COOKIE_NAME,
  arenaCookieName: parsed.ARENA_COOKIE_NAME,
  sessionTtlDays: parsed.SESSION_TTL_DAYS,
  loginMaxAttempts: parsed.LOGIN_MAX_ATTEMPTS,
  loginLockMinutes: parsed.LOGIN_LOCK_MINUTES,
  mercadoPagoAccessToken: parsed.MERCADO_PAGO_ACCESS_TOKEN,
  mercadoPagoWebhookSecret: parsed.MERCADO_PAGO_WEBHOOK_SECRET,
  evolutionApiUrl: parsed.EVOLUTION_API_URL,
  evolutionApiKey: parsed.EVOLUTION_API_KEY,
  evolutionInstanceName: parsed.EVOLUTION_INSTANCE_NAME,
  evolutionWebhookSecret: parsed.EVOLUTION_WEBHOOK_SECRET,
  cronSecret: parsed.CRON_SECRET
};
