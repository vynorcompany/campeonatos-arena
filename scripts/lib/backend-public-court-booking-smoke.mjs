import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
export async function assertPublicCourtBookingSmoke(db, origin) {
 const arenas=[];
 try {
  for (const name of ['Public booking own','Public booking foreign']) arenas.push(await db.arena.create({data:{name,slug:'public-booking-'+randomUUID(),createdById:'goal-test',onlineBookingEnabled:true,onlineBookingRequiresConfirmation:true,onlineBookingPaymentEnabled:false,onlineBookingLeadTimeMinutes:0,onlineBookingWhatsappConfirmationEnabled:false,scheduleStartMinute:420,scheduleEndMinute:1320}}));
  const [arena,foreign]=arenas;
  const court=await db.court.create({data:{arenaId:arena.id,name:'Public HTTP court',onlineSlotMinutes:30,onlineDurationMinutes:[60],weeklyRules:{create:{weekday:1,startsAtMinute:480,endsAtMinute:720,priceCents:7500,available:true}}}});
  const player=await db.player.create({data:{arenaId:arena.id,name:'Public HTTP athlete'}});
  const account=await db.playerAccount.create({data:{arenaId:arena.id,playerId:player.id,phone:randomUUID(),passwordHash:'disabled-synthetic-no-login'}});
  const raw=randomUUID();await db.playerSession.create({data:{playerAccountId:account.id,token:createHash('sha256').update(raw).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
  const cookie=`arena_player_session=${raw}`;
  const post=(operation,fields,requestCookie=cookie,requestOrigin='http://127.0.0.1:3014')=>fetch(`${origin}/api/portal/bookings/actions/${operation}`,{method:'POST',headers:{cookie:requestCookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,Array.isArray(value)?value:[value]]))}),redirect:'manual'});
  const input={arenaSlug:arena.slug,courtId:court.id,startsAt:'2040-01-02T10:00',durationMinutes:'60',quotedTotalCents:'15000'};
  const view=(slug=arena.slug,requestCookie=cookie,extra='')=>fetch(`${origin}/api/portal/booking-view?arenaSlug=${slug}&date=2040-01-02${extra}`,{headers:{cookie:requestCookie},redirect:'manual'});
  const stranger=await db.player.create({data:{arenaId:arena.id,name:'Private other athlete marker'}});
  const privateBooking=await db.scheduleOccurrence.create({data:{arenaId:arena.id,sourceType:'BOOKING',title:'Private other booking title marker',notes:'Private other notes marker',startsAt:new Date('2040-01-02T09:00:00'),endsAt:new Date('2040-01-02T09:30:00'),responsiblePlayerId:stranger.id,occurrenceCourts:{create:{courtId:court.id}},participants:{create:{playerId:stranger.id}}}});
  const equipment=await db.product.create({data:{arenaId:arena.id,name:'Public equipment',isService:true,showOnPortalBooking:true,priceCents:1000,bookingConcurrentLimit:1}});
  await db.scheduleServiceReservation.create({data:{arenaId:arena.id,occurrenceId:privateBooking.id,productId:equipment.id,serviceName:equipment.name,priceCents:1000}});
  const anonymousView=await view(arena.slug,'');assert.equal(anonymousView.status,200);assert.equal(anonymousView.headers.get('cache-control'),'private, no-store');const anonymous=await anonymousView.json();assert.equal(anonymous.currentClient,null);assert.deepEqual(anonymous.courts,[]);assert.deepEqual(anonymous.bookingServices,[]);
  const ownView=await view();assert.equal(ownView.status,200);const own=await ownView.json();assert.deepEqual(own.currentClient,{name:player.name});assert.equal(own.selectedDate,'2040-01-02');assert.equal(own.courts.length,1);assert.equal(own.courts[0].id,court.id);assert.ok(own.courts[0].slots.some(slot=>slot.label==='10:00'));assert.ok(!own.courts[0].slots.some(slot=>slot.label==='09:00'));assert.deepEqual(own.bookingServices[0].busy,[{start:540,end:570}]);assert.equal(JSON.stringify(own).includes('Private other'),false);assert.equal(JSON.stringify(own).includes(privateBooking.id),false);
  assert.equal((await view(arena.slug,cookie,'&playerId=forged')).status,400);assert.equal((await view(arena.slug,cookie,'&date=2040-01-03')).status,400);
  const foreignView=await(await view(foreign.slug)).json();assert.equal(foreignView.currentClient,null);assert.deepEqual(foreignView.courts,[]);
  assert.equal((await post('create',input,'')).status,401);
  assert.equal((await post('create',input,cookie,'https://foreign.invalid')).status,403);
  assert.equal((await post('create',{...input,playerId:player.id})).status,400);
  assert.equal((await post('create',{...input,arenaSlug:[arena.slug,foreign.slug]})).status,400);
  assert.equal((await post('create',{...input,arenaSlug:foreign.slug})).status,401);
  const values=await Promise.all((await Promise.all([post('create',input),post('create',input)])).map(async response=>{assert.equal(response.status,200,await response.clone().text());return response.json();}));
  assert.equal(values.filter(value=>value.result?.ok).length,1);assert.equal(values.filter(value=>value.result?.ok===false).length,1);
  const occurrenceId=values.find(value=>value.result?.ok).result.occurrenceId;
  const occurrence=await db.scheduleOccurrence.findUniqueOrThrow({where:{id:occurrenceId},include:{participants:true}});assert.equal(occurrence.status,'PENDING_CONFIRMATION');assert.equal(occurrence.responsiblePlayerId,player.id);assert.equal(occurrence.participants[0].amountCents,15000);assert.equal(await db.scheduleOccurrence.count({where:{arenaId:arena.id,responsiblePlayerId:player.id}}),1);
  const pendingView=await(await view()).json();assert.equal(pendingView.pendingReservation.id,occurrenceId);assert.equal(pendingView.pendingReservation.status,'PENDING_CONFIRMATION');assert.ok(!pendingView.courts[0].slots.some(slot=>slot.label==='10:00'));
  const audit=await db.auditEvent.findFirstOrThrow({where:{arenaId:arena.id,entityId:occurrenceId,action:'booking.created'}});assert.equal(audit.actorId,player.id);
  const forbiddenPayment=await post('payment',{arenaSlug:foreign.slug,occurrenceId,method:'PIX'});assert.equal(forbiddenPayment.status,401);
  const canceled=await post('cancel',{arenaSlug:arena.slug,occurrenceId});assert.equal(canceled.status,200,await canceled.clone().text());assert.deepEqual(await canceled.json(),{error:null,result:null});assert.equal((await db.scheduleOccurrence.findUniqueOrThrow({where:{id:occurrenceId}})).status,'CANCELED');
  const afterCancel=await(await view()).json();assert.equal(afterCancel.pendingReservation,null);assert.ok(afterCancel.courts[0].slots.some(slot=>slot.label==='10:00'));
  await db.arena.update({where:{id:arena.id},data:{archivedAt:new Date()}});assert.equal((await view()).status,404);
  console.log('Public booking HTTP: minimal authenticated availability, no other-athlete/profile data, service occupancy, athlete-derived scope/actor, strict Origin/payload, concurrent reservation, price, pending state and customer cancellation passed.');
 } finally {const ids=arenas.map(row=>row.id);await db.scheduleOccurrence.deleteMany({where:{arenaId:{in:ids}}});await db.financialEntry.deleteMany({where:{arenaId:{in:ids}}});await db.auditEvent.deleteMany({where:{arenaId:{in:ids}}});await db.arena.deleteMany({where:{id:{in:ids},slug:{startsWith:'public-booking-'}}});}
}
