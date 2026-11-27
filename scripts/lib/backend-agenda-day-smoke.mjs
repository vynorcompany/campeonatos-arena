import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

export async function assertAgendaDaySmoke(db,origin,staffId,sessionCookie){
 const arenas=[];
 try{
  for(const name of ['Agenda own synthetic','Agenda foreign synthetic']) arenas.push(await db.arena.create({data:{name,slug:'agenda-day-'+randomUUID(),createdById:'goal-test',checkinToken:'PRIVATE_CHECKIN_'+randomUUID()}}));
  const [arena,foreign]=arenas;
  const membership=await db.arenaMember.create({data:{arenaId:arena.id,userId:staffId,role:'STAFF',viewPermissions:[],editPermissions:[]}});
  const cookie=sessionCookie.split(';')[0]+`; padel_arena=${arena.id}`;
  const read=(query='date=2026-12-07')=>fetch(`${origin}/api/management/agenda?${query}`,{headers:{cookie},redirect:'manual'});
  assert.equal((await read()).status,403);
  await db.arenaMember.update({where:{id:membership.id},data:{viewPermissions:['calendar']}});
  for(const query of ['date=2026-02-29','date=2026-12-07&date=2026-12-08',`date=2026-12-07&arenaId=${foreign.id}`,'']) assert.equal((await read(query)).status,400,query);
  const court=await db.court.create({data:{arenaId:arena.id,name:'Booked without weekly rules'}});
  const configured=await db.court.create({data:{arenaId:arena.id,name:'Configured court',weeklyRules:{create:{weekday:1,startsAtMinute:420,endsAtMinute:1380,priceCents:5000,available:true}}}});
  const foreignCourt=await db.court.create({data:{arenaId:foreign.id,name:'Foreign PRIVATE court'}});
  const player=await db.player.create({data:{arenaId:arena.id,name:'Agenda athlete',email:'private@example.test',phone:'41999999999'}});
  await db.player.create({data:{arenaId:foreign.id,name:'Foreign PRIVATE athlete'}});
  const bank=await db.bankAccount.create({data:{arenaId:arena.id,name:'Synthetic bank'}});
  const entry=await db.financialEntry.create({data:{arenaId:arena.id,playerId:player.id,type:'REVENUE',category:'Reserva',description:'PRIVATE_DESCRIPTION',amountCents:7500,status:'PAID',bankAccountId:bank.id}});
  const booking=await db.scheduleOccurrence.create({data:{arenaId:arena.id,sourceType:'COURT_BOOKING',title:'Synthetic booking',startsAt:new Date('2026-12-07T11:00:00Z'),endsAt:new Date('2026-12-07T12:30:00Z'),occurrenceCourts:{create:{courtId:court.id}},participants:{create:{playerId:player.id,financialEntryId:entry.id,amountCents:7500,paymentMethod:'CASH'}}}});
  await db.scheduleOccurrence.create({data:{arenaId:foreign.id,sourceType:'COURT_BOOKING',title:'Foreign PRIVATE booking',startsAt:new Date('2026-12-07T11:00:00Z'),endsAt:new Date('2026-12-07T12:00:00Z'),occurrenceCourts:{create:{courtId:foreignCourt.id}}}});
  const series=await db.scheduleBookingSeries.create({data:{arenaId:arena.id,title:'Paid fixed plan',bookingTypeName:'Plano',responsiblePlayerId:player.id,startsAt:new Date('2026-12-07T11:00:00Z'),endsAt:new Date('2026-12-07T12:30:00Z')}});
  await db.scheduleOccurrence.update({where:{id:booking.id},data:{bookingSeriesId:series.id}});
  await db.financialEntry.create({data:{arenaId:arena.id,playerId:player.id,type:'REVENUE',category:'Plano',description:'Monthly paid',amountCents:20000,status:'PAID',source:'FIXED_COURT_PLAN',externalReference:series.id,competenceDate:new Date('2026-12-01T00:00:00Z'),notes:'4 créditos de reserva'}});
  await db.court.update({where:{id:configured.id},data:{dateAvailability:[{date:'2026-12-07',startsAtMinute:480,endsAtMinute:540,priceCents:9000,online:false}]}});
  await db.auditEvent.create({data:{arenaId:arena.id,action:'booking.created',entityId:booking.id,actorId:staffId,actorName:'Synthetic creator',details:'PRIVATE_AUDIT'}});
  let response=await read();assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');assert.ok(response.headers.get('vary').split(',').map(value=>value.trim().toLowerCase()).includes('cookie'));
  const raw=await response.text();let data=JSON.parse(raw);
  for(const forbidden of ['PRIVATE_',foreign.id,foreignCourt.id,bank.id,'financialEntry','dateAvailability','checkinToken','private@example.test','41999999999']) assert.equal(raw.includes(forbidden),false,forbidden);
  assert.deepEqual(new Set(data.courts.map(row=>row.id)),new Set([court.id,configured.id]));assert.equal(data.scheduleOccurrences.length,1);assert.equal(data.scheduleOccurrences[0].participants[0].paid,true);assert.equal(data.scheduleOccurrences[0].participants[0].bankAccountId,null);assert.equal(data.scheduleOccurrences[0].createdBy,'Synthetic creator');assert.equal(data.onlineSettings,null);assert.deepEqual(data.bankAccounts,[]);assert.equal(data.players[0].reservationCredits,4);assert.equal(data.courts.find(row=>row.id===configured.id).weeklyRules.find(rule=>rule.startsAtMinute===480).priceCents,9000);
  const version=await fetch(`${origin}/api/agenda/version?date=2026-12-07`,{headers:{cookie}});assert.equal(version.status,200);assert.equal((await version.json()).version,data.version);
  await db.arenaMember.update({where:{id:membership.id},data:{editPermissions:['finance:receivable:settle','calendar:settings:manage']}});
  data=await (await read()).json();assert.equal(data.bankAccounts[0].id,bank.id);assert.equal(data.scheduleOccurrences[0].participants[0].bankAccountId,bank.id);assert.equal(data.onlineSettings.arenaSlug,arena.slug);
  await db.financialEntry.update({where:{id:entry.id},data:{status:'PENDING'}});data=await (await read()).json();assert.equal(data.scheduleOccurrences[0].participants[0].paid,false);
  await db.scheduleParticipant.updateMany({where:{occurrenceId:booking.id},data:{checkedInAt:new Date()}});const changed=await (await read()).json();assert.notEqual(changed.version,data.version);assert.ok(changed.scheduleOccurrences[0].participants[0].checkedInAt);
  console.log('Agenda day HTTP: arena isolation, private projection, permissions, paid status, booked courts without rules and live-version parity passed.');
 }finally{
  const arenaIds=arenas.map(row=>row.id);
  await db.scheduleOccurrence.deleteMany({where:{arenaId:{in:arenaIds}}});
  await db.financialEntry.deleteMany({where:{arenaId:{in:arenaIds}}});
  await db.auditEvent.deleteMany({where:{arenaId:{in:arenaIds}}});
  await db.arena.deleteMany({where:{id:{in:arenaIds},slug:{startsWith:'agenda-day-'}}});
 }
}
