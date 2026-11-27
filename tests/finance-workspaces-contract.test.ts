import assert from 'node:assert/strict';
import test from 'node:test';
import { financeWorkspacePageSchema, financeWorkspaceQuerySchema, financeWorkspaceSchema } from '../src/lib/backend/contracts/finance-workspaces';
import { financialMutationInputSchema, financialEntryOutcomeSchema } from '../src/lib/backend/contracts/financial-mutations';

test('financial workspaces reject caller authority and return only presentation data', () => {
  assert.equal(financeWorkspaceSchema.safeParse('../../private').success, false);
  assert.equal(financeWorkspaceQuerySchema.safeParse({ mes: '2026-11', arenaId: 'forged' }).success, false);
  const empty = { referenceMonth: '', plans: [], students: [], bankAccounts: [], subscriptions: [], employees: [], payroll: [] };
  assert.deepEqual(financeWorkspacePageSchema.parse(empty), empty);
  assert.equal(financeWorkspacePageSchema.safeParse({ ...empty, employees: [{ id: 'a', name: 'Funcionário', passwordHash: 'secret' }] }).success, false);
});

test('payroll contract distinguishes target employee from authenticated actor and preserves teacher selections', () => {
  assert.equal(financialMutationInputSchema('payroll-upsert-payroll-entry').safeParse({ fields: { userId: ['employee'], expectedVersion: ['NEW'] } }).success, true);
  assert.equal(financialMutationInputSchema('payroll-upsert-payroll-entry').safeParse({ fields: { userId: ['employee'], actorId: ['forged'] } }).success, false);
  const selected = { entryIds: ['a', 'b'], teacherId: ['teacher'], percentage: ['50'] };
  assert.deepEqual(financialMutationInputSchema('payroll-create-teacher-monthly-payable').parse({ fields: selected }), { fields: selected });
  assert.deepEqual(financialEntryOutcomeSchema.parse({ entryId: 'created-entry' }), { entryId: 'created-entry' });
  assert.equal(financialEntryOutcomeSchema.safeParse({ entryId: 'created-entry', arenaId: 'private' }).success, false);
});
