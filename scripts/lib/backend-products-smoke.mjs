import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function assertProductsSmoke(db, origin, arenaId, cookie, staffId) {
  const page = name => fetch(`${origin}/api/management/products/pages/${name}`, { headers: { cookie } });
  const post = (operation, fields, originHeader = 'http://127.0.0.1:3014') => fetch(`${origin}/api/management/products/actions/${operation}`, { method: 'POST', headers: { cookie, origin: originHeader, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
  assert.equal((await page('stock')).status, 404, 'Unrelated permission must not expose stock');
  const member = await db.arenaMember.findFirstOrThrow({ where: { arenaId, userId: staffId } });
  await db.arenaMember.update({ where: { id: member.id }, data: { viewPermissions: [...member.viewPermissions, 'stock'] } });
  assert.equal((await page('stock')).status, 200);
  assert.equal((await post('standard-service-price', { serviceCode: 'LEAGUE', price: '40,00' })).status, 403, 'Stock view must not allow writes');
  await db.arenaMember.update({ where: { id: member.id }, data: { editPermissions: [...member.editPermissions, 'stock'] } });
  const category = await db.productCategory.create({ data: { arenaId, name: 'Categoria sintética' } });
  const product = await db.product.create({ data: { arenaId, categoryId: category.id, name: 'Produto Contrato', sku: 'SYN-PRODUCT', stockQuantity: 4, minStock: 2, priceCents: 500, costCents: 200, fiscalProfile: { privateMarker: 'must-not-leak' } } });
  const court = await db.court.create({ data: { arenaId, name: 'Quadra Serviço Contrato' } });
  const fields = { name: 'Serviço Contrato', price: '40,00', bookingConcurrentLimit: '2', bookingRules: JSON.stringify({ courtIds: [court.id], minimumMinutes: 60, dailyWindows: [{ weekday: 1, startMinute: 480, endMinute: 1080 }] }), serviceHourly: 'on', showOnAgenda: 'on', showOnComandas: 'on', showOnPortalBooking: 'on' };
  assert.equal((await post('save-service', { ...fields, arenaId: 'forged' })).status, 400);
  assert.equal((await post('save-service', fields, 'https://foreign.invalid')).status, 403);
  assert.equal((await post('save-service', { ...fields, bookingRules: '{invalid' })).status, 400);
  const other = await db.arena.findFirstOrThrow({ where: { id: { not: arenaId } }, select: { id: true } });
  const foreignCourt = await db.court.create({ data: { arenaId: other.id, name: `Foreign service fixture ${randomUUID()}` } });
  const foreignService = await db.product.create({ data: { arenaId: other.id, name: `Foreign service fixture ${randomUUID()}`, isService: true } });
  try {
    assert.equal((await post('save-service', { ...fields, bookingRules: JSON.stringify({ courtIds: [foreignCourt.id] }) })).status, 400);
    assert.equal((await post('manage-service', { id: foreignService.id, operation: 'deactivate' })).status, 400);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: foreignService.id } })).active, true);
  } finally { await db.product.delete({ where: { id: foreignService.id } }); await db.court.delete({ where: { id: foreignCourt.id } }); }
  const saved = await post('save-service', fields); assert.equal(saved.status, 200, await saved.text());
  const service = await db.product.findFirstOrThrow({ where: { arenaId, name: fields.name } }); assert.equal(service.priceCents, 4000); assert.equal(service.createdByUserId, staffId); assert.equal(service.bookingConcurrentLimit, 2);
  assert.equal((await post('save-service', fields)).status, 400, 'Duplicate names stay blocked');
  assert.equal((await post('save-service', { ...fields, id: service.id, price: '45,00', bookingConcurrentLimit: '3' })).status, 200); assert.equal((await db.product.findUniqueOrThrow({ where: { id: service.id } })).priceCents, 4500);
  assert.equal((await post('manage-service', { id: service.id, operation: 'deactivate' })).status, 200); assert.equal((await db.product.findUniqueOrThrow({ where: { id: service.id } })).active, false);
  assert.ok(await db.auditEvent.findFirst({ where: { arenaId, actorId: staffId, entityId: service.id, action: 'SERVICE_DEACTIVATE' } }));
  assert.equal((await post('manage-service', { id: service.id, operation: 'activate' })).status, 200);
  assert.equal((await post('manage-service', { id: service.id, operation: 'duplicate' })).status, 200);
  const copy = await db.product.findFirstOrThrow({ where: { arenaId, name: `${fields.name} (cópia)` } }); assert.equal(copy.priceCents, 4500); assert.deepEqual(copy.bookingRules, (await db.product.findUniqueOrThrow({ where: { id: service.id } })).bookingRules);
  assert.equal((await post('manage-service', { id: copy.id, operation: 'delete' })).status, 200); assert.equal(await db.product.findUnique({ where: { id: copy.id } }), null);
  await db.stockMovement.create({ data: { arenaId, productId: service.id, type: 'IN', quantity: 1, reason: 'Histórico sintético' } });
  assert.equal((await post('manage-service', { id: service.id, operation: 'delete' })).status, 200); assert.ok((await db.product.findUniqueOrThrow({ where: { id: service.id } })).serviceDeletedAt); assert.equal(await db.stockMovement.count({ where: { arenaId, productId: service.id } }), 1);
  assert.equal((await post('standard-service-price', { serviceCode: 'LEAGUE', price: '60,00' })).status, 200);
  const standard = await db.product.findFirstOrThrow({ where: { arenaId, sku: 'ARENA-SERVICE:LEAGUE' } }); assert.equal(standard.priceCents, 6000); assert.equal((await post('manage-service', { id: standard.id, operation: 'deactivate' })).status, 400);
  const stockResponse = await page('stock'); assert.equal(stockResponse.headers.get('cache-control'), 'private, no-store'); const stock = await stockResponse.json(); assert.ok(stock.products.some(row => row.id === product.id && row.category.name === category.name)); assert.equal(JSON.stringify(stock).includes('costCents'), false); assert.equal(JSON.stringify(stock).includes('privateMarker'), false);
  const services = await (await page('services')).json(); assert.ok(services.services.some(row => row.id === standard.id)); assert.equal(services.services.some(row => row.id === service.id), false); assert.ok(services.courts.some(row => row.id === court.id));
  assert.equal((await fetch(`${origin}/api/management/products/pages/services?arenaId=forged`, { headers: { cookie } })).status, 400);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 4);
  // Exercise product writes through the real HTTP boundary, including concurrent increments.
  const productFields = { name: 'Produto detalhe sintético', sku: 'SYN-DETAIL', notes: 'Contrato', cost: '2,50', price: '8,75', categoryId: category.id, stockQuantity: '10', minStock: '2' };
  assert.equal((await post('create-product', productFields)).status, 200);
  const detailProduct = await db.product.findFirstOrThrow({ where: { arenaId, sku: productFields.sku } });
  assert.equal(detailProduct.priceCents, 875); assert.equal(detailProduct.costCents, 250); assert.equal(detailProduct.createdByUserId, staffId);
  const detailResponse = await fetch(`${origin}/api/management/products/detail/${detailProduct.id}`, { headers: { cookie } });
  assert.equal(detailResponse.status, 200); assert.equal(detailResponse.headers.get('cache-control'), 'private, no-store');
  const detail = await detailResponse.json(); assert.equal(detail.product.name, productFields.name); assert.equal(detail.product.stockQuantity, 10); assert.equal(detail.product.arenaId, undefined); assert.equal(detail.product.createdByUserId, undefined);
  assert.equal(await (await fetch(`${origin}/api/management/products/detail/missing-product`, { headers: { cookie } })).json(), null);
  const increments = await Promise.all(Array.from({ length: 6 }, () => post('adjust-stock', { productId: detailProduct.id, type: 'IN', quantity: '1', reason: 'Concurrent fixture' })));
  for (const response of increments) assert.equal(response.status, 200, await response.text());
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: detailProduct.id } })).stockQuantity, 16, 'Concurrent stock writes must not overwrite each other');
  assert.equal(await db.stockMovement.count({ where: { arenaId, productId: detailProduct.id, reason: 'Concurrent fixture' } }), 6);
  const current = await db.product.findUniqueOrThrow({ where: { id: detailProduct.id } });
  const updateFields = { ...productFields, productId: current.id, expectedUpdatedAt: current.updatedAt.toISOString(), name: 'Produto detalhe atualizado', stockQuantity: '999' };
  assert.equal((await post('update-product', updateFields)).status, 200);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: current.id } })).stockQuantity, 16, 'Editing metadata must not overwrite inventory');
  const stale = await post('update-product', updateFields); assert.equal(stale.status, 200); assert.ok((await stale.json()).error);
  const balance = await post('stock-balance', { title: 'Inventário sintético', reason: 'Contagem', [`count_${current.id}`]: '14', [`count_${product.id}`]: '' });
  assert.equal(balance.status, 200, await balance.clone().text()); assert.deepEqual(await balance.json(), { updated: 1 });
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: current.id } })).stockQuantity, 14);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 4);
  assert.equal((await post('create-sale', { productId: current.id, quantity: '1', paymentMethod: 'PIX', customerName: 'Sintético' })).status, 403, 'Stock editing must not grant sales access');
  const invalidFiscal = await post('product-fiscal', { productId: current.id, fiscalProfile: '{invalid' }); assert.equal(invalidFiscal.status, 200); assert.ok((await invalidFiscal.json()).error);
  assert.equal((await post('product-fiscal', { productId: current.id, fiscalProfile: JSON.stringify({ additionalInfo: 'Informação sintética' }) })).status, 200);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: current.id } })).fiscalProfile.additionalInfo, 'Informação sintética');
  await db.arenaMember.update({ where: { id: member.id }, data: { editPermissions: [...member.editPermissions.filter(value => value !== 'stock'), 'pos'] } });
  assert.equal((await post('adjust-stock', { productId: current.id, type: 'IN', quantity: '1', reason: 'Denied' })).status, 403, 'Sales permission must not grant inventory editing');
  const bank = await db.bankAccount.create({ data: { arenaId, name: 'PDV contrato sintético' } });
  const saleFields = { productId: current.id, quantity: '2', paymentMethod: 'PIX', customerName: 'Venda contrato sintética' };
  assert.notEqual((await post('create-sale', saleFields)).status, 200, 'Positive sale requires a valid receiving account');
  for (const operation of ['create-sale', 'create-cart-sale']) {
    const sale = await post(operation, operation === 'create-sale' ? { ...saleFields, bankAccountId: bank.id } : { items: JSON.stringify([{ productId: current.id, quantity: 2 }]), paymentMethod: 'PIX', customerName: saleFields.customerName, bankAccountId: bank.id });
    assert.equal(sale.status, 200, await sale.text());
  }
  const receipts = await db.financialEntry.findMany({ where: { arenaId, bankAccountId: bank.id }, include: { sale: { include: { payments: true } } } });
  assert.equal(receipts.length, 2); for (const receipt of receipts) { assert.equal(receipt.status, 'PAID'); assert.equal(receipt.amountCents, 1750); assert.equal(receipt.sale.payments[0].amountCents, 1750); }
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: current.id } })).stockQuantity, 10);
  // Sales restrict product deletion; release only this helper's synthetic receipts before arena teardown.
  await db.sale.deleteMany({ where: { arenaId, customerName: saleFields.customerName } });
  await db.arenaMember.update({ where: { id: member.id }, data: { editPermissions: member.editPermissions } });
}
