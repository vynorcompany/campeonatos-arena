import assert from 'node:assert/strict';
import test from 'node:test';
import { stockWorkspaceDataSchema, stockWorkspaceQuerySchema } from '../src/lib/backend/contracts/stock-workspaces';
test('stock workspace queries cannot choose arena, actor or edit authority', () => {
  assert.equal(stockWorkspaceQuerySchema.safeParse({ creating: '1', history: '1' }).success, true);
  for (const query of [{ arenaId: 'foreign' }, { canEdit: 'true' }, { userId: 'other' }, { id: '' }, { history: 'yes' }]) assert.equal(stockWorkspaceQuerySchema.safeParse(query).success, false);
});
test('stock workspace DTO returns normalized snapshots without raw audit or provider data', () => {
  const data = { categories: [], products: [], movements: [], balances: [], snapshot: { title: 'Conferência', reason: '', items: [{ productId: 'p', name: 'Produto', sku: '', systemQuantity: 12, countedQuantity: 10, difference: -2 }] } };
  assert.deepEqual(stockWorkspaceDataSchema.parse(data), data);
  assert.equal(stockWorkspaceDataSchema.safeParse({ ...data, details: { private: true } }).success, false);
  assert.equal(stockWorkspaceDataSchema.safeParse({ ...data, products: [{ id: 'p', name: 'Produto', sku: '', stockQuantity: 10, minStock: 1, costCents: 200 }] }).success, false);
  const normalized = stockWorkspaceDataSchema.parse({ ...data, snapshot: { ...data.snapshot, privateAudit: 'not transferred', items: [{ ...data.snapshot.items[0], privateField: 'not transferred' }] } });
  assert.equal(JSON.stringify(normalized).includes('private'), false);
});
