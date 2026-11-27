import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/** All documents belong to the caller's disposable arena; no provider request is made. */
export async function assertFiscalInvoicesSmoke(db, origin, arenaId, cookie, staffId) {
  const member = await db.arenaMember.findFirstOrThrow({ where: { arenaId, userId: staffId } });
  const base = `${origin}/api/management/finance/invoices`;
  const get = (suffix = '') => fetch(base + suffix, { headers: { cookie } });
  const post = (fields, requestOrigin = 'http://127.0.0.1:3014') => fetch(base + '/consult', { method: 'POST', headers: { cookie, origin: requestOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
  const marker = 'private-fiscal-' + randomUUID();
  const create = data => db.fiscalDocument.create({ data: { arenaId, accessKey: randomUUID(), provider: 'FOCUS', environment: 'SANDBOX', supplierDocument: 'SYNTHETIC-MISMATCH', requestPayload: { privateMarker: marker }, ...data } });
  const authorized = await create({ status: 'AUTHORIZED', xmlUrl: 'https://homologacao.focusnfe.com.br/synthetic.xml', printUrl: '/synthetic.html' });
  const pending = await create({ status: 'PENDING' });
  const unsafe = await create({ status: 'AUTHORIZED', xmlUrl: 'https://user@homologacao.focusnfe.com.br/synthetic.xml', printUrl: 'https://foreign.invalid/synthetic.html' });
  const otherArena = await db.arena.findFirstOrThrow({ where: { id: { not: arenaId } }, select: { id: true } });
  const foreign = await db.fiscalDocument.create({ data: { arenaId: otherArena.id, accessKey: randomUUID(), provider: 'FOCUS', status: 'PENDING', supplierName: marker } });
  try {
    await db.arenaMember.update({ where: { id: member.id }, data: { editPermissions: [], viewPermissions: ['finance:receivable:view'] } });
    assert.equal((await get()).status, 404);
    assert.equal((await post({ documentId: pending.id })).status, 403);
    await db.arenaMember.update({ where: { id: member.id }, data: { editPermissions: ['finance:settings:manage'], viewPermissions: [] } });
    assert.equal((await get()).status, 404);
    assert.deepEqual(await (await post({ documentId: 'not-this-arena' })).json(), { error: 'Nota não encontrada nesta arena.' });
    await db.arenaMember.update({ where: { id: member.id }, data: { viewPermissions: ['finance:receivable:view'] } });
    assert.equal((await get('?arenaId=forged')).status, 400);
    assert.equal((await get('?documentId=a&documentId=b')).status, 400);
    const response = await get('?documentId=' + authorized.id); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const body = await response.json(); assert.equal(body.documents.length, 1); assert.equal(body.documents[0].hasXml, true); assert.equal(body.documents[0].hasPrint, true);
    for (const forbidden of [marker, 'supplierDocument', 'requestPayload', 'xmlUrl', 'printUrl']) assert.equal(JSON.stringify(body).includes(forbidden), false);
    assert.deepEqual(await (await get('?documentId=' + foreign.id)).json(), { documents: [] });
    assert.deepEqual(await (await get(`/files/${foreign.id}/xml`)).json(), null);
    assert.ok((await (await post({ documentId: foreign.id })).json()).error);
    assert.equal((await db.fiscalDocument.findUniqueOrThrow({ where: { id: foreign.id } })).status, 'PENDING');
    assert.deepEqual(await (await get(`/files/${authorized.id}/print`)).json(), { url: 'https://homologacao.focusnfe.com.br/synthetic.html' });
    assert.deepEqual(await (await get('/files/not-this-arena/xml')).json(), null);
    assert.deepEqual(await (await get(`/files/${unsafe.id}/xml`)).json(), null);
    const unsafeBody = await (await get('?documentId=' + unsafe.id)).json(); assert.equal(unsafeBody.documents[0].hasXml, false); assert.equal(unsafeBody.documents[0].hasPrint, false);
    assert.equal((await post({ documentId: pending.id }, 'https://foreign.invalid')).status, 403);
    assert.equal((await post({ documentId: pending.id, arenaId: 'forged' })).status, 400);
    assert.ok((await (await post({ documentId: authorized.id })).json()).error);
    assert.ok((await (await post({ documentId: authorized.id, cancelReason: 'curta' })).json()).error);
    assert.ok((await (await post({ documentId: pending.id, cancelReason: 'Justificativa sintética válida' })).json()).error);
    assert.deepEqual(await (await post({ documentId: pending.id })).json(), {});
    const consulted = await db.fiscalDocument.findUniqueOrThrow({ where: { id: pending.id } }); assert.equal(consulted.status, 'ERROR'); assert.match(consulted.providerMessage, /configuração fiscal mudou/);
    assert.deepEqual(await (await post({ documentId: authorized.id, cancelReason: 'Justificativa sintética válida' })).json(), {});
    assert.equal((await db.fiscalDocument.findUniqueOrThrow({ where: { id: authorized.id } })).status, 'AUTHORIZED');
    const audit = await db.auditEvent.findMany({ where: { arenaId, entityId: { in: [pending.id, authorized.id] }, action: { in: ['FOCUS_CONSULT_REQUESTED', 'FOCUS_CANCEL_REQUESTED'] } } }); assert.equal(audit.length, 2); assert.ok(audit.every(row => row.actorId === staffId));
    return authorized.id;
  } finally {
    await db.fiscalDocument.delete({ where: { id: foreign.id } });
    await db.arenaMember.update({ where: { id: member.id }, data: { viewPermissions: member.viewPermissions, editPermissions: member.editPermissions } });
  }
}
