import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createRailwayContext, project } from "railway/iac";
import railwayConfig from "../.railway/railway";

const backupRoot = resolve(process.cwd(), "services", "db-backup");

test("database backup service creates portable dumps on a daily Railway cron", async () => {
  const dockerfile = resolve(backupRoot, "Dockerfile");
  const script = resolve(backupRoot, "backup.sh");

  assert.ok(existsSync(dockerfile));
  assert.ok(existsSync(script));

  assert.match(readFileSync(dockerfile, "utf8"), /postgres:18-alpine/);
  assert.match(readFileSync(script, "utf8"), /pg_dump "\$DATABASE_URL" --format=custom --no-owner/);
  assert.match(readFileSync(script, "utf8"), /aws s3 cp/);
  const configuration = await railwayConfig(createRailwayContext({ environment: "production" }), project);
  const backup = configuration.resources?.flat().find((resource) => resource.type === "service" && resource.name === "db-backup");
  assert.ok(backup && backup.type === "service");
  assert.equal(backup.deploy?.cronSchedule, "0 6 * * *");
  assert.equal(backup.deploy?.restartPolicyType, "NEVER");
  assert.equal(backup.deploy?.startCommand, "/backup.sh");
});

test("backup recovery requires a confirmed disposable database instead of restoring over production", () => {
  const script = resolve(backupRoot, "restore-test.sh");

  assert.ok(existsSync(script));
  const contents = readFileSync(script, "utf8");
  assert.match(contents, /RESTORE_DATABASE_URL is required/);
  assert.match(contents, /RESTORE_CONFIRM/);
  assert.match(contents, /RESTORE_DATABASE_URL must not match DATABASE_URL/);
  assert.match(contents, /pg_restore .*--exit-on-error/);
  assert.match(contents, /pg_policies/);
  assert.match(contents, /relrowsecurity/);
  assert.match(contents, /restore-runtime-privileges\.sql/);
  assert.match(contents, /has_table_privilege/);
  assert.match(contents, /SET ROLE arena_runtime/);
  assert.match(readFileSync(resolve(backupRoot, "Dockerfile"), "utf8"), /restore-runtime-privileges\.sql/);
  assert.match(contents, /FinancialEntry/);
  assert.match(contents, /Comanda/);
  assert.match(contents, /ScheduleOccurrence/);
  assert.match(contents, /Tournament/);
  assert.match(contents, /Restore validation completed successfully/);
});
