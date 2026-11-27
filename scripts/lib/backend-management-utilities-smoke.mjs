import assert from 'node:assert/strict';
import { createAgencyPagesFixture, cleanupAgencyPagesFixture } from './backend-agency-pages-smoke.mjs';
/** @param {import('@prisma/client').PrismaClient} db */
export async function assertManagementUtilitiesSmoke(db, origin, frontendOrigin) {
  const f = await createAgencyPagesFixture(db);
  const get = (view, cookie = f.viewer.cookie) => fetch(`${origin}/api/management/utilities/${view}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
  const read = async view => { const response = await get(view); assert.equal(response.status, 200, await response.clone().text()); assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.ok(response.headers.get('vary').includes('Cookie')); const body = await response.text(); for (const key of ['encrypted', 'passwordHash', 'providerPaymentId', 'subscriptionId', f.arenas[1].id]) assert.equal(body.includes(key), false); return JSON.parse(body); };
  try {
    for (const view of ['access', 'printer']) {
      assert.equal((await get(view, '')).status, 307);
      for (const query of ['?arenaId=' + f.arenas[1].id, '?arenaId=a&arenaId=b', '?userId=forged']) assert.equal((await get(view + query)).status, 400);
    }
    assert.equal((await get('unknown')).status, 404);
    assert.deepEqual(await read('printer'), { printerPaper: '80MM', printerCopies: 1 });
    await db.arenaOperationalSettings.create({ data: { arenaId: f.arenas[0].id, printerPaper: '58MM', printerCopies: 3 } });
    await db.arenaOperationalSettings.create({ data: { arenaId: f.arenas[1].id, printerPaper: 'A4', printerCopies: 2 } });
    assert.deepEqual(await read('printer'), { printerPaper: '58MM', printerCopies: 3 });
    const printPage = await fetch(`${frontendOrigin}/imprimir/teste`, { headers: { cookie: f.viewer.cookie }, redirect: 'manual' }); assert.equal(printPage.status, 200); const printHtml = await printPage.text(); assert.ok(printHtml.includes('data-print-paper="58MM"')); assert.ok(printHtml.includes('VIA ')); assert.ok(printHtml.includes(f.arenas[0].name)); assert.equal(printHtml.includes(f.arenas[1].name), false);
    assert.deepEqual(await read('access'), { reason: 'UNAVAILABLE', checkoutUrl: 'https://checkout.example.test/agency' });
    // A blocked ordinary user can read the access summary, but cannot print.
    await db.agencySubscription.update({ where: { id: f.subscription.id }, data: { status: 'PAUSED' } });
    assert.equal((await get('access')).status, 200);
    const blocked = await get('printer'); assert.equal(blocked.status, 307); assert.ok(blocked.headers.get('location').endsWith('/acesso-indisponivel'));
    const accessPage = await fetch(`${frontendOrigin}/acesso-indisponivel`, { headers: { cookie: f.viewer.cookie }, redirect: 'manual' }); assert.equal(accessPage.status, 200); assert.ok((await accessPage.text()).includes('Pagar fatura em aberto'));
    // Same session selecting the second authorized arena sees its own expired trial.
    await db.arenaMember.create({ data: { arenaId: f.arenas[1].id, userId: f.users[1].id, role: 'ADMIN' } });
    await db.agencySubscription.update({ where: { id: f.trial.id }, data: { trialEndsAt: new Date('2000-01-01') } });
    const second = f.viewer.cookie.replace(f.arenas[0].id, f.arenas[1].id);
    const trial = await get('access', second); assert.equal(trial.status, 200); assert.deepEqual(await trial.json(), { reason: 'TRIAL_ENDED', checkoutUrl: null });
    assert.equal(await db.financialEntry.count({ where: { arenaId: { in: f.arenas.map(row => row.id) } } }), 0);
    console.log('Management utilities HTTP: own-arena printer settings/defaults, scoped expired trial and invoice link, blocked access summary without redirect loop, printer access gate, strict queries and SSR passed without issuing charges.');
  } finally { await cleanupAgencyPagesFixture(db, f); }
}
