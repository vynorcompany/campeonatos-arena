import assert from 'node:assert/strict';

/** All records are owned by a disposable arena and removed by the caller. */
export async function prepareFinanceSmoke(db, databaseUrl, origin, staffId, staffToken, tag) {
  const database = new URL(databaseUrl);
  assert.equal(database.hostname, '127.0.0.1'); assert.equal(database.port, '55433'); assert.equal(database.pathname, '/arena_goal');
  const slug = 'finance-contract-' + tag;
  const arena = await db.arena.create({ data: { name: 'Finance disposable contract', slug, createdById: 'goal-test' } });
  const cleanup = () => db.arena.deleteMany({ where: { id: arena.id, slug } });
  try {
    await db.arenaMember.create({ data: { arenaId: arena.id, userId: staffId, role: 'STAFF', viewPermissions: ['finance:receivable:view'], editPermissions: [] } });
    const cookie = `padel_session=${staffToken}; padel_arena=${arena.id}`;
    const client = await db.player.create({ data: { arenaId: arena.id, name: 'Cliente Financeiro Contrato', phone: '41900000888' } });
    const bank = await db.bankAccount.create({ data: { arenaId: arena.id, name: 'Banco Financeiro Contrato' } });
    const revenue = await db.financialEntry.create({ data: { arenaId: arena.id, playerId: client.id, bankAccountId: bank.id, type: 'REVENUE', category: 'Teste', description: 'Entrada Ajustada Contrato', amountCents: 10300, originalAmountCents: 10000, creationInterestCents: 500, creationDiscountCents: 200, status: 'PARTIAL', dueDate: new Date('2026-11-15T12:00:00Z') } });
    await db.financialSettlement.create({ data: { arenaId: arena.id, financialEntryId: revenue.id, amountCents: 3000, interestCents: 100, discountCents: 50, paymentMethod: 'PIX', paidAt: new Date('2026-11-17T12:00:00Z') } });
    const expense = await db.financialEntry.create({ data: { arenaId: arena.id, playerId: client.id, bankAccountId: bank.id, type: 'EXPENSE', category: 'Teste', description: 'Saída Quitada Contrato', amountCents: 19000, originalAmountCents: 20000, creationInterestCents: 0, creationDiscountCents: 1000, status: 'PAID', dueDate: new Date('2026-11-15T12:00:00Z'), paidAt: new Date('2026-11-16T12:00:00Z') } });
    await db.financialSettlement.create({ data: { arenaId: arena.id, financialEntryId: expense.id, amountCents: 20000, interestCents: 1000, paymentMethod: 'Dinheiro', paidAt: new Date('2026-11-16T12:00:00Z') } });
    const targetId = 'z-finance-target-' + tag;
    await db.financialEntry.createMany({ data: Array.from({ length: 21 }, (_, index) => ({ id: index === 20 ? targetId : `a-finance-page-${index}-${tag}`, arenaId: arena.id, playerId: client.id, type: 'REVENUE', category: 'Teste', description: 'Paginação contrato', amountCents: 100, dueDate: new Date('2026-11-30T12:00:00Z') })) });
    const query = 'start=2026-11-01&end=2026-11-30&status=ALL';
    const read = (type, suffix = '') => fetch(`${origin}/api/management/finance/ledger/${type}?${query}${suffix}`, { headers: { cookie } });
    assert.equal((await read('payable')).status, 404, 'Receivable permission must not grant payables');
    const first = await read('receivable'); assert.equal(first.status, 200); assert.equal(first.headers.get('cache-control'), 'private, no-store');
    const data = await first.json(); assert.equal(data.ledger.total, 22); assert.equal(data.ledger.entries.length, 20); assert.equal(data.ledger.pageSize, 20); assert.equal(data.ledger.totalCents, 12450);
    const adjusted = data.ledger.entries.find(entry => entry.id === revenue.id);
    assert.deepEqual(adjusted.composition, { originalCents: 10000, interestCents: 600, discountCents: 250, adjustedCents: 10350, creationKnown: true });
    assert.equal(adjusted.balance.outstandingCents, 7350); assert.equal(adjusted.balance.paidCents, 3000);
    assert.equal(data.clients[0].id, client.id); assert.equal(data.banks[0].id, bank.id); assert.equal(JSON.stringify(data).includes('passwordHash'), false);
    const targeted = await (await read('receivable', '&entryId=' + targetId)).json(); assert.equal(targeted.ledger.page, 2); assert.ok(targeted.ledger.entries.some(entry => entry.id === targetId));
    const sorted = await (await read('receivable', '&sort=amountCents&direction=desc')).json(); assert.equal(sorted.ledger.entries[0].id, revenue.id);
    assert.equal((await read('receivable', '&arenaId=forged')).status, 400);
    assert.equal((await read('receivable', '&start=2026-02-30')).status, 400);
    await db.arenaMember.updateMany({ where: { arenaId: arena.id, userId: staffId }, data: { viewPermissions: ['finance:payable:view'] } });
    assert.equal((await read('receivable')).status, 404);
    const payable = await (await read('payable')).json(); assert.equal(payable.ledger.entries[0].id, expense.id); assert.equal(payable.ledger.totalCents, 20000); assert.equal(payable.ledger.entries[0].balance.outstandingCents, 0); assert.equal(payable.ledger.entries[0].paidAt, '2026-11-16');
    const onlyOpen = await (await read('payable', '&status=OPEN')).json(); assert.equal(onlyOpen.ledger.total, 0);
    await db.arenaMember.updateMany({ where: { arenaId: arena.id, userId: staffId }, data: { viewPermissions: ['finance:receivable:view', 'finance:payable:view'] } });
    return { arenaId: arena.id, cookie, cleanup };
  } catch (error) { await cleanup(); throw error; }
}

export async function assertFinanceSSR(frontendOrigin, cookie) {
  for (const [path, expected] of [['contas-a-receber', 'Entrada Ajustada Contrato'], ['contas-a-pagar', 'Saída Quitada Contrato']]) {
    const response = await fetch(`${frontendOrigin}/financeiro/${path}?start=2026-11-01&end=2026-11-30&status=ALL`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(response.status, 200, 'Financial SSR failed');
    const html = await response.text(); assert.ok(html.includes(expected)); assert.equal(html.includes('Atleta Exclusivo Outra Arena GOAL'), false);
  }
}
