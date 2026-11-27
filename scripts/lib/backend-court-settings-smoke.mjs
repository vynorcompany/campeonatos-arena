import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function assertCourtSettingsSmoke(db,origin,staffId,sessionCookie){
 const arenas=[];
 const createArena=async name=>{const a=await db.arena.create({data:{name,slug:'court-settings-'+randomUUID(),createdById:'goal-test',checkinToken:'PRIVATE_CHECKIN_'+randomUUID()}});arenas.push(a);return a;};
 try{
  const arena=await createArena('Court settings synthetic');const foreign=await createArena('Foreign court settings synthetic');
  const member=await db.arenaMember.create({data:{arenaId:arena.id,userId:staffId,role:'STAFF',viewPermissions:['calendar'],editPermissions:[]}});
  const cookie=sessionCookie.split(';')[0]+`; padel_arena=${arena.id}`;
  const post=(operation,fields={},requestOrigin='http://127.0.0.1:3014')=>fetch(`${origin}/api/management/court-settings/actions/${operation}`,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,Array.isArray(value)?value:[value]]))}),redirect:'manual'});
  const read=()=>fetch(`${origin}/api/management/court-settings`,{headers:{cookie},redirect:'manual'});
  const ok=async r=>{assert.equal(r.status,200,await r.clone().text());const value=await r.json();assert.equal(value.error,null,JSON.stringify(value));return value;};
  assert.equal((await read()).status,403);assert.equal((await post('court-create',{name:'Unauthorized'})).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['calendar:settings:manage']}});
  assert.equal((await post('booking-type',{name:'Special'})).status,403);
  assert.equal((await post('court-create',{name:'Forged',arenaId:foreign.id})).status,400);assert.equal((await post('court-create',{name:['One','Two']})).status,400);assert.equal((await post('court-create',{name:'Origin'},'https://foreign.invalid')).status,403);
  await ok(await post('court-create',{name:'Source Synthetic'}));const source=await db.court.findFirstOrThrow({where:{arenaId:arena.id,name:'Source Synthetic'}});
  const creates=await Promise.all([post('court-create',{name:'Target Synthetic'}),post('court-create',{name:'Concurrent Synthetic'})]);for(const r of creates)await ok(r);
  const owned=await db.court.findMany({where:{arenaId:arena.id},orderBy:{displayOrder:'asc'}});assert.deepEqual(owned.map(row=>row.displayOrder),[0,1,2]);
  const target=owned.find(row=>row.name==='Target Synthetic');const foreignCourt=await db.court.create({data:{arenaId:foreign.id,name:'Foreign court'}});
  const courtSettings={courtId:source.id,color:'#16834e',onlineSlotMinutes:'30',onlineDurationMinutes:['60','90','60']};await ok(await post('court-update',courtSettings));assert.deepEqual((await db.court.findUniqueOrThrow({where:{id:source.id}})).onlineDurationMinutes,[60,90]);
  assert.equal((await post('court-update',{...courtSettings,courtId:foreignCourt.id})).status,400);assert.equal((await post('court-move',{courtId:foreignCourt.id,direction:'up'})).status,400);
  const range={courtId:source.id,weekday:'1',startTime:'08:00',endTime:'09:00',price:'R$ 75,50',available:'on'};
  const race=await Promise.all([post('rule-create',range),post('rule-create',range)]);assert.equal(race.filter(row=>row.status===200).length,1);assert.equal(race.filter(row=>row.status===400).length,1);assert.equal(await db.courtWeeklyRule.count({where:{courtId:source.id,weekday:1}}),1);
  const rule=await db.courtWeeklyRule.findFirstOrThrow({where:{courtId:source.id,weekday:1}});assert.equal(rule.priceCents,7550);
  const foreignRule=await db.courtWeeklyRule.create({data:{courtId:foreignCourt.id,weekday:1,startsAtMinute:480,endsAtMinute:540,priceCents:1234,available:true}});
  for(const operation of ['rule-update','rule-delete','rule-copy']){const response=await post(operation,{...(operation==='rule-update'?{startTime:'08:00',endTime:'09:00',price:'1,00'}:{}),...(operation==='rule-copy'?{targetWeekday:'2'}:{}),ruleId:foreignRule.id});if(operation==='rule-copy')assert.ok((await response.json()).error);else assert.equal(response.status,400);}
  await ok(await post('rule-copy',{ruleId:rule.id,targetWeekday:'ALL'}));assert.equal(await db.courtWeeklyRule.count({where:{courtId:source.id}}),7);
  const first=await db.courtWeeklyRule.findFirstOrThrow({where:{courtId:source.id,weekday:0}});await ok(await post('rule-update',{ruleId:first.id,startTime:'08:00',endTime:'09:30',price:'80,00'}));assert.equal((await db.courtWeeklyRule.findUniqueOrThrow({where:{id:first.id}})).available,false);
  const player=await db.player.create({data:{arenaId:arena.id,name:'Booked Synthetic'}});const entry=await db.financialEntry.create({data:{arenaId:arena.id,playerId:player.id,type:'REVENUE',category:'Reserva',description:'Preserved reservation',amountCents:7550,status:'PENDING'}});
  const booking=await db.scheduleOccurrence.create({data:{arenaId:arena.id,sourceType:'COURT_BOOKING',title:'Preserved booking',startsAt:new Date('2026-12-07T11:00:00Z'),endsAt:new Date('2026-12-07T12:00:00Z'),occurrenceCourts:{create:{courtId:target.id}},participants:{create:{playerId:player.id,amountCents:7550,financialEntryId:entry.id}}}});
  await db.courtWeeklyRule.create({data:{courtId:target.id,weekday:1,startsAtMinute:600,endsAtMinute:660,priceCents:1000,available:true}});
  const targetBefore=await db.court.findUniqueOrThrow({where:{id:target.id}});
  assert.equal((await post('court-copy',{sourceCourtId:source.id,targetCourtId:[target.id,foreignCourt.id]})).status,400);assert.equal(await db.courtWeeklyRule.count({where:{courtId:target.id}}),1,'Mixed foreign copy must not partially modify owned targets');
  await ok(await post('court-copy',{sourceCourtId:source.id,targetCourtId:[target.id]}));assert.equal(await db.courtWeeklyRule.count({where:{courtId:target.id}}),7);const targetAfter=await db.court.findUniqueOrThrow({where:{id:target.id}});assert.equal(targetAfter.color,targetBefore.color);assert.equal(targetAfter.displayOrder,targetBefore.displayOrder);assert.deepEqual(targetAfter.onlineDurationMinutes,[60,90]);
  const copied=await db.courtWeeklyRule.findFirstOrThrow({where:{courtId:target.id}});await ok(await post('rule-delete',{ruleId:copied.id}));
  const preserved=await db.scheduleOccurrence.findUniqueOrThrow({where:{id:booking.id},include:{participants:true,occurrenceCourts:true}});assert.equal(preserved.status,'SCHEDULED');assert.equal(preserved.occurrenceCourts[0].courtId,target.id);assert.equal(preserved.participants[0].financialEntryId,entry.id);assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:entry.id}})).amountCents,7550);
  await ok(await post('court-move',{courtId:target.id,direction:'up'}));assert.equal((await db.court.findUniqueOrThrow({where:{id:target.id}})).displayOrder,targetAfter.displayOrder-1);const orders=await db.court.findMany({where:{arenaId:arena.id},select:{displayOrder:true}});assert.equal(new Set(orders.map(row=>row.displayOrder)).size,3);
  await ok(await post('schedule',{startTime:'06:00',endTime:'23:00',slotMinutes:'30'}));assert.equal((await db.arena.findUniqueOrThrow({where:{id:arena.id}})).scheduleStartMinute,360);
  await ok(await post('online',{layout:'LIST',leadTimeMinutes:'45',overdueBlockDays:'2',whatsappMessage:'Synthetic message',onlineBookingEnabled:'on',overdueBlockEnabled:'on',requiresConfirmation:'on'}));const settings=await db.arena.findUniqueOrThrow({where:{id:arena.id}});assert.equal(settings.onlineBookingLeadTimeMinutes,45);assert.equal(settings.onlineBookingOverdueBlockDays,2);assert.equal(settings.onlineBookingPaymentEnabled,false);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['calendar:settings:manage','arena:settings']}});await ok(await post('booking-type',{name:'Custom Synthetic'}));assert.equal(await db.bookingType.count({where:{arenaId:arena.id,name:'Custom Synthetic'}}),1);
  const response=await read();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');const text=await response.text();for(const forbidden of ['PRIVATE_CHECKIN','checkinToken','encryptedToken','dateAvailability',foreignCourt.id])assert.equal(text.includes(forbidden),false,forbidden);
  assert.equal((await fetch(`${origin}/api/management/court-settings?arenaId=${foreign.id}`,{headers:{cookie}})).status,400);
  console.log('Court settings HTTP: scoped DTOs, range/court concurrency, copy/edit/delete and reservation/receivable preservation passed.');
 }finally{await db.scheduleOccurrence.deleteMany({where:{arenaId:{in:arenas.map(row=>row.id)}}});await db.financialEntry.deleteMany({where:{arenaId:{in:arenas.map(row=>row.id)}}});await db.auditEvent.deleteMany({where:{arenaId:{in:arenas.map(row=>row.id)}}});await db.arena.deleteMany({where:{id:{in:arenas.map(row=>row.id)},slug:{startsWith:'court-settings-'}}});}
}
