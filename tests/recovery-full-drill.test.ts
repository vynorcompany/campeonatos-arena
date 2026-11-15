import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error operator deployment module
import { objectPath, isolatedEnvironment } from '../services/recovery/full-drill.mjs';
// @ts-expect-error operator deployment module
import { snapshotCommand } from '../services/recovery/snapshot-command.mjs';

test('complete recovery rejects object traversal and production database destinations', () => {
  assert.equal(objectPath('/vault', 'objects/abc-123.enc'), '/vault/objects/abc-123.enc');
  for (const file of ['../secret', 'objects/../../key.enc', '/objects/a.enc', 'objects/a/b.enc']) assert.throws(() => objectPath('/vault', file));
  for (const url of ['postgresql://arena_runtime:test@production/arena_full_drill', 'postgresql://postgres:test@restore-db/arena_full_drill', 'postgresql://arena_runtime:test@restore-db/railway']) assert.throws(() => isolatedEnvironment(url, 3000));
  const environment = isolatedEnvironment('postgresql://arena_runtime:test@restore-db/arena_full_drill', 3000);
  assert.equal(environment.PORTAL_CHECKOUT_EXPIRY_WORKER_ENABLED, 'false');
  assert.equal(environment.APP_URL, 'http://127.0.0.1:3000');
  assert.deepEqual(Object.keys(environment).sort(), ['APP_DATABASE_URL', 'APP_URL', 'NODE_ENV', 'PORT', 'PORTAL_CHECKOUT_EXPIRY_WORKER_ENABLED']);
});

test('application snapshots fail closed and separate uploads from the deployed artifact', () => {
  const command = snapshotCommand({ kind: 'application' });
  assert.match(command, /^set -eu; cd \/app; test -f \.next\/BUILD_ID;/);
  assert.match(command, /--exclude='public\/uploads'/);
  assert.match(command, /--exclude='\.next\/standalone\/public\/uploads'/);
  assert.match(command, /package-lock.json/);
});
