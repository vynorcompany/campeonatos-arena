import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/** Disposable documents and incomplete payer identities prevent any real issuance. */
export async function assertBoletoQueueSmoke(db, origin, arenaId, cookie, staffId) {
 const member = await db.arenaMember.findFirstOrThrow({ where: { arenaId, userId: staffId } });
 const base = origin + '/api/management/finance/boleto-queue';
 const read = (suffix = '') => fetch(base + suffix, { headers: { cookie } });
 const post = (operation,body,requestOrigin='http://127.0.0.1:3014') => fetch(base + '/' + operation,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body)});
 const payer = await db.player.create({data:{arenaId,name:'Paulo Marcelo Contrato Boleto',email:'',cpf:'',phone:'41900000777'}});
 const create = data => db.financialEntry.create({data:{arenaId,playerId:payer.id,type:'REVENUE',category:'Teste',description:'Mensalidade boleto sintético',amountCents:10000,automaticBoleto:true,dueDate:new Date('2026-11-30T12:00:00Z'),...data}});
 const queued = await create({});
 const partial = await create({status:'PARTIAL',dueDate:new Date('2026-11-29T12:00:00Z')});
 await db.financialSettlement.create({data:{arenaId,financialEntryId:partial.id,amountCents:3000,interestCents:100,discountCents:50,paymentMethod:'PIX'}});
 const pendingClaim = await create({onlinePaymentClaimMethod:'BOLETO',onlinePaymentClaimedAt:new Date()});
 const issued = await create({onlinePaymentId:'synthetic-boleto-'+randomUUID(),onlinePaymentUrl:'https://private.invalid/boleto'});
 const paid = await create({status:'PAID',paidAt:new Date()});
 const voided = await create({status:'VOIDED'});
 const other = await db.arena.findFirstOrThrow({where:{id:{not:arenaId}},select:{id:true}});
 const foreign = await db.financialEntry.create({data:{arenaId:other.id,type:'REVENUE',category:'Teste',description:'Foreign boleto '+randomUUID(),amountCents:5000,automaticBoleto:true}});
 try {
  await db.arenaMember.update({where:{id:member.id},data:{viewPermissions:['finance:payable:view'],editPermissions:[]}});
  assert.equal((await read()).status,404);
  await db.arenaMember.update({where:{id:member.id},data:{viewPermissions:['finance:receivable:view']}});
  assert.equal((await read()).status,404,'Preserve the original editPermissions-based queue gate');
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['finance:receivable:view']}});
  assert.equal((await post('cancel',{entryId:queued.id})).status,403);
  const response = await read('?q=Paulo%20Boleto'); assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'private, no-store'); const list = await response.json();
  const row = list.rows.find(row=>row.id===partial.id); assert.equal(row.amountCents,7050); assert.ok(row.missingFields.includes('e-mail')); assert.equal(list.rows.some(row=>row.id===foreign.id||row.id===issued.id||row.id===paid.id||row.id===voided.id),false);
  for(const forbidden of ['cpf','email','addressStreet','onlinePaymentUrl','private.invalid','settlements']) assert.equal(JSON.stringify(list).includes('"'+forbidden+'"'),false);
  assert.equal((await read('?q=Paulo%20Boleto&status=issued')).status,200); assert.ok((await (await read('?q=Paulo%20Boleto&status=issued')).json()).rows.some(row=>row.id===issued.id));
  assert.equal((await read('?arenaId='+other.id)).status,400); assert.equal((await read('?status=queue&status=issued')).status,400);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['finance:receivable:view','finance:receivable:edit']}});
  assert.equal((await post('generate',{entryId:queued.id})).status,403);
  assert.equal((await post('cancel',{entryId:queued.id},'https://foreign.invalid')).status,403);
  assert.equal((await post('cancel',{entryId:queued.id,arenaId:other.id})).status,400);
  assert.equal((await post('cancel-batch',{entryIds:Array.from({length:101},()=>queued.id)})).status,400);
  assert.ok((await (await post('cancel',{entryId:foreign.id})).json()).error);
  assert.ok((await (await post('cancel',{entryId:pendingClaim.id})).json()).error);
  assert.ok((await (await post('cancel',{entryId:voided.id})).json()).error);
  const concurrent = await Promise.all([post('cancel',{entryId:queued.id}),post('cancel',{entryId:queued.id})]); for(const result of concurrent)assert.equal((await result.json()).success,true);
  assert.equal(await db.auditEvent.count({where:{arenaId,entityId:queued.id,action:'BOLETO_QUEUE_CANCELED',actorId:staffId}}),1);
  const batch = await (await post('cancel-batch',{entryIds:[partial.id,foreign.id]})).json();assert.deepEqual(batch.failedIds,[foreign.id]); assert.match(batch.error,/1 cancelado/);
  const canceled = await (await read('?q=Paulo%20Boleto&status=canceled')).json(); assert.ok(canceled.rows.some(row=>row.id===queued.id)); assert.ok(canceled.rows.every(row=>row.selectable===false));
  const reconciled = await (await post('reconcile',{})).json(); assert.ok(reconciled.retired>=1); assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:paid.id}})).status,'PAID'); assert.ok((await db.financialEntry.findUniqueOrThrow({where:{id:paid.id}})).boletoReconciledAt);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['finance:receivable:settle']}});
  const ineligible = await create({}); const attempt = await post('generate',{entryId:ineligible.id}); assert.equal(attempt.status,200); assert.match((await attempt.json()).error,/Cadastro incompleto/); assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:ineligible.id}})).onlinePaymentId,'');
  assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:foreign.id}})).boletoQueueCanceledAt,null); assert.equal(await db.financialSettlement.count({where:{financialEntryId:partial.id}}),1);
  const capTag = 'BoletoCap' + randomUUID().replace(/-/g,'');
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['finance:receivable:view']}});
  await db.financialEntry.createMany({data:Array.from({length:201},(_,index)=>({id:capTag+'-'+String(index).padStart(3,'0'),arenaId,type:'REVENUE',category:'Teste',description:capTag,amountCents:500,automaticBoleto:true,dueDate:new Date('2026-11-30T12:00:00Z')}))});
  const capped = await (await read('?q='+capTag)).json(); assert.equal(capped.capped,true); assert.equal(capped.rows.length,200); assert.equal(capped.rows[0].id,capTag+'-000'); assert.equal(capped.rows.at(-1).id,capTag+'-199');
  await db.financialEntry.deleteMany({where:{arenaId,description:capTag,id:{startsWith:capTag+'-'}}});
  // Keep the issued row visible for SSR without exposing a real provider identifier.
 } finally { await db.financialEntry.delete({where:{id:foreign.id}}); await db.arenaMember.update({where:{id:member.id},data:{viewPermissions:member.viewPermissions,editPermissions:member.editPermissions}}); }
}
