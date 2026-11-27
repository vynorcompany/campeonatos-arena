import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';

/** @param {import('@prisma/client').PrismaClient} db */
export async function createAgencyPagesFixture(db) {
  const arenas = [], users = [], plans = [];
  try {
    /** @type {[string, boolean, number][]} */
    const planRows = [['Plano agência API', false, 15000], ['Trial agência API', true, 0]];
    for (const [name, isTrial, price] of planRows) {
      plans.push(await db.agencyPlan.create({ data: { name: name + ' ' + randomUUID(), isTrial, monthlyPriceCents: price } }));
    }
    for (const name of ['Agência paga API', 'Agência trial API']) arenas.push(await db.arena.create({ data: { name, slug: 'agency-pages-api-' + randomUUID(), createdById: 'goal-test', city: 'Curitiba', email: 'public-agency@example.test' } }));
    const identities = [];
    for (const systemRole of ['MANAGER', 'VIEWER']) {
      const user = await db.user.create({ data: { name: 'Operador Agência API', email: randomUUID() + '@example.test', passwordHash: 'private-agency-password', systemRole, memberships: { create: { arenaId: arenas[0].id, role: 'ADMIN' } } } }); users.push(user);
      const token = randomUUID() + randomUUID();
      await db.session.create({ data: { userId: user.id, token: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
      identities.push({ cookie: `padel_session=${token}; padel_arena=${arenas[0].id}`, token });
    }
    const [manager, viewer] = identities;
    const subscription = await db.agencySubscription.create({ data: { arenaId: arenas[0].id, planId: plans[0].id, nextDueAt: new Date('2035-01-10T10:00:00Z') } });
    const trial = await db.agencySubscription.create({ data: { arenaId: arenas[1].id, planId: plans[1].id, trialEndsAt: new Date('2035-01-10T10:00:00Z') } });
    const invoices = [];
    /** @type {[string, string, string, number][]} */
    const invoiceRows = [['2035-01', 'PAID', '', 10000], ['2035-02', 'PENDING', '', 3000], ['2035-03', 'PAID', 'refunded', 5000]];
    for (const [period, status, review, amount] of invoiceRows) {
      invoices.push(await db.agencyInvoice.create({ data: { subscriptionId: subscription.id, arenaId: arenas[0].id, period, status, paymentReviewStatus: review, amountCents: amount, dueAt: new Date('2035-01-10T10:00:00Z'), providerPaymentId: 'public-invoice-reference', checkoutUrl: status === 'PENDING' ? 'https://checkout.example.test/agency' : '' } }));
    }
    const connection = await db.whatsAppConnection.create({ data: { arenaId: arenas[0].id, instanceName: 'agency-pages-' + randomUUID(), status: 'CONNECTED', connectedPhone: '5541999996300', lastConnectedAt: new Date('2035-01-10T10:00:00Z'), encryptedToken: 'private-agency-token', webhookSecretHash: 'private-agency-webhook', lastError: 'private-provider-error' } });
    const tickets = [];
    for (const status of ['OPEN', 'CLOSED']) tickets.push(await db.supportTicket.create({ data: { arenaId: arenas[0].id, requesterId: users[1].id, assigneeId: users[0].id, code: 'API-' + randomUUID(), title: 'Atendimento agência ' + status, status, description: 'private-support-description', messages: { create: { authorId: users[0].id, body: 'private-internal-support', internal: true } } } }));
    return { arenas, users, plans, manager, viewer, subscription, trial, invoices, connection, tickets };
  } catch (error) { await cleanupAgencyPagesFixture(db, { arenas, users, plans }); throw error; }
}
/** @param {import('@prisma/client').PrismaClient} db */
export async function cleanupAgencyPagesFixture(db, fixture) {
  const ids = fixture.arenas.map(row => row.id), users = fixture.users.map(row => row.id), plans = fixture.plans.map(row => row.id);
  const existing = await db.arena.findMany({ where: { id: { in: ids } } }); assert.equal(existing.length, ids.length); assert.ok(existing.every(row => row.createdById === 'goal-test' && row.slug.startsWith('agency-pages-api-')));
  await db.auditEvent.deleteMany({ where: { OR: [{ arenaId: { in: ids } }, { actorId: { in: users } }] } });
  await db.arena.deleteMany({ where: { id: { in: ids }, slug: { startsWith: 'agency-pages-api-' }, createdById: 'goal-test' } });
  await db.agencyPlan.deleteMany({ where: { id: { in: plans } } });
  await db.user.deleteMany({ where: { id: { in: users }, email: { endsWith: '@example.test' } } });
}
/** @param {import('@prisma/client').PrismaClient} db */
export async function assertAgencyPagesSmoke(db, origin, frontendOrigin) {
  const f = await createAgencyPagesFixture(db);
  const get = (view, cookie = f.manager.cookie) => fetch(`${origin}/api/management/agency/workspaces/${view}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
  const read = async view => { const response = await get(view); assert.equal(response.status, 200, await response.clone().text()); assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.ok(response.headers.get('vary').toLowerCase().includes('cookie')); const body = await response.text(); for (const marker of ['private-agency-', 'private-provider-error', 'private-support-description', 'private-internal-support', 'passwordHash', 'encryptedSecrets', 'encryptedToken', 'webhookSecretHash']) assert.equal(body.includes(marker), false, marker); return JSON.parse(body); };
  try {
    for (const view of ['metrics', 'tickets', 'history', 'plans', 'connections']) { assert.equal((await get(view, '')).status, 307); assert.equal((await get(view, f.viewer.cookie)).status, 403); for (const query of ['arenaId=forged', 'userId=forged', 'view=plans', 'arenaId=a&arenaId=b']) assert.equal((await get(view + '?' + query)).status, 400); }
    assert.equal((await get('unknown')).status, 404);
    const metrics = await read('metrics'); assert.ok(metrics.arenas.some(row => row.id === f.arenas[0].id)); assert.ok(metrics.activeSubscriptions.some(row => row.arenaId === f.arenas[0].id)); assert.equal(metrics.activeSubscriptions.some(row => row.arenaId === f.arenas[1].id), false);
    const all = await db.agencyInvoice.findMany(); assert.equal(metrics.paidInvoiceCents, all.filter(row => row.status === 'PAID' && !row.paymentReviewStatus).reduce((n, row) => n + row.amountCents, 0)); assert.equal(metrics.openInvoiceCents, all.filter(row => row.status === 'PENDING').reduce((n, row) => n + row.amountCents, 0)); assert.equal(metrics.reviewInvoiceCents, all.filter(row => row.paymentReviewStatus).reduce((n, row) => n + row.amountCents, 0)); assert.equal(metrics.mrrCents, metrics.activeSubscriptions.reduce((n, row) => n + row.plan.monthlyPriceCents, 0));
    const tickets = await read('tickets'), history = await read('history'); const expectedTickets = await db.supportTicket.findMany({ orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], take: 8, select: { id: true } }); assert.deepEqual(tickets.tickets.map(row => row.id), expectedTickets.map(row => row.id)); assert.ok(tickets.tickets.some(row => row.id === f.tickets[1].id)); assert.ok(history.tickets.some(row => row.id === f.tickets[1].id)); assert.equal(history.tickets.some(row => row.id === f.tickets[0].id), false); assert.equal(history.tickets.find(row => row.id === f.tickets[1].id).assignee.name, 'Operador Agência API');
    const plans = await read('plans'); assert.ok(plans.plans.some(row => row.id === f.plans[0].id)); assert.equal(plans.subscriptions.find(row => row.id === f.trial.id).trialEndsAt, '2035-01-10T10:00:00.000Z'); assert.equal(plans.invoices.find(row => row.id === f.invoices[1].id).checkoutUrl, 'https://checkout.example.test/agency'); assert.equal(plans.invoices.find(row => row.id === f.invoices[2].id).paymentReviewStatus, 'refunded');
    const connections = await read('connections'), own = connections.arenas.find(row => row.id === f.arenas[0].id); assert.equal(own.whatsappConnection.connectedPhone, '5541999996300'); assert.equal(own.whatsappConnection.lastConnectedAt, '2035-01-10T10:00:00.000Z'); assert.equal(own.whatsappConnection.lastError, 'Não foi possível confirmar a conexão. Verifique a integração da arena.'); assert.equal(connections.arenas.find(row => row.id === f.arenas[1].id).whatsappConnection, null);
    for (const [path, expected] of [['/agencia', 'Atendimento agência CLOSED'], ['/agencia/financeiro', 'MRR atual'], ['/agencia/financeiro/previsoes', 'cenário conservador'], ['/agencia/planos', f.plans[0].name], ['/agencia/conexoes', 'Agência paga API'], ['/agencia/suporte/historico', 'Atendimento agência CLOSED']]) { const response = await fetch(frontendOrigin + path, { headers: { cookie: f.manager.cookie }, redirect: 'manual' }); assert.equal(response.status, 200, await response.clone().text()); const html = await response.text(); assert.ok(html.includes(expected), path); for (const marker of ['private-agency-token', 'private-agency-password', 'private-internal-support', 'private-provider-error', 'private-support-description']) assert.equal(html.includes(marker), false, path + ': ' + marker); }
    assert.equal(await db.agencyInvoice.count({ where: { arenaId: { in: f.arenas.map(row => row.id) } } }), 3); assert.equal(await db.financialEntry.count({ where: { arenaId: { in: f.arenas.map(row => row.id) } } }), 0);
    console.log('Agency page HTTP: authenticated agency-only reads, no authority overrides, minimal credential-free DTOs, paid/review/open metrics and non-trial MRR, plan/invoice dates, sanitized connection failures, ticket history and six SSR pages passed without issuing charges.');
  } finally { await cleanupAgencyPagesFixture(db, f); }
}
