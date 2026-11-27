import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runtimeEnvironment } from './runtime-server.mjs';
import { readBackendBuild } from './lib/backend-build.mjs';

const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if ((process.env.GITHUB_ACTIONS !== 'true' && process.env.ARENA_VISUAL_LOCAL !== 'true') ||
    url.hostname !== '127.0.0.1' || url.port !== '55433' || url.pathname !== '/arena_goal' || url.username !== 'postgres') {
  throw new Error('Backend smoke requires the disposable local CI database.');
}
const token = process.env.ARENA_GOAL_TEST_SESSION_TOKEN || '';
assert.match(token, /^[a-f0-9]{40}$/i);
// Refuse to exercise a stale or unrelated server already occupying the test ports.
for (const port of [3012, 3014]) {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '127.0.0.1', resolve); });
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
}
const target = readBackendBuild(resolve('.'));
const paths = JSON.parse(readFileSync(join(target, '.next/server/app-paths-manifest.json'), 'utf8'));
assert.ok(Object.keys(paths).length > 20);
assert.ok(Object.keys(paths).every(path => path.startsWith('/api/') || path === '/_not-found/page'), 'Backend contains a frontend route');
url.username = 'arena_runtime'; url.password = 'fixture';
const environment = runtimeEnvironment({ ...process.env, APP_DATABASE_URL: url.toString(), PORT: '3012' });
environment.VX4_FRONTEND_ORIGINS = JSON.stringify(['http://127.0.0.1:3014']);
environment.HOSTNAME = '127.0.0.1'; environment.NODE_ENV = 'production';
for (const key of ['ARENA_GOAL_TEST_DATABASE_URL', 'ARENA_GOAL_TEST_SESSION_TOKEN']) delete environment[key];
const child = spawn(process.execPath, [join(target, '.next/standalone/server.js')], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', value => { output = (output + value).slice(-4000); });
child.stderr.on('data', value => { output = (output + value).slice(-4000); });
const exited = new Promise(resolve => child.once('exit', resolve));
let frontend;
let frontendExited;
const origin = 'http://127.0.0.1:3012';
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(origin + '/api/health')).ok) { ready = true; break; } } catch {}
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'Backend did not become healthy');
  for (const path of ['/', '/portal', '/login', '/painel', '/_next/static/private.js']) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.equal(response.status, 404, path);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  }
  for (const path of ['/api/manual-upcoming-matches', '/api/whatsapp/pulse', '/api/agenda/availability?courtId=synthetic-court&date=2026-10-17']) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.ok([302, 303, 307, 308, 401].includes(response.status), `Anonymous API accepted ${path}`);
  }
  for (const path of ['/api/jobs/financial-online-charges', '/api/jobs/league-monthly-close', '/api/integrations/evolution/webhook']) {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401, path);
  }
  const anonymousSession = await fetch(origin + '/api/portal/session?arena=goal-arena-a');
  assert.equal(anonymousSession.status, 200);
  assert.deepEqual(await anonymousSession.json(), { currentClient: null, athleteIdentity: null });
  assert.equal(anonymousSession.headers.get('cache-control'), 'private, no-store');
  const athleteToken = createHash('sha256').update(`goal-player:${token}`).digest('hex');
  const identityResponse = await fetch(origin + '/api/portal/session', { headers: { cookie: `arena_player_session=${athleteToken}` } });
  assert.equal(identityResponse.status, 200);
  const identity = await identityResponse.json();
  assert.equal(identity.currentClient, null);
  assert.ok(identity.athleteIdentity?.arenas.length > 0, 'Athlete cookie did not resolve identity');
  const arenaSlug = identity.athleteIdentity.arenas[0].slug;
  const ownContext = await fetch(origin + '/api/portal/session?arena=' + encodeURIComponent(arenaSlug), { headers: { cookie: `arena_player_session=${athleteToken}` } });
  const own = await ownContext.json();
  assert.equal(own.currentClient?.playerId, 'goal-athlete-a');
  assert.equal(JSON.stringify(own).includes('passwordHash'), false);
  const otherContext = await fetch(origin + '/api/portal/session?arena=arena-beta-goal', { headers: { cookie: `arena_player_session=${athleteToken}` } });
  assert.equal((await otherContext.json()).currentClient, null);
  const invalidSession = await fetch(origin + '/api/portal/session', { headers: { cookie: 'arena_player_session=invalid' } });
  assert.deepEqual(await invalidSession.json(), { currentClient: null, athleteIdentity: null });
  const branding = await fetch(origin + '/api/portal/login-branding?host=unknown.invalid');
  assert.equal(branding.status, 200);
  assert.deepEqual(await branding.json(), { arena: null });
  const response = await fetch(origin + '/api/manual-upcoming-matches', { redirect: 'manual', headers: { cookie: `padel_session=${token}` } });
  assert.equal(response.status, 200, 'Backend did not preserve authenticated API access');
  assert.ok(response.headers.get('content-type')?.includes('application/json'));
  await response.json();
  const authPayload = { phone: '5500000000000', password: 'GoalAthleteContract123!' };
  for (const requestOrigin of [undefined, 'https://untrusted.invalid']) {
    const denied = await fetch(origin + '/api/portal/auth/login-global', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(requestOrigin ? { origin: requestOrigin } : {}) }, body: JSON.stringify(authPayload),
    });
    assert.equal(denied.status, 403);
  }
  const loggedIn = await fetch(origin + '/api/portal/auth/login-global', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014' }, body: JSON.stringify(authPayload),
  });
  assert.equal(loggedIn.status, 200);
  assert.deepEqual(await loggedIn.json(), { error: null, redirectTo: '/portal' });
  const issuedCookie = loggedIn.headers.getSetCookie().find(value => value.startsWith('arena_player_session='));
  assert.ok(issuedCookie?.includes('HttpOnly'));
  const authenticatedCookie = issuedCookie.split(';', 1)[0];
  const authenticatedContext = await fetch(origin + '/api/portal/session', { headers: { cookie: authenticatedCookie } });
  assert.equal((await authenticatedContext.json()).athleteIdentity.arenas[0].slug, arenaSlug);
  const anonymousEmailConfirmation = await fetch(origin + '/api/portal/auth/confirm-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014' }, body: JSON.stringify({ token: 'a'.repeat(64) }),
  });
  assert.equal(anonymousEmailConfirmation.status, 200);
  assert.match((await anonymousEmailConfirmation.json()).error, /Entre na sua conta/);
  const invalidEmailConfirmation = await fetch(origin + '/api/portal/auth/confirm-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', cookie: authenticatedCookie }, body: JSON.stringify({ token: 'a'.repeat(64) }),
  });
  assert.equal(invalidEmailConfirmation.status, 200);
  assert.match((await invalidEmailConfirmation.json()).error, /expirou|utilizado|outra conta/);
  const injectedEmailIdentity = await fetch(origin + '/api/portal/auth/confirm-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', cookie: authenticatedCookie }, body: JSON.stringify({ token: 'a'.repeat(64), identityId: 'forged' }),
  });
  assert.equal(injectedEmailIdentity.status, 400);
  const loggedOut = await fetch(origin + '/api/portal/auth/logout-portal', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', cookie: authenticatedCookie }, body: '{}',
  });
  assert.equal(loggedOut.status, 200);
  const revoked = await fetch(origin + '/api/portal/session', { headers: { cookie: authenticatedCookie } });
  assert.equal((await revoked.json()).athleteIdentity, null);
  // Exercise the existing SSR frontend against a different backend process, using
  // the same restricted-role derivation as deployment, not administrative test credentials.
  frontend = spawn(process.execPath, [resolve('.next/standalone/server.js')], {
    env: { ...environment, PORT: '3014', VX4_BACKEND_ORIGIN: origin }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  frontendExited = new Promise(resolve => frontend.once('exit', resolve));
  frontend.stdout.on('data', value => { output = (output + value).slice(-4000); });
  frontend.stderr.on('data', value => { output = (output + value).slice(-4000); });
  let frontendReady = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch('http://127.0.0.1:3014/api/health')).ok) { frontendReady = true; break; } } catch {}
    if (frontend.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(frontendReady, 'SSR frontend did not become healthy');
  const login = await fetch('http://127.0.0.1:3014/portal');
  assert.equal(login.status, 200);
  assert.ok((await login.text()).includes('Entre no VX4'));
  const athletePage = await fetch('http://127.0.0.1:3014/portal', { headers: { cookie: `arena_player_session=${athleteToken}` } });
  assert.equal(athletePage.status, 200);
  const athleteHtml = await athletePage.text();
  assert.ok(athleteHtml.includes('Atleta GOAL A'));
  assert.ok(athleteHtml.includes('Arena Teste GOAL'));
  assert.equal(athleteHtml.includes('Arena Beta GOAL'), false);
  console.log('Independent backend and SSR frontend: authentication, session contracts, arena isolation, restricted credentials and API-only boundary passed.');
} catch (error) { console.error(output); throw error; }
finally {
  if (frontend) {
    frontend.kill('SIGTERM');
    const timeout = setTimeout(() => frontend.kill('SIGKILL'), 5000);
    await frontendExited;
    clearTimeout(timeout);
  }
  child.kill('SIGTERM');
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
  await exited;
  clearTimeout(timeout);
}
