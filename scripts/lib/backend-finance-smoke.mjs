import { assertArenaConfigurationSmoke } from './backend-arena-configuration-smoke.mjs';
import { assertUserMutationsSmoke } from './backend-user-mutations-smoke.mjs';
import { assertAccessSmoke } from './backend-access-smoke.mjs';
import { assertAssistantSmoke } from './backend-assistant-smoke.mjs';
import { assertSupportSmoke } from './backend-support-smoke.mjs';
import { assertAuditRegulationSmoke } from './backend-audit-regulation-smoke.mjs';
import { assertAdminSettingsSmoke, assertDeviceSessionsSmoke } from './backend-admin-settings-smoke.mjs';
import { assertBoletoQueueSmoke } from './backend-boleto-queue-smoke.mjs';
import { assertFiscalInvoicesSmoke } from './backend-fiscal-invoices-smoke.mjs';
import { assertNfeSmoke } from './backend-nfe-smoke.mjs';
import { assertCashSmoke } from './backend-cash-smoke.mjs';
import { assertProductsSmoke } from './backend-products-smoke.mjs';
import { assertAcademySmoke } from './backend-academy-smoke.mjs';
import assert from 'node:assert/strict';

/** All records are owned by a disposable arena and removed by the caller. */
export async function prepareFinanceSmoke(db, databaseUrl, origin, staffId, staffToken, tag) {
  const database = new URL(databaseUrl);
  assert.equal(database.hostname, '127.0.0.1'); assert.equal(database.port, '55433'); assert.equal(database.pathname, '/arena_goal');
  const slug = 'finance-contract-' + tag;
  const arena = await db.arena.create({ data: { name: 'Finance disposable contract', slug, createdById: 'goal-test' } });
  const cleanup = async () => { await db.erasedContactReference.deleteMany({ where: { arenaId: arena.id } }); await db.privacyRequest.deleteMany({ where: { arenaId: arena.id } }); await db.auditEvent.deleteMany({ where: { arenaId: arena.id } }); return db.arena.deleteMany({ where: { id: arena.id, slug } }); };
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

    const settings = area => fetch(`${origin}/api/management/finance/settings/${area}`, { headers: { cookie } });
    assert.equal((await settings('contas-bancarias')).status, 404, 'Ledger access must not grant settings');
    await db.arenaMember.updateMany({ where: { arenaId: arena.id, userId: staffId }, data: { editPermissions: ['finance:settings:manage'] } });
    const createSupplier = await write('settings-create-financial-setting', { area: 'fornecedores', name: 'Fornecedor Contrato', type: 'EXPENSE', email: 'supplier@example.test' }); assert.equal(createSupplier.status, 200, await createSupplier.text());
    const suppliers = await (await settings('fornecedores')).json(); assert.equal(suppliers.rows[0].supplier.email, 'supplier@example.test');
    const coupon = await write('settings-create-coupon', { code: ' contrato 10 ', discountType: 'PERCENTAGE', discountValue: '10', minimumAmount: '25,00', maxUses: '', startsAt: '', endsAt: '' }); assert.equal(coupon.status, 200, await coupon.text());
    const coupons = await (await settings('cupons')).json(); assert.equal(coupons.coupons[0].code, 'CONTRATO10'); assert.equal(coupons.coupons[0].minimumAmountCents, 2500);
    const invalidCoupon = await write('settings-update-coupon', { couponId: coupons.coupons[0].id, code: 'CONTRATO10', discountType: 'PERCENTAGE', discountValue: '101', minimumAmount: '0', maxUses: '', startsAt: '', endsAt: '' }); assert.equal(invalidCoupon.status, 400, await invalidCoupon.text());
    const reconcile = { bankAccountId: bank.id, balance: '200,00' };
    const reconciled = await write('settings-reconcile-bank-account-balance', reconcile); assert.equal(reconciled.status, 200, await reconciled.text());
    const countBefore = await db.financialEntry.count({ where: { arenaId: arena.id, category: 'AJUSTE DE SALDO BANCÁRIO' } });
    assert.equal((await write('settings-reconcile-bank-account-balance', reconcile)).status, 200); assert.equal(await db.financialEntry.count({ where: { arenaId: arena.id, category: 'AJUSTE DE SALDO BANCÁRIO' } }), countBefore);
    const connected = await write('settings-connect-payment-provider', { provider: 'SICOOB', environment: 'SANDBOX', clientId: 'synthetic-client', clientSecret: 'synthetic-secret-value', pixKey: 'synthetic-pix', certificate: 'synthetic-certificate', privateKey: 'synthetic-private-key' }); assert.equal(connected.status, 200, await connected.text());
    const stored = await db.paymentConnection.findFirstOrThrow({ where: { arenaId: arena.id, provider: 'SICOOB' } }); assert.ok(stored.encryptedSecrets); assert.equal(stored.encryptedSecrets.includes('synthetic-secret-value'), false);
    const connections = await (await settings('pagamentos-online')).json(); assert.equal(connections.connections[0].status, 'CONFIGURED'); assert.equal(JSON.stringify(connections).includes(stored.encryptedSecrets), false); assert.equal(JSON.stringify(connections).includes('synthetic-private-key'), false);
    await db.arena.update({ where: { id: arena.id }, data: { cnpj: '11222333000181' } });
    const fiscal = await write('settings-update-fiscal-settings', { provider: 'FOCUS', environment: 'SANDBOX', crt: '1', issuerState: 'PR', series: '1', nextNumber: '1', focusCnpj: '11222333000181', focusSandboxToken: 'synthetic-focus-token' }); assert.equal(fiscal.status, 200, await fiscal.text());
    const fiscalRead = await (await settings('notas-fiscais')).json(); assert.equal(fiscalRead.fiscal.hasFocusTokens, true); assert.equal(JSON.stringify(fiscalRead).includes('synthetic-focus-token'), false);
    assert.ok(await db.auditEvent.findFirst({ where: { arenaId: arena.id, actorId: staffId, entityId: stored.id } }), 'Connector mutation must retain the authenticated audit actor');
    const audit = await db.auditEvent.findMany({ where: { arenaId: arena.id } }); const auditText = JSON.stringify(audit); assert.equal(auditText.includes('synthetic-secret-value'), false); assert.equal(auditText.includes('synthetic-private-key'), false); assert.equal(auditText.includes('synthetic-focus-token'), false);
    for (const area of ['categorias-produtos', 'categorias-financeiras', 'formas-pagamento', 'contas-bancarias']) { const response = await settings(area); assert.equal(response.status, 200, area); }
    assert.equal((await fetch(`${origin}/api/management/finance/settings/cupons?arenaId=forged`, { headers: { cookie } })).status, 400);
    await db.arenaMember.updateMany({ where: { arenaId: arena.id, userId: staffId }, data: { editPermissions: ['finance:settings:manage', 'finance:receivable:create', 'finance:receivable:settle', 'finance:payable:create', 'finance:payable:edit'] } });
    const invalidPolicy = await write('academy-create-plan', { name: 'Plano Invalido Contrato', monthlyPrice: '100,00', classesPerMonth: '4', creditExpiryCycle: 'CUSTOM', creditExpiryDays: '', notes: '' }); assert.equal(invalidPolicy.status, 400, await invalidPolicy.text());
    const planCreated = await write('academy-create-plan', { name: 'Plano Contrato Isolado', monthlyPrice: '100,00', classesPerMonth: '4', creditExpiryCycle: 'MONTHLY', creditExpiryDays: '', notes: '' }); assert.equal(planCreated.status, 200, await planCreated.text());
    const plan = await db.plan.findFirstOrThrow({ where: { arenaId: arena.id, name: 'Plano Contrato Isolado' } }); assert.equal(plan.createdByUserId, staffId);
    // The synthetic client deliberately has no fiscal document/address/email:
    // the existing boleto eligibility check refuses issuance before any provider call.
    const student = await db.student.create({ data: { arenaId: arena.id, playerId: client.id, name: client.name } });
    const subscriptionCreated = await write('academy-create-subscription', { studentId: student.id, planId: plan.id, dueDay: '15', startedAt: '2026-11-01', notes: '' }); assert.equal(subscriptionCreated.status, 200, await subscriptionCreated.text());
    const subscription = await db.studentSubscription.findFirstOrThrow({ where: { arenaId: arena.id, studentId: student.id, planId: plan.id } });
    assert.equal(await db.financialEntry.count({ where: { arenaId: arena.id, planId: plan.id } }), 12);
    const payment = await write('academy-record-plan-payment', { subscriptionId: subscription.id, bankAccountId: bank.id, referenceMonth: '2026-11', paidAt: '2026-11-26', paymentMethod: 'PIX', amount: '100,00', fiscalDocumentType: '' }); assert.equal(payment.status, 200, await payment.text());
    const paidMonth = await db.financialEntry.findFirstOrThrow({ where: { arenaId: arena.id, planId: plan.id, status: 'PAID' } }); assert.equal(await db.financialSettlement.count({ where: { financialEntryId: paidMonth.id } }), 1);
    const payrollFields = { userId: staffId, referenceMonth: '2026-11', fixedSalary: '1000,00', monthlyHours: '220', overtimeHours: '0', nightHours: '0', nightOvertimeHours: '0', nightPercentage: '20', nightHourMinutes: '52.5', overtimePercentage: '50', bonus: '0', benefits: '0', discount: '0', advance: '0', status: 'PENDING', dueDate: '2026-11-30', paidAt: '', notes: '', expectedVersion: 'NEW' };
    const payrollSaved = await write('payroll-upsert-payroll-entry', payrollFields); assert.equal(payrollSaved.status, 200, await payrollSaved.text());
    const payroll = await db.employeePayrollEntry.findFirstOrThrow({ where: { arenaId: arena.id, userId: staffId, referenceMonth: '2026-11' }, include: { financialEntry: true } }); assert.equal(payroll.financialEntry.amountCents, 100000);
    const stalePayroll = await write('payroll-upsert-payroll-entry', payrollFields); assert.equal(stalePayroll.status, 200); assert.ok((await stalePayroll.json()).error);
    const foreignEmployee = await write('payroll-upsert-payroll-entry', { ...payrollFields, userId: 'goal-test' }); assert.equal(foreignEmployee.status, 400, await foreignEmployee.text());
    const workspace = area => fetch(`${origin}/api/management/finance/workspaces/${area}?mes=2026-11`, { headers: { cookie } });
    for (const area of ['plans', 'monthly', 'payroll']) { const response = await workspace(area); assert.equal(response.status, 200, area); const text = await response.text(); assert.equal(text.includes('passwordHash'), false); }
    await db.arenaMember.updateMany({ where: { arenaId: arena.id, userId: staffId }, data: { viewPermissions: ['finance:receivable:view'] } });
    assert.equal((await workspace('payroll')).status, 404, 'Receivable read must not expose employee payroll');
    await db.arenaMember.updateMany({ where: { arenaId: arena.id, userId: staffId }, data: { viewPermissions: ['finance:receivable:view', 'finance:payable:view'] } });
    const payrollRead = await (await workspace('payroll')).json(); assert.equal(payrollRead.payroll[0].financialEntry.amountCents, 100000); assert.equal(payrollRead.employees.length, 1);
    assert.equal((await fetch(`${origin}/api/management/finance/workspaces/monthly?arenaId=forged`, { headers: { cookie } })).status, 400);
    const academy = await assertAcademySmoke(db, origin, arena.id, cookie, staffId, plan.id);
    await assertProductsSmoke(db, origin, arena.id, cookie, staffId);
    await assertCashSmoke(db, origin, arena.id, cookie, staffId);
    await assertNfeSmoke(db, origin, arena.id, cookie, staffId);
    const fiscalDocumentId = await assertFiscalInvoicesSmoke(db, origin, arena.id, cookie, staffId);
    await assertBoletoQueueSmoke(db, origin, arena.id, cookie, staffId);
    await assertAdminSettingsSmoke(db, origin, arena.id, cookie, staffId);
    await assertDeviceSessionsSmoke(db, origin, cookie, staffId);
    await assertUserMutationsSmoke(db, origin, arena.id, cookie, staffId);
    await assertArenaConfigurationSmoke(db, origin, arena.id, cookie, staffId);
    const access = await assertAccessSmoke(db, origin, arena.id, cookie, staffId);
    const assistant = await assertAssistantSmoke(db, origin, arena.id, cookie, staffId);
    const support = await assertSupportSmoke(db, origin, arena.id, cookie, staffId);
    const auditRegulation = await assertAuditRegulationSmoke(db, origin, arena.id, cookie, staffId);
    const queueMember = await db.arenaMember.findFirstOrThrow({ where: { arenaId: arena.id, userId: staffId } });
    await db.arenaMember.update({ where: { id: queueMember.id }, data: { editPermissions: [...queueMember.editPermissions, "finance:receivable:view", "arena:settings"] } });
    return { arenaId: arena.id, cookie, cleanup, teacherId: academy.teacherId, fiscalDocumentId, ...access, ...assistant, ...support, ...auditRegulation };
  } catch (error) { await cleanup(); throw error; }
}

