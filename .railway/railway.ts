import { defineRailway, fn, github, preserve, project, service, volume } from "railway/iac";

// This repository owns only its application and backup services in the shared project.
export const partial = "campeonatos-arena";

export default defineRailway(() => {
  const uploads = volume("service-arena-padel-manager-volume", {
    region: "us-east4-eqdc4a",
    sizeMB: 50000,
    allowOnlineResize: true,
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  });
  const app = service("service-arena-padel-manager", {
    source: github("vynorcompany/campeonatos-arena", { branch: "main", checkSuites: false }),
    build: {
      builder: "NIXPACKS",
      buildCommand: "npm run build",
      // Keep production deploys for application, migration, dependency, and runtime changes.
      // Tests, CI-only scripts, and documentation do not change the running service.
      watchPatterns: [
        "**",
        "!/tests/**",
        "!/docs/**",
        "!/.github/**",
        "!/scripts/*-ci.*",
        "!/scripts/compile-styles-for-tests.mjs",
        "!/**/*.test.*",
        "!/**/*.spec.*",
        "!/*.md",
        "!/**/*.md",
        "!/.railway/**",
      ],
    },
    deploy: {
      startCommand: "npm run db:setup && exec node scripts/runtime-server.mjs",
      healthcheckPath: "/api/health",
      healthcheckTimeout: 120,
    },
    env: {
      APP_DATABASE_URL: preserve(),
      APP_URL: preserve(),
      ARENA_COOKIE_NAME: preserve(),
      CRON_SECRET: preserve(),
      DATABASE_URL: preserve(),
      DIRECT_URL: preserve(),
      EVOLUTION_API_KEY: preserve(),
      EVOLUTION_API_URL: preserve(),
      INITIAL_ADMIN_EMAIL: preserve(),
      INITIAL_ADMIN_NAME: preserve(),
      INITIAL_ADMIN_PASSWORD: preserve(),
      INITIAL_ARENA_NAME: preserve(),
      INITIAL_ARENA_SLUG: preserve(),
      LOGIN_LOCK_MINUTES: preserve(),
      LOGIN_MAX_ATTEMPTS: preserve(),
      MERCADO_PAGO_ACCESS_TOKEN: preserve(),
      MERCADO_PAGO_CLIENT_ID: preserve(),
      MERCADO_PAGO_CLIENT_SECRET: preserve(),
      PAYMENT_CONNECTIONS_ENCRYPTION_KEY: preserve(),
      R2_ACCESS_KEY_ID: preserve(),
      R2_BUCKET: preserve(),
      R2_ENDPOINT: preserve(),
      R2_PUBLIC_BASE_URL: preserve(),
      R2_SECRET_ACCESS_KEY: preserve(),
      SEED_DEMO_DATA: preserve(),
      SESSION_COOKIE_NAME: preserve(),
      SESSION_TTL_DAYS: preserve(),
    },
    volumeMounts: { "/app/.next/standalone/public/uploads": uploads },
  });
  const backup = service("db-backup", {
    source: github("vynorcompany/campeonatos-arena", { branch: "main", rootDirectory: "/services/db-backup", checkSuites: false }),
    build: { builder: "RAILPACK" },
    deploy: { cronSchedule: "0 6 * * *", restartPolicyType: "NEVER", startCommand: "/backup.sh" },
    env: {
      AWS_ACCESS_KEY_ID: preserve(),
      AWS_DEFAULT_REGION: preserve(),
      AWS_SECRET_ACCESS_KEY: preserve(),
      BACKUP_PREFIX: preserve(),
      DATABASE_URL: preserve(),
      S3_BUCKET: preserve(),
      S3_ENDPOINT: preserve(),
    },
  });

  const financialCharges = fn("financial-online-charges", {
    codeFile: "functions/financial-online-charges.ts",
    deploy: { cronSchedule: "0 9 * * *", restartPolicyType: "NEVER" },
    env: {
      APP_URL: app.env.APP_URL,
      CRON_SECRET: app.env.CRON_SECRET,
    },
  });

  return project("Arena Padel Manager", { resources: [app, backup, financialCharges, uploads] });
});
