import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  DIRECT_URL: z.string().optional(),
  APP_URL: z.string().url().optional(),
  SESSION_COOKIE_NAME: z.string().min(1).default("padel_session"),
  ARENA_COOKIE_NAME: z.string().min(1).default("padel_arena"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(120).default(15)
});

const parsed = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  APP_URL: process.env.APP_URL,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  ARENA_COOKIE_NAME: process.env.ARENA_COOKIE_NAME,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
  LOGIN_MAX_ATTEMPTS: process.env.LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_MINUTES: process.env.LOGIN_LOCK_MINUTES
});

export const env = {
  databaseUrl: parsed.DATABASE_URL,
  directUrl: parsed.DIRECT_URL,
  appUrl: parsed.APP_URL,
  sessionCookieName: parsed.SESSION_COOKIE_NAME,
  arenaCookieName: parsed.ARENA_COOKIE_NAME,
  sessionTtlDays: parsed.SESSION_TTL_DAYS,
  loginMaxAttempts: parsed.LOGIN_MAX_ATTEMPTS,
  loginLockMinutes: parsed.LOGIN_LOCK_MINUTES
};
