import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { batchSchema,performBatch } from '../src/lib/agents/finance-batch';
const url=process.env.ARENA_BATCH_TEST_DATABASE_URL??process.env.ARENA_GOAL_TEST_DATABASE_URL??'';
const enabled=(()=>{try{const u=new URL(url);return u.hostname==='127.0.0.1'&&((u.port==='55442'&&u.pathname==='/arena_batch')||(u.port==='55433'&&u.pathname==='/arena_goal'));}catch{return false;}})();
test('lote misto é atômico, isolado, idempotente e preserva juros e datas',{skip:!enabled},async()=>{
 const db=new PrismaClient({datasources:{db:{url}}});
 try{
  const owner=await db.user.create({data:{name:'Synthetic owner',email:randomUUID()+'@example.test',passwordHash:'synthetic-only'}});
  const a=await db.arena.create({data:{name:'Synthetic batch',slug:randomUUID(),createdById:owner.id}}),b=await db.arena.create({data:{name:'Other synthetic',slug:randomUUID(),createdById:owner.id}});
  const key=await db.agentApiKey.create({data:{arenaId:a.id,name:'Synthetic agent',prefix:'test',tokenHash:randomUUID(),scopes:['finance:write','finance:settle','finance:read'],expiresAt:new Date(Date.now()+3600000)}});
  const existing=await db.financialEntry.create({data:{arenaId:a.id,description:'Accounting',category:'Services',counterpartyName:'Supplier A',type:'EXPENSE',amountCents:40000,competenceDate:new Date('2026-11-01T12:00:00Z'),dueDate:new Date('2026-11-15T12:00:00Z')}});
  const other=await db.financialEntry.create({data:{arenaId:b.id,description:'Other',category:'Services',counterpartyName:'Supplier B',type:'EXPENSE',amountCents:30000}});
  const body=batchSchema.parse({items:[{id:'i1',action:'settle',selector:{supplier:'Supplier A',description:'',dueDate:''},totalCents:42658,paidAt:'2026-11-17T12:00:00.000Z',paymentMethod:'PIX'},{id:'i2',action:'create',entry:{description:'Drinks',counterpartyName:'Supplier C',category:'Purchases',type:'EXPENSE',amountCents:45000,interestCents:1069,competenceDate:'2026-11-15T12:00:00.000Z',dueDate:'2026-11-15T12:00:00.000Z',status:'PAID',paidAt:'2026-11-17T12:00:00.000Z',paymentMethod:'PIX'}}]});
  const run=(requestId:string,value=body,k=key)=>db.$transaction(tx=>performBatch(tx,k,requestId,value),{timeout:30000});
  const id=randomUUID(),proof=await run(id) as any;
  assert.equal(proof.items.length,2);assert.equal(proof.items[0].entryId,existing.id);assert.equal(proof.items[0].interestCents,2658);
  assert.equal(proof.items[1].totalCents,46069);assert.equal(proof.items[1].dueDate,'2026-11-15T12:00:00.000Z');
  assert.deepEqual(await run(id),proof);assert.equal(await db.financialSettlement.count({where:{arenaId:a.id}}),2);
  const before=await db.financialEntry.findUniqueOrThrow({where:{id:existing.id}});assert.equal(before.amountCents,40000);assert.equal(before.status,'PAID');
  await assert.rejects(run(id,{items:[body.items[1]]}),/outros dados/);
  await assert.rejects(run(randomUUID()),/Não encontrei/);assert.equal(await db.financialSettlement.count({where:{arenaId:a.id}}),2);
  const isolation=batchSchema.parse({items:[{...body.items[0],selector:{supplier:'Supplier B',description:'',dueDate:''}}]});
  await assert.rejects(run(randomUUID(),isolation),/Não encontrei/);assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:other.id}})).status,'PENDING');
  const pending=await db.financialEntry.create({data:{arenaId:a.id,description:'Repeated',category:'Services',counterpartyName:'Repeat',type:'EXPENSE',amountCents:1000}});
  await db.financialEntry.create({data:{arenaId:a.id,description:'Repeated 2',category:'Services',counterpartyName:'Repeat',type:'EXPENSE',amountCents:1000}});
  const ambiguous=batchSchema.parse({items:[body.items[1],{...body.items[0],selector:{supplier:'Repeat',description:'',dueDate:''}}]});
  const count=await db.financialEntry.count({where:{arenaId:a.id}});await assert.rejects(run(randomUUID(),ambiguous),/mais de uma/);assert.equal(await db.financialEntry.count({where:{arenaId:a.id}}),count);
  const exact=batchSchema.parse({items:[{...body.items[0],selector:{supplier:'Repeat',description:'Repeated',dueDate:''},totalCents:1100}]});
  const outcomes=await Promise.allSettled([run(randomUUID(),exact),run(randomUUID(),exact)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(await db.financialSettlement.count({where:{financialEntryId:pending.id}}),1);
  await db.agentApiKey.update({where:{id:key.id},data:{scopes:['finance:write']}});await assert.rejects(run(randomUUID(),body),/baixa necessária/);
  await db.agentApiKey.update({where:{id:key.id},data:{revokedAt:new Date()}});await assert.rejects(run(randomUUID(),body),/revogada/);
 }finally{await db.$disconnect();}
});
test('validação não aceita IDs duplicados, baixa sem método ou juros em obrigação pendente',()=>{
 const item={id:'i1',action:'settle',selector:{supplier:'A',description:'',dueDate:''},totalCents:1000,paidAt:'2026-11-17T12:00:00.000Z',paymentMethod:'PIX'};
 assert.equal(batchSchema.safeParse({items:[item,item]}).success,false);
 assert.equal(batchSchema.safeParse({items:[{...item,paymentMethod:''}]}).success,false);
 assert.equal(batchSchema.safeParse({items:[{...item,selector:{supplier:'',description:'',dueDate:''}}]}).success,false);
});
