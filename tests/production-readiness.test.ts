import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createRailwayContext, project } from "railway/iac";
import railwayConfig from "../.railway/railway";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("production deploy applies migrations without rerunning bootstrap data", async () => {
  const packageJson = read("package.json");
  const configuration = await railwayConfig(createRailwayContext({ environment: "production" }), project);
  const app = configuration.resources?.flat().find((resource) => resource.type === "service" && resource.name === "service-arena-padel-manager");
  assert.ok(app && app.type === "service");

  assert.match(packageJson, /"db:setup": "node scripts\/migrate-and-audit\.mjs"/);
  const migration = read("scripts/migrate-and-audit.mjs");
  assert.match(migration, /migrate.*,.*deploy/);
  assert.match(migration, /install_change_audit_triggers/);
  assert.doesNotMatch(migration, /seed|bootstrap/);
  assert.match(packageJson, /"db:bootstrap": "tsx prisma\/seed\.ts"/);
  assert.equal(app.deploy?.preDeployCommand, undefined);
  assert.equal(
    app.deploy?.startCommand,
    'npm run db:setup && exec node scripts/runtime-server.mjs'
  );
  assert.equal(app.deploy?.healthcheckPath, "/api/health");
});

test("public uploads use R2 with an arena-scoped object key", () => {
  const env = read("src/lib/env.ts");
  const uploads = read("src/lib/uploads.ts");
  const example = read(".env.example");

  assert.match(env, /R2_ENDPOINT/);
  assert.match(env, /R2_BUCKET/);
  assert.match(env, /R2_ACCESS_KEY_ID/);
  assert.match(env, /R2_SECRET_ACCESS_KEY/);
  assert.match(uploads, /S3Client/);
  assert.match(uploads, /PutObjectCommand/);
  assert.match(uploads, /arenas\/\$\{safeArenaId\}/);
  assert.match(example, /R2_BUCKET=/);
});

test("portal event uploads are isolated under the active arena", () => {
  const actions = read("src/lib/actions/client-portal.ts");

  assert.match(actions, /saveOptimizedPortalEventImageUpload\(image, auth\.arenaId\)/);
  assert.match(actions, /portalEventPost\.create\(\{ data: \{ arenaId: auth\.arenaId/);
  assert.match(actions, /portalAnnouncement\.findFirst\(\{ where: \{ id, arenaId: auth\.arenaId \}/);
});

test("legacy local uploads have an explicit, idempotent migration path to R2", () => {
  const migration = read("scripts/migrate-local-uploads-to-r2.ts");

  assert.match(migration, /portalEventPost\.findMany/);
  assert.match(migration, /tvSponsor\.findMany/);
  assert.match(migration, /savePublicImageUpload/);
  assert.match(migration, /startsWith: "\/uploads\/"/);
  assert.match(migration, /startsWith: "\/media\/uploads\/"/);
  assert.match(migration, /getPersistentUploadDirectory/);
  assert.match(migration, /Cloudflare R2 não está configurado/);
});
