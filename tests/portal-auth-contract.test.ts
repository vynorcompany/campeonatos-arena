import assert from 'node:assert/strict';
import test from 'node:test';
import { athleteSessionCookie } from '../src/lib/backend/auth-cookie';
import { allowedFrontendOrigin } from '../src/lib/backend/origin-policy';
import { publicAuthInputSchema, publicAuthOutcomeSchema, authFieldsFor, authInputSchemaFor } from '../src/lib/backend/contracts/player-auth';

test('Portal mutation origins require an exact configured browser origin', () => {
  const configuration = JSON.stringify(['https://arena.example', 'http://127.0.0.1:3014']);
  for (const origin of ['https://arena.example', 'http://127.0.0.1:3014']) assert.equal(allowedFrontendOrigin(origin, configuration), true);
  for (const origin of [null, 'null', 'https://arena.example.evil.test', 'https://arena.example/', 'https://user@arena.example', 'https://arena.example?x=1', 'file:///arena.example']) assert.equal(allowedFrontendOrigin(origin, configuration), false);
  assert.equal(allowedFrontendOrigin('https://arena.example', undefined), false);
  assert.equal(allowedFrontendOrigin('https://arena.example', '{'), false);
});

test('Portal auth inputs and results reject injected identities, secrets and external redirects', () => {
  assert.deepEqual(publicAuthInputSchema.parse({ phone: '41999999999', password: 'synthetic' }), { phone: '41999999999', password: 'synthetic' });
  for (const payload of [{ playerId: 'forged' }, { arenaId: 'forged' }, { token: 'forged' }, { password: 'x'.repeat(4097) }]) assert.equal(publicAuthInputSchema.safeParse(payload).success, false);
  for (const redirectTo of ['https://evil.test', '//evil.test', '/\\evil.test', '/portal\r\nInjected']) assert.equal(publicAuthOutcomeSchema.safeParse({ error: null, redirectTo }).success, false);
  assert.equal(publicAuthOutcomeSchema.safeParse({ error: null, passwordHash: 'private' }).success, false);
});

test('cookie relay accepts only the athlete session and forces protected browser attributes', () => {
  const token = 'a'.repeat(64);
  const cookie = athleteSessionCookie(`arena_player_session=${token}; Path=/evil; Domain=evil.test; SameSite=None; Max-Age=120`);
  assert.equal(cookie.path, '/'); assert.equal(cookie.httpOnly, true); assert.equal(cookie.sameSite, 'lax');
  assert.equal(cookie.value, token); assert.equal(cookie.maxAge, 120);
  assert.equal(athleteSessionCookie('arena_player_session=; Max-Age=0').maxAge, 0);
  for (const header of ['padel_session=forged', 'arena_player_session=forged', `arena_player_session=${token}; Max-Age=99999999`, `arena_player_session=${token}; Expires=invalid`]) assert.throws(() => athleteSessionCookie(header));
});


test('email contracts accept their token without widening login or accepting a supplied identity', () => {
  const input = { token: 'a'.repeat(64), password: 'SyntheticPassword123!', confirmPassword: 'SyntheticPassword123!' };
  assert.equal(authInputSchemaFor('complete-email-reset').safeParse(input).success, true);
  assert.equal(authInputSchemaFor('login-global').safeParse(input).success, false);
  assert.equal(authInputSchemaFor('confirm-email').safeParse({ token: input.token, identityId: 'forged' }).success, false);
  assert.equal(authFieldsFor('request-email-verification').includes('currentPassword'), true);
  assert.equal(authFieldsFor('request-email-verification').includes('playerId'), false);
});
