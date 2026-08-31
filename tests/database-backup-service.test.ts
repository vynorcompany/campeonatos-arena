import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const backupRoot = resolve(process.cwd(), "services", "db-backup");

test("database backup service creates portable dumps on a daily Railway cron", () => {
  const dockerfile = resolve(backupRoot, "Dockerfile");
  const script = resolve(backupRoot, "backup.sh");
  const railway = resolve(backupRoot, "railway.json");

  assert.ok(existsSync(dockerfile));
  assert.ok(existsSync(script));
  assert.ok(existsSync(railway));

  assert.match(readFileSync(dockerfile, "utf8"), /postgres:16-alpine/);
  assert.match(readFileSync(script, "utf8"), /pg_dump "\$DATABASE_URL" --format=custom --no-owner/);
  assert.match(readFileSync(script, "utf8"), /aws s3 cp/);
  assert.match(readFileSync(railway, "utf8"), /"cronSchedule": "0 6 \* \* \*"/);
});
