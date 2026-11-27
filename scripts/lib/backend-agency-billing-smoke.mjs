import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createAgencyPagesFixture, cleanupAgencyPagesFixture } from './backend-agency-pages-smoke.mjs';

/** @param {import('@prisma/client').PrismaClient} db */
export async function assertAgencyBillingSmoke(db, origin, frontendOrigin) {
  const f = await createAgencyPagesFixture(db);
  const createdName = 'Plano API ' + randomUUID();
  const originalConnection = await db.agencyPaymentConnection.findUnique({ where: { id: 'platform' } });
  const post = (operation, input, cookie = f.manager.cookie, requestOrigin = frontendOrigin) => fetch(`${origin}/api/management/agency/billing/${operation}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(requestOrigin ? { origin: requestOrigin } : {}) }, body: JSON.stringify(input), redirect: 'manual' });
  const outcome = async response => { assert.equal(response.status, 200, await response.clone().text()); const value = await response.json(); assert.equal(response.headers.get('cache-control'), 'private, no-store'); return value; };
  const success = async response => { const result = await outcome(response); assert.equal(result.error, null, result.error); return result; };
  const reject = async response => { const result = await outcome(response); assert.equal(typeof result.error, 'string'); assert.equal(result.changed, false); return result.error; };
  const createArena = async name => { const arena = await db.arena.create({ data: { name, slug: 'agency-pages-api-' + randomUUID(), createdById: 'goal-test' } }); f.arenas.push(arena); return arena; };
  try {
    assert.ok(!originalConnection || originalConnection.status !== 'CONNECTED', 'Isolated fixture must not have a live payment connection.');
    const fields = { plan: { name: 'Plano bloqueado API', monthlyPrice: '100,00' }, assign: { arenaId: f.arenas[0].id, planId: f.plans[0].id }, status: { subscriptionId: f.subscription.id, status: 'PAUSED' }, checkout: { invoiceId: f.invoices[1].id }, grace: { enabled: 'on', graceDays: '7' } };
    for (const operation of Object.keys(fields)) {
      assert.equal((await post(operation, fields[operation], '')).status, 307);
      assert.equal((await post(operation, fields[operation])).status, 403);
      assert.equal((await post(operation, fields[operation], f.viewer.cookie)).status, 403);
      assert.equal((await post(operation, fields[operation], f.manager.cookie, 'https://foreign.invalid')).status, 403);
      assert.equal((await post(operation, fields[operation], f.manager.cookie, '')).status, 403);
    }
    assert.equal(await db.agencyPlan.count({ where: { name: 'Plano bloqueado API' } }), 0);
    await db.user.update({ where: { id: f.users[0].id }, data: { systemRole: 'ADMIN' } });
    for (const operation of Object.keys(fields)) for (const key of ['userId', 'systemRole', 'accessToken', 'encryptedSecrets', 'monthlyPriceCents', 'paymentStatus']) assert.equal((await post(operation, { ...fields[operation], [key]: 'forged' })).status, 400);
    assert.equal((await post('unknown', {})).status, 404);
    assert.equal((await post('assign', { arenaId: [f.arenas[0].id, f.arenas[1].id], planId: f.plans[0].id })).status, 400);
    assert.equal((await success(await post('plan', { name: createdName, monthlyPrice: '125,50' }))).changed, true);
    const duplicatePlan = await post('plan', { name: createdName, monthlyPrice: '125,50' }); assert.equal(duplicatePlan.status, 500); const hiddenFailure = await duplicatePlan.json(); assert.equal(hiddenFailure.changed, false); assert.equal(hiddenFailure.error, 'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.'); assert.equal(await db.agencyPlan.count({ where: { name: createdName } }), 1);
    assert.equal((await post('plan', { name: 'x'.repeat(40 * 1024), monthlyPrice: '1,00' })).status, 413);
    const created = await db.agencyPlan.findUniqueOrThrow({ where: { name: createdName } }); f.plans.push(created); assert.equal(created.monthlyPriceCents, 12550);
    assert.match(await reject(await post('plan', { id: f.plans[1].id, name: 'Trial alterado', monthlyPrice: '100,00' })), /não pode ser alterado/);
    assert.match(await reject(await post('plan', { name: 'Preço inválido API', monthlyPrice: '0,00' })), /maior que zero/);
    const paidArena = await createArena('Primeira fatura API');
    const concurrent = await Promise.all([post('assign', { arenaId: paidArena.id, planId: f.plans[0].id }), post('assign', { arenaId: paidArena.id, planId: f.plans[0].id })]);
    const assigned = await Promise.all(concurrent.map(success)); assert.ok(assigned.some(result => result.changed));
    const subscription = await db.agencySubscription.findUniqueOrThrow({ where: { arenaId: paidArena.id } });
    const invoice = await db.agencyInvoice.findFirstOrThrow({ where: { subscriptionId: subscription.id } });
    const entry = await db.financialEntry.findUniqueOrThrow({ where: { id: invoice.financialEntryId }, include: { settlements: true } });
    assert.equal(invoice.status, 'PENDING'); assert.equal(invoice.amountCents, 15000); assert.equal(entry.type, 'EXPENSE'); assert.equal(entry.source, 'AGENCY_SUBSCRIPTION'); assert.equal(entry.status, 'PENDING'); assert.equal(entry.amountCents, 15000); assert.equal(entry.settlements.length, 0); assert.ok(subscription.nextDueAt > invoice.dueAt);
    assert.equal((await success(await post('assign', { arenaId: paidArena.id, planId: f.plans[0].id }))).changed, false);
    assert.equal(await db.agencyInvoice.count({ where: { subscriptionId: subscription.id } }), 1); assert.equal(await db.financialEntry.count({ where: { arenaId: paidArena.id } }), 1);
    await success(await post('plan', { id: f.plans[0].id, name: f.plans[0].name, monthlyPrice: '175,00' }));
    assert.equal((await db.agencyPlan.findUniqueOrThrow({ where: { id: f.plans[0].id } })).monthlyPriceCents, 17500); assert.equal((await db.agencyInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).amountCents, 15000); assert.equal((await db.financialEntry.findUniqueOrThrow({ where: { id: entry.id } })).amountCents, 15000);
    await success(await post('status', { subscriptionId: subscription.id, status: 'CANCELED' })); assert.equal((await db.agencySubscription.findUniqueOrThrow({ where: { id: subscription.id } })).status, 'CANCELED'); assert.equal((await db.financialEntry.findUniqueOrThrow({ where: { id: entry.id } })).status, 'PENDING');
    await db.agencySubscription.update({ where: { id: subscription.id }, data: { nextDueAt: null } }); await success(await post('status', { subscriptionId: subscription.id, status: 'ACTIVE' })); assert.ok((await db.agencySubscription.findUniqueOrThrow({ where: { id: subscription.id } })).nextDueAt);
    assert.match(await reject(await post('status', { subscriptionId: subscription.id, status: 'FORGED' })), /status inválido/);
    const trialArena = await createArena('Trial sem cobrança API'), before = Date.now();
    await success(await post('assign', { arenaId: trialArena.id, planId: f.plans[1].id }));
    const trial = await db.agencySubscription.findUniqueOrThrow({ where: { arenaId: trialArena.id } }); assert.ok(trial.trialEndsAt.getTime() >= before + 7 * 86400000); assert.ok(trial.trialEndsAt.getTime() <= Date.now() + 7 * 86400000); assert.equal(trial.nextDueAt, null); assert.equal(await db.agencyInvoice.count({ where: { arenaId: trialArena.id } }), 0); assert.equal(await db.financialEntry.count({ where: { arenaId: trialArena.id } }), 0);
    assert.equal((await success(await post('assign', { arenaId: trialArena.id, planId: f.plans[1].id }))).changed, false); assert.equal((await db.agencySubscription.findUniqueOrThrow({ where: { id: trial.id } })).trialEndsAt.toISOString(), trial.trialEndsAt.toISOString());
    await success(await post('status', { subscriptionId: trial.id, status: 'CANCELED' })); assert.match(await reject(await post('assign', { arenaId: trialArena.id, planId: f.plans[1].id })), /só pode ser utilizado uma vez/);
    await db.agencySubscription.update({ where: { id: trial.id }, data: { trialEndsAt: new Date('2000-01-01'), status: 'EXPIRED' } }); assert.match(await reject(await post('status', { subscriptionId: trial.id, status: 'ACTIVE' })), /trial terminou/);
    await success(await post('assign', { arenaId: f.arenas[1].id, planId: f.plans[0].id })); const future = await db.agencySubscription.findUniqueOrThrow({ where: { id: f.trial.id } }); assert.equal(future.trialEndsAt.toISOString(), '2035-01-10T10:00:00.000Z'); assert.equal(future.nextDueAt.toISOString(), future.trialEndsAt.toISOString()); assert.equal(await db.agencyInvoice.count({ where: { arenaId: f.arenas[1].id } }), 0);
    assert.match(await reject(await post('checkout', { invoiceId: invoice.id })), /Conecte o Mercado Pago/); assert.equal((await db.agencyInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).checkoutUrl, '');
    await success(await post('grace', { enabled: 'on', graceDays: '7' })); assert.equal((await db.agencyPaymentConnection.findUniqueOrThrow({ where: { id: 'platform' } })).graceDays, 7);
    assert.match(await reject(await post('grace', { enabled: 'on', graceDays: '61' })), /0 a 60/); assert.equal((await db.agencyPaymentConnection.findUniqueOrThrow({ where: { id: 'platform' } })).graceDays, 7);
    await success(await post('grace', { graceDays: 'ignored-when-disabled' })); assert.equal((await db.agencyPaymentConnection.findUniqueOrThrow({ where: { id: 'platform' } })).graceDays, null);
    assert.equal(await db.agencyInvoice.count({ where: { arenaId: { in: f.arenas.map(row => row.id) } } }), 4);
    console.log('Agency billing HTTP: administrator-only writes, strict Origin/fields, concurrent paid assignment with one first invoice/payable, active no-op, immutable issued amounts, cancellation/reactivation preserving debt, seven-day single-use trial, preserved future trial, disconnected checkout and grace validation passed without sending to providers.');
  } finally {
    const createdPlan = await db.agencyPlan.findUnique({ where: { name: createdName } }); if (createdPlan && !f.plans.some(row => row.id === createdPlan.id)) f.plans.push(createdPlan);
    if (originalConnection) await db.agencyPaymentConnection.upsert({ where: { id: 'platform' }, create: originalConnection, update: originalConnection });
    else { const connection = await db.agencyPaymentConnection.findUnique({ where: { id: 'platform' } }); if (connection) { assert.equal(connection.status, 'PENDING'); assert.equal(connection.encryptedSecrets, ''); await db.agencyPaymentConnection.delete({ where: { id: 'platform' } }); } }
    const owned = await db.arena.findMany({ where: { id: { in: f.arenas.map(row => row.id) } }, select: { slug: true, createdById: true } }); assert.equal(owned.length, f.arenas.length); assert.ok(owned.every(row => row.slug.startsWith('agency-pages-api-') && row.createdById === 'goal-test'));
    await db.financialEntry.deleteMany({ where: { arenaId: { in: f.arenas.map(row => row.id) }, source: 'AGENCY_SUBSCRIPTION' } });
    await cleanupAgencyPagesFixture(db, f);
  }
}
