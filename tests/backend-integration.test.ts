import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
// @ts-expect-error Shared deployment module.
import { prepareBackendBuild, recordBackendBuild } from '../scripts/lib/backend-build.mjs';

test('independent API artifact preserves authentication and rejects frontend routes', {
  skip: process.env.GITHUB_ACTIONS !== 'true', timeout: 480_000,
}, () => {
  const database = new URL(process.env.DATABASE_URL || 'http://invalid');
  if (database.hostname !== '127.0.0.1' || database.port !== '55433' || database.pathname !== '/arena_goal' || database.username !== 'postgres') {
    throw new Error('Disposable local CI database required.');
  }
  // The existing CI workflow has generated Prisma and built the web app before
  // running tests. Do not regenerate the shared client while other tests use it.
  const target = prepareBackendBuild(resolve('.'));
  execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', target], { timeout: 300_000, maxBuffer: 5 * 1024 * 1024 });
  recordBackendBuild(resolve('.'), target);
  execFileSync(process.execPath, ['scripts/backend-smoke-ci.mjs'], { timeout: 120_000, maxBuffer: 1024 * 1024 });
});