export async function assertFinanceSSR(frontendOrigin, cookie) {
  for (const [path, expected] of [['contas-a-receber', 'Entrada Ajustada Contrato'], ['contas-a-pagar', 'Saída Quitada Contrato']]) {
    const response = await fetch(`${frontendOrigin}/financeiro/${path}?start=2026-11-01&end=2026-11-30&status=ALL`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(response.status, 200, 'Financial SSR failed');
    const html = await response.text(); assert.ok(html.includes(expected)); assert.equal(html.includes('Atleta Exclusivo Outra Arena GOAL'), false);
  }
}

export async function assertFinancialSettingsSSR(frontendOrigin, cookie) {
  for (const area of ['categorias-produtos', 'cupons', 'notas-fiscais', 'pagamentos-online', 'categorias-financeiras', 'formas-pagamento', 'contas-bancarias', 'fornecedores']) {
    const response = await fetch(`${frontendOrigin}/financeiro/configuracoes/${area}`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(response.status, 200, `Settings SSR failed: ${area}`);
    const html = await response.text(); assert.equal(html.includes('synthetic-focus-token'), false); assert.equal(html.includes('synthetic-secret-value'), false);
  }
}

export async function assertFinanceWorkspacesSSR(frontendOrigin, cookie) {
  for (const path of ['planos', 'mensalidades', 'folha']) {
    const response = await fetch(`${frontendOrigin}/financeiro/${path}?mes=2026-11`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(response.status, 200, `Workspace SSR failed: ${path}`);
    assert.equal((await response.text()).includes('passwordHash'), false);
  }
}
