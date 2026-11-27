import assert from 'node:assert/strict';
import test from 'node:test';
import { managementAuthenticationCookie } from '../src/lib/backend/management-auth-cookie';
import { managementAuthInputSchema, managementAuthOutcomeSchema } from '../src/lib/backend/contracts/management-auth';

test('management authentication never accepts supplied roles, identities or session tokens', () => {
  assert.equal(managementAuthInputSchema.safeParse({ email: 'staff@example.invalid', password: 'short' }).success, true);
  for (const value of [{ userId: 'forged' }, { systemRole: 'SUPER_ADMIN' }, { token: 'forged' }, { password: 'a'.repeat(4097) }]) assert.equal(managementAuthInputSchema.safeParse(value).success, false);
  for (const value of [{ error: null, redirectTo: 'https://outside.invalid' }, { error: null, passwordHash: 'private' }]) assert.equal(managementAuthOutcomeSchema.safeParse(value).success, false);
});

test('management cookie relay restricts names and values and imposes browser protections', () => {
  const read = (value: string) => managementAuthenticationCookie(value, 'staff_session', 'selected_arena');
  const cookie = read(`staff_session=${'a'.repeat(64)}; Domain=private.internal; Path=/api; SameSite=None`);
  assert.equal(cookie.name, 'staff_session'); assert.equal(cookie.path, '/'); assert.equal(cookie.httpOnly, true); assert.equal(cookie.sameSite, 'lax');
  assert.equal(read('selected_arena=arena-a').value, 'arena-a');
  assert.equal(read('staff_session=; Max-Age=0').maxAge, 0);
  for (const value of ['admin=forged', 'staff_session=bad', 'selected_arena=arena%3Badmin%3Dtrue', `staff_session=${'a'.repeat(64)}; Expires=invalid`, `staff_session=${'a'.repeat(64)}; Max-Age=99999999`]) assert.throws(() => read(value));
});

test('account operations keep target identifiers and token fields out of login', async () => {
  const { managementInputSchemaFor } = await import('../src/lib/backend/contracts/management-auth');
  assert.equal(managementInputSchemaFor('send-user-recovery').safeParse({ userId: 'staff-a' }).success, true);
  assert.equal(managementInputSchemaFor('login').safeParse({ userId: 'staff-a' }).success, false);
  assert.equal(managementInputSchemaFor('complete-reset').safeParse({ token: 'a'.repeat(64), password: 'SyntheticPassword123!', confirmPassword: 'SyntheticPassword123!' }).success, true);
  assert.equal(managementInputSchemaFor('invite').safeParse({ email: 'new@example.invalid', name: 'New Staff', permissionProfileId: 'profile-a', arenaId: 'forged' }).success, false);
  assert.equal(managementAuthOutcomeSchema.safeParse({ error: null, success: 'Link', invitationUrl: `/convite?token=${'a'.repeat(64)}` }).success, true);
  for (const invitationUrl of ['javascript:alert(1)', '//outside.invalid/convite', 'https://arena.example/other?token=' + 'a'.repeat(64), '/convite?token=invalid']) assert.equal(managementAuthOutcomeSchema.safeParse({ error: null, invitationUrl }).success, false);
});
