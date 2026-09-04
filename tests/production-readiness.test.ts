import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("production deploy applies migrations without rerunning bootstrap data", () => {
  const packageJson = read("package.json");
  const railway = read("railway.json");

  assert.match(packageJson, /"db:setup": "prisma migrate deploy"/);
  assert.match(packageJson, /"db:bootstrap": "tsx prisma\/seed\.ts"/);
  assert.match(railway, /"preDeployCommand": "npm run db:setup"/);
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
  assert.match(migration, /startsWith\("\/uploads\/"\)/);
  assert.match(migration, /Cloudflare R2 não está configurado/);
});
