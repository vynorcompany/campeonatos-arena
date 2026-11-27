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
    const write = async (operation, fields, requestOrigin = 'http://127.0.0.1:3014') => fetch(`${origin}/api/management/finance/actions/${operation}`, { method: 'POST', headers: { cookie, origin: requestOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value : [value]])) }) });
    const createFields = { type: 'REVENUE', category: 'Teste', description: 'Mutação financeira contrato', amount: '100,00', interest: '5,00', discount: '2,00', discountMode: 'AMOUNT', status: 'PENDING', clientId: client.id, bankAccountId: bank.id, dueDate: '2026-11-30' };
    assert.equal((await write('create', createFields)).status, 403, 'View must not grant financial writes');
    await db.arenaMember.updateMany({ where: { arenaId: arena.id, userId: staffId }, data: { editPermissions: ['finance:receivable:create', 'finance:receivable:edit', 'finance:receivable:settle'] } });
    assert.equal((await write('create', createFields, 'https://foreign.invalid')).status, 403);
    assert.equal((await write('create', { ...createFields, arenaId: arena.id })).status, 400);
    const created = await write('create', createFields); assert.equal(created.status, 200, await created.text());
    const written = await db.financialEntry.findFirstOrThrow({ where: { arenaId: arena.id, description: createFields.description } });
    assert.equal(written.amountCents, 10300); assert.equal(written.originalAmountCents, 10000); assert.equal(written.creationInterestCents, 500); assert.equal(written.creationDiscountCents, 200);
    assert.equal((await write('create', { ...createFields, type: 'EXPENSE' })).status, 403, 'Receivable create cannot create an expense');
    const settleFields = { entryId: written.id, expectedUpdatedAt: written.updatedAt.toISOString(), amount: '103,00', interest: '0', discount: '0', discountMode: 'AMOUNT', paymentMethod: 'PIX', bankAccountId: bank.id, paidAt: '2026-11-26' };
    const settled = await Promise.all([write('settle', settleFields), write('settle', settleFields)]);
    assert.ok(settled.some(response => response.status === 200));
    assert.equal(await db.financialSettlement.count({ where: { financialEntryId: written.id } }), 1, 'Concurrent retries must never duplicate settlement');
    const after = await db.financialEntry.findUniqueOrThrow({ where: { id: written.id } }); assert.equal(after.status, 'PAID');
    assert.equal((await write('delete', { entryId: written.id })).status, 403, 'Financial deletion requires explicit authority');
    const editable = await db.financialEntry.create({ data: { arenaId: arena.id, type: 'REVENUE', category: 'Teste', description: 'Editar contrato', amountCents: 1000, originalAmountCents: 1000 } });
    const updateFields = { entryId: editable.id, expectedUpdatedAt: editable.updatedAt.toISOString(), category: 'Teste', description: 'Editado contrato', amount: '12,00', bankAccountId: bank.id };
    const updated = await write('update', updateFields); assert.equal(updated.status, 200, await updated.text());
    assert.equal((await db.financialEntry.findUniqueOrThrow({ where: { id: editable.id } })).amountCents, 1200);
    const stale = await write('update', updateFields); assert.equal(stale.status, 200); assert.ok((await stale.json()).error, 'Stale update must be refused');
    const voided = await write('void', { entryId: editable.id, reason: 'Validação descartável' }); assert.equal(voided.status, 200, await voided.text());
    assert.equal((await db.financialEntry.findUniqueOrThrow({ where: { id: editable.id } })).status, 'VOIDED');
    const recurrence = await write('recurrence', { type: 'REVENUE', counterpartyName: client.name, clientId: client.id, category: 'Teste', description: 'Recorrência contrato', amount: '10,00', frequency: 'MONTHLY', startsAt: '2026-11-01', endsAt: '2027-01-01', bankAccountId: bank.id });
    assert.equal(recurrence.status, 200, await recurrence.text());
    assert.equal(await db.financialRecurrence.count({ where: { arenaId: arena.id, description: 'Recorrência contrato' } }), 1);

    await db.arenaMember.updateMany({ where: { arenaId: arena.id, userId: staffId }, data: { editPermissions: [] } });
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
