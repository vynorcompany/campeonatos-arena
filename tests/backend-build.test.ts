import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error Shared deployment module.
import { prepareBackendBuild, recordBackendBuild, readBackendBuild } from '../scripts/lib/backend-build.mjs';

test('independent backend includes API handlers without copying frontend pages or environment files', () => {
  const root = mkdtempSync(join(tmpdir(), 'vx4-backend-contract-'));
  mkdirSync(join(root, 'src/app/api/health'), { recursive: true });
  mkdirSync(join(root, 'src/app/portal'), { recursive: true });
  writeFileSync(join(root, 'src/app/api/health/route.ts'), 'export const GET = () => Response.json({ok:true});');
  writeFileSync(join(root, 'src/app/portal/page.tsx'), 'private frontend fixture');
  mkdirSync(join(root, 'src/app/api/management/agenda/availability'), { recursive: true });
  mkdirSync(join(root, 'src/app/api/agenda/availability'), { recursive: true });
  writeFileSync(join(root, 'src/app/api/management/agenda/availability/route.ts'), 'export const dynamic="force-dynamic";export const GET=()=>Response.json({slotMinutes:30,availableMinutes:[]});');
  writeFileSync(join(root, 'src/app/api/agenda/availability/route.ts'), 'frontend gateway fixture');
  writeFileSync(join(root, '.env'), 'SYNTHETIC_SECRET=must-not-copy');
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
  const target = prepareBackendBuild(root);
  assert.equal(statSync(target).mode & 0o777, 0o755, 'restricted HTTP user must be able to traverse compiled code');
  assert.equal(existsSync(join(target, 'src/app/api/health/route.ts')), true);
  assert.equal(existsSync(join(target, 'src/app/portal')), false);
  const compatibility = readFileSync(join(target, 'src/app/api/agenda/availability/route.ts'), 'utf8');
  assert.match(compatibility, /management\/agenda\/availability\/route/);
  assert.equal(compatibility.includes('frontend gateway fixture'), false);
  assert.equal(existsSync(join(target, '.env')), false);
  assert.equal(existsSync(join(root, '.service-build/backend.json')), false, 'unfinished builds must not become runnable');
  const paths = JSON.parse(readFileSync(join(target, 'tsconfig.json'), 'utf8')).compilerOptions.paths;
  assert.match(paths['@/lib/auth/session'][0], /backend\/services\/management-session\.ts$/);
  assert.match(paths['@/lib/auth/player-session'][0], /backend\/services\/player-session\.ts$/);
  recordBackendBuild(root, target);
  assert.equal(readBackendBuild(root), target);
  assert.match(readFileSync(join(target, '.next/standalone/server.js'), 'utf8'), /backendOnlyHandler\(productionAuditHandler/);
  writeFileSync(join(root, '.service-build/backend.json'), JSON.stringify({ version: 1, directory: '../../outside' }));
  assert.throws(() => readBackendBuild(root), /Invalid backend build manifest/);
});
