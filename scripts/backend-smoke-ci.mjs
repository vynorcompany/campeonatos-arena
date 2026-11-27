import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
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
const { PrismaClient } = await import('@prisma/client');
const fixtureDb = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const notificationFixturePrefix = 'backend-notification-' + randomUUID();
const staffFixtureEmail = notificationFixturePrefix + '@example.test';
let staffFixtureId;
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
  for (const path of ['/api/manual-upcoming-matches', '/api/management/dashboard', '/api/management/shell', '/api/whatsapp/pulse', '/api/agenda/availability?courtId=synthetic-court&date=2026-10-17']) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.ok([302, 303, 307, 308, 401].includes(response.status), `Anonymous API accepted ${path}`);
  }
  for (const path of ['/api/jobs/financial-online-charges', '/api/jobs/league-monthly-close', '/api/integrations/evolution/webhook']) {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401, path);
  }
  const anonymousManagement = await fetch(origin + '/api/management/context');
  assert.equal(anonymousManagement.status, 200);
  assert.deepEqual(await anonymousManagement.json(), { auth: null, redirectTo: null });
  const anonymousArenaAccess = await fetch(origin + '/api/management/context?access=arena');
  assert.deepEqual(await anonymousArenaAccess.json(), { auth: null, redirectTo: '/login' });
  const ownerContextResponse = await fetch(origin + '/api/management/context', { headers: { cookie: `padel_session=${token}` } });
  const ownerContext = await ownerContextResponse.json();
  assert.equal(ownerContext.auth.userId, 'goal-test');
  assert.equal(ownerContext.auth.systemRole, 'SUPER_ADMIN');
  const otherArenaId = ownerContext.auth.memberships.find(entry => entry.arenaName === 'Arena Beta GOAL')?.arenaId;
  assert.ok(otherArenaId);
  // Visual recovery deliberately revokes the seeded staff sessions and changes
  // that user's password. Give this integration its own disposable identity.
  const originalStaff = await fixtureDb.user.findUniqueOrThrow({ where: { email: 'goal-staff@example.test' }, include: { memberships: true } });
  const originalMembership = originalStaff.memberships[0];
  const bcrypt = await import('bcryptjs');
  const staffFixture = await fixtureDb.user.create({ data: { email: staffFixtureEmail, name: 'Backend contract staff fixture', passwordHash: await bcrypt.default.hash('SenhaDescartavelGOAL123!', 10), systemRole: 'VIEWER' } });
  staffFixtureId = staffFixture.id;
  await fixtureDb.arenaMember.create({ data: { userId: staffFixtureId, arenaId: originalMembership.arenaId, role: originalMembership.role, permissionProfileId: originalMembership.permissionProfileId, viewPermissions: originalMembership.viewPermissions, editPermissions: originalMembership.editPermissions } });
  const staffToken = createHash('sha256').update(notificationFixturePrefix).digest('hex');
  await fixtureDb.session.create({ data: { userId: staffFixtureId, token: createHash('sha256').update(staffToken).digest('hex'), expiresAt: new Date(Date.now() + 60 * 60_000) } });
  const staffCookie = `padel_session=${staffToken}; padel_arena=${otherArenaId}`;
  const staffContextResponse = await fetch(origin + '/api/management/context?access=arena', { headers: { cookie: staffCookie } });
  assert.equal(staffContextResponse.headers.get('cache-control'), 'private, no-store');
  const staffContext = await staffContextResponse.json();
  assert.equal(staffContext.redirectTo, null);
  assert.equal(staffContext.auth.systemRole, 'VIEWER');
  assert.equal(staffContext.auth.arenaName, 'Arena Teste GOAL');
  assert.equal(staffContext.auth.memberships.length, 1);
  assert.notEqual(staffContext.auth.arenaId, otherArenaId);
  assert.equal(JSON.stringify(staffContext).includes('passwordHash'), false);
  assert.equal(staffContext.auth.editPermissions.includes('support'), true);
  const shellResponse = await fetch(origin + '/api/management/shell', { headers: { cookie: staffCookie } });
  assert.equal(shellResponse.status, 200);
  assert.equal(shellResponse.headers.get('cache-control'), 'private, no-store');
  assert.ok(shellResponse.headers.get('vary').split(',').map(value => value.trim().toLowerCase()).includes('cookie'));
  const shellData = await shellResponse.json();
  assert.deepEqual(Object.keys(shellData).sort(), ['billingAlert', 'comandaRequestCount', 'notifications', 'whatsappUnreadCount']);
  assert.ok(Array.isArray(shellData.notifications));
  assert.equal(shellData.comandaRequestCount, 0, 'Counter must respect missing POS permission');
  assert.equal(JSON.stringify(shellData).includes('Atleta Exclusivo Outra Arena GOAL'), false);
  const shellForgedArena = await fetch(origin + '/api/management/shell?arenaId=' + otherArenaId, { headers: { cookie: staffCookie } });
  assert.equal(shellForgedArena.status, 400);
  const dashboard = await fetch(origin + '/api/management/dashboard?dataInicial=2026-01-01&dataFinal=2026-01-31', { headers: { cookie: staffCookie } });
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.headers.get('cache-control'), 'private, no-store');
  const dashboardData = await dashboard.json();
  assert.ok(dashboardData.analytics.cards.length > 10);
  assert.equal(typeof dashboardData.fixedCostCents, 'number');
  assert.equal(Object.hasOwn(dashboardData, 'entries'), false);
  assert.equal(JSON.stringify(dashboardData).includes('Atleta Exclusivo Outra Arena GOAL'), false);
  const dashboardForgedArena = await fetch(origin + '/api/management/dashboard?arenaId=' + otherArenaId, { headers: { cookie: staffCookie } });
  assert.equal(dashboardForgedArena.status, 400);
  const deniedModule = await fetch(origin + '/api/manual-upcoming-matches', { headers: { cookie: staffCookie }, redirect: 'manual' });
  assert.equal(deniedModule.status, 404, 'Read-only context must not grant an unassigned module');
  for (const requestOrigin of [undefined, 'https://untrusted.invalid']) {
    const deniedManagement = await fetch(origin + '/api/management/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(requestOrigin ? { origin: requestOrigin } : {}) }, body: '{}',
    });
    assert.equal(deniedManagement.status, 403);
    assert.equal(deniedManagement.headers.getSetCookie().length, 0);
  }
  const forgedManagement = await fetch(origin + '/api/management/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014' }, body: JSON.stringify({ email: staffFixtureEmail, password: 'SenhaDescartavelGOAL123!', systemRole: 'SUPER_ADMIN' }),
  });
  assert.equal(forgedManagement.status, 400);
  const anonymousInvite = await fetch(origin + '/api/management/auth/invite', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014' }, body: JSON.stringify({ email: 'synthetic@example.invalid', name: 'Synthetic Staff', permissionProfileId: 'synthetic' }),
  });
  assert.deepEqual(await anonymousInvite.json(), { error: null, success: null, redirectTo: '/login' });
  const invalidTokenInfo = await fetch(origin + '/api/management/account/token-info', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'INVITE', token: 'a'.repeat(64) }),
  });
  assert.equal(invalidTokenInfo.status, 200);
  assert.deepEqual(await invalidTokenInfo.json(), { valid: false, invitation: null });
  assert.equal(invalidTokenInfo.headers.get('cache-control'), 'private, no-store');
  const managementLogin = await fetch(origin + '/api/management/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', 'user-agent': 'Mozilla/5.0 Synthetic Browser' },
    body: JSON.stringify({ email: staffFixtureEmail, password: 'SenhaDescartavelGOAL123!' }),
  });
  assert.equal(managementLogin.status, 200);
  assert.deepEqual(await managementLogin.json(), { error: null, redirectTo: '/painel' });
  const managementCookies = managementLogin.headers.getSetCookie();
  assert.equal(managementCookies.filter(value => /^(padel_session|padel_arena)=/.test(value)).length, 2);
  assert.ok(managementCookies.every(value => value.includes('HttpOnly')));
  const loggedStaffCookie = managementCookies.map(value => value.split(';', 1)[0]).join('; ');
  const forbiddenSwitch = await fetch(origin + '/api/management/auth/select-arena', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', cookie: loggedStaffCookie }, body: JSON.stringify({ arenaId: otherArenaId }),
  });
  assert.match((await forbiddenSwitch.json()).error, /Arena inválida/);
  assert.equal(forbiddenSwitch.headers.getSetCookie().length, 0);
  const allowedSwitch = await fetch(origin + '/api/management/auth/select-arena', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', cookie: loggedStaffCookie }, body: JSON.stringify({ arenaId: staffContext.auth.arenaId }),
  });
  assert.deepEqual(await allowedSwitch.json(), { error: null, redirectTo: '/painel' });
  const managementLogout = await fetch(origin + '/api/management/auth/logout', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', cookie: loggedStaffCookie }, body: '{}',
  });
  assert.deepEqual(await managementLogout.json(), { error: null, redirectTo: '/login' });
  const revokedStaff = await fetch(origin + '/api/management/context', { headers: { cookie: loggedStaffCookie } });
  assert.equal((await revokedStaff.json()).auth, null);
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
  const ownNoticeId = notificationFixturePrefix + '-own';
  const foreignNoticeId = notificationFixturePrefix + '-foreign';
  const foreignPlayer = await fixtureDb.player.findFirstOrThrow({ where: { arenaId: otherArenaId }, select: { id: true } });
  await fixtureDb.playerNotification.createMany({ data: [
    { id: ownNoticeId, playerId: 'goal-athlete-a', title: 'Synthetic own notification', message: 'Own notice' },
    { id: foreignNoticeId, playerId: foreignPlayer.id, title: 'Synthetic foreign notification', message: 'Foreign notice' },
  ] });
  const notificationReadHeaders = { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', cookie: `arena_player_session=${athleteToken}` };
  const notificationList = await fetch(origin + '/api/portal/notifications?arena=' + encodeURIComponent(arenaSlug), { headers: { cookie: `arena_player_session=${athleteToken}` } });
  assert.equal(notificationList.status, 200);
  assert.equal(notificationList.headers.get('cache-control'), 'private, no-store');
  const ownNotifications = await notificationList.json();
  assert.ok(ownNotifications.some(item => item.id === ownNoticeId));
  assert.equal(ownNotifications.some(item => item.id === foreignNoticeId), false);
  assert.equal((await fetch(origin + '/api/portal/notifications?arena=' + arenaSlug)).status, 401);
  assert.equal((await fetch(origin + '/api/portal/notifications?arena=arena-beta-goal', { headers: { cookie: `arena_player_session=${athleteToken}` } })).status, 401);
  assert.equal((await fetch(origin + '/api/portal/notifications?arena=' + arenaSlug + '&playerId=other', { headers: { cookie: `arena_player_session=${athleteToken}` } })).status, 400);
  const notificationWrite = await fetch(origin + '/api/portal/notifications/read', { method: 'POST', headers: notificationReadHeaders, body: JSON.stringify({ arenaSlug, entries: [{ id: ownNoticeId, source: 'PLAYER' }, { id: foreignNoticeId, source: 'PLAYER' }] }) });
  assert.equal(notificationWrite.status, 200);
  assert.deepEqual(await notificationWrite.json(), { error: null });
  assert.ok((await fixtureDb.playerNotification.findUniqueOrThrow({ where: { id: ownNoticeId } })).readAt);
  assert.equal((await fixtureDb.playerNotification.findUniqueOrThrow({ where: { id: foreignNoticeId } })).readAt, null);
  for (const payload of [{ arenaSlug, entries: [], playerId: 'other' }, { arenaSlug, entries: [{ id: 'note', source: 'PLAYER', arenaId: 'other' }] }]) {
    assert.equal((await fetch(origin + '/api/portal/notifications/read', { method: 'POST', headers: notificationReadHeaders, body: JSON.stringify(payload) })).status, 400);
  }
  assert.equal((await fetch(origin + '/api/portal/notifications/read', { method: 'POST', headers: { ...notificationReadHeaders, origin: 'https://untrusted.invalid' }, body: JSON.stringify({ arenaSlug, entries: [] }) })).status, 403);
  assert.equal((await fetch(origin + '/api/portal/notifications/read', { method: 'POST', headers: notificationReadHeaders, body: JSON.stringify({ arenaSlug: 'arena-beta-goal', entries: [] }) })).status, 401);
  const managementReadHeaders = { 'Content-Type': 'application/json', origin: 'http://127.0.0.1:3014', cookie: staffCookie };
  const notificationDismiss = await fetch(origin + '/api/management/notifications/read', { method: 'POST', headers: managementReadHeaders, body: JSON.stringify({ operation: 'one', id: 'nonexistent-synthetic-notification' }) });
  assert.equal(notificationDismiss.status, 200);
  assert.deepEqual(await notificationDismiss.json(), { error: null });
  assert.equal((await fetch(origin + '/api/management/notifications/read', { method: 'POST', headers: managementReadHeaders, body: JSON.stringify({ operation: 'all', arenaId: otherArenaId }) })).status, 400);
  assert.equal((await fetch(origin + '/api/management/notifications/read', { method: 'POST', headers: { ...managementReadHeaders, origin: 'https://untrusted.invalid' }, body: JSON.stringify({ operation: 'all' }) })).status, 403);
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
  for (const path of ['/convite?token=' + 'a'.repeat(64), '/redefinir-senha?token=' + 'a'.repeat(64)]) {
    const invalidLinkPage = await fetch('http://127.0.0.1:3014' + path);
    assert.equal(invalidLinkPage.status, 200);
    assert.match(await invalidLinkPage.text(), /expirou|indisponível/);
  }
  const managementPage = await fetch('http://127.0.0.1:3014/painel', { headers: { cookie: staffCookie }, redirect: 'manual' });
  assert.equal(managementPage.status, 200, 'Management SSR did not preserve restricted staff context');
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
  await fixtureDb.playerNotification.deleteMany({ where: { id: { startsWith: notificationFixturePrefix } } });
  if (staffFixtureId) {
    await fixtureDb.session.deleteMany({ where: { userId: staffFixtureId } });
    await fixtureDb.arenaMember.deleteMany({ where: { userId: staffFixtureId } });
    await fixtureDb.user.deleteMany({ where: { id: staffFixtureId } });
  }
  await fixtureDb.$disconnect();
}
