import { createForeignArenaFixture } from './backend-foreign-fixtures.mjs';
import assert from 'node:assert/strict';
export async function assertCashSmoke(db, origin, arenaId, cookie, staffId) {
  const read = name => fetch(`${origin}/api/management/pos/workspaces/${name}`, { headers: { cookie } });
  const post = (operation, fields, requestOrigin = 'http://127.0.0.1:3014') => fetch(`${origin}/api/management/pos/cash/${operation}`, { method: 'POST', headers: { cookie, origin: requestOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
  const member = await db.arenaMember.findFirstOrThrow({ where: { arenaId, userId: staffId } });
  assert.equal((await read('cash')).status,404);
  await db.arenaMember.update({ where: { id: member.id }, data: { viewPermissions: [...member.viewPermissions,'pos'], editPermissions: ['pos:command:items'] } });
  assert.equal((await read('cash')).status,200);
  assert.equal((await post('open',{openingAmount:'100,00'})).status,403,'Item editing cannot operate the cash register');
  await db.arenaMember.update({ where: { id: member.id }, data: { editPermissions: ['pos:command:finish'] } });
  assert.equal((await post('open',{openingAmount:'100,00'},'https://foreign.invalid')).status,403);
  assert.equal((await post('open',{openingAmount:'100,00',arenaId:'forged'})).status,400);
  assert.equal((await post('open',{openingAmount:'100,00',referenceDate:'2000-01-01'})).status,400);
  assert.equal((await post('open',{openingAmount:'1.2.3'})).status,400);
  const opening = await Promise.all([post('open',{openingAmount:'100,00',openingNotes:'Synthetic opening'}),post('open',{openingAmount:'100,00',openingNotes:'Synthetic opening'})]);
  assert.deepEqual(opening.map(response=>response.status).sort(),[200,400]);
  const registers = await db.cashRegister.findMany({ where: { arenaId, status:'OPEN' } }); assert.equal(registers.length,1); const register = registers[0];
  const stateResponse = await read('cash'); assert.equal(stateResponse.headers.get('cache-control'),'private, no-store'); const state = await stateResponse.json(); assert.equal(state.referenceDate,register.referenceDate.toISOString()); assert.equal(state.register.id,register.id); assert.equal(state.register.expectedAmountCents,10000); assert.equal(state.register.arenaId,undefined); assert.equal(state.register.openingNotes,undefined);
  const supplies = await Promise.all(Array.from({length:6},()=>post('movement',{registerId:register.id,type:'SUPPLY',amount:'1,25',description:'Concurrent supply'})));
  for(const response of supplies)assert.equal(response.status,200,await response.text());
  assert.equal((await db.cashRegister.findUniqueOrThrow({where:{id:register.id}})).expectedAmountCents,10750);
  assert.equal((await post('movement',{registerId:register.id,type:'WITHDRAWAL',amount:'7,50',description:'Synthetic withdrawal'})).status,200);
  assert.equal((await post('movement',{registerId:register.id,type:'WITHDRAWAL',amount:'100,01',description:'Too much'})).status,400);
  const other = await createForeignArenaFixture(db, 'cash');
  const foreign = await db.cashRegister.create({data:{arenaId:other.id,referenceDate:new Date('2042-01-01T00:00:00Z'),openingAmountCents:777,expectedAmountCents:777}});
  try { assert.equal((await post('movement',{registerId:foreign.id,type:'SUPPLY',amount:'1,00',description:'Foreign'})).status,400); assert.equal((await post('close',{registerId:foreign.id,countedAmount:'0,00'})).status,400); assert.equal((await db.cashRegister.findUniqueOrThrow({where:{id:foreign.id}})).expectedAmountCents,777); } finally { await db.cashRegister.delete({where:{id:foreign.id}}); }
  const closing = await Promise.all([post('close',{registerId:register.id,countedAmount:'99,00',closingNotes:'Synthetic closing'}),post('close',{registerId:register.id,countedAmount:'99,00'})]);
  assert.deepEqual(closing.map(response=>response.status).sort(),[200,400]);
  const closed = await db.cashRegister.findUniqueOrThrow({where:{id:register.id},include:{movements:true}}); assert.equal(closed.expectedAmountCents,10000); assert.equal(closed.countedAmountCents,9900); assert.equal(closed.differenceCents,-100); assert.equal(closed.movements.length,7); assert.ok(closed.movements.every(row=>row.createdByName===closed.openedByName));
  assert.equal((await post('movement',{registerId:register.id,type:'SUPPLY',amount:'1,00',description:'Closed'})).status,400);
  assert.equal((await (await read('cash')).json()).previousClosing.countedAmountCents,9900);
  assert.equal((await post('open',{openingAmount:'99,00',openingNotes:'Second opening'})).status,200);
  const reopened = await (await read('cash')).json(); assert.notEqual(reopened.register.id,register.id); assert.equal(reopened.register.expectedAmountCents,9900); assert.equal(reopened.previousClosing.countedAmountCents,9900);
  assert.equal(await db.cashRegister.count({where:{arenaId}}),2); assert.deepEqual(await db.cashRegister.findUniqueOrThrow({where:{id:register.id},include:{movements:true}}),closed);
  assert.equal((await fetch(`${origin}/api/management/pos/workspaces/cash?arenaId=forged`,{headers:{cookie}})).status,400);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:member.editPermissions}});
}
