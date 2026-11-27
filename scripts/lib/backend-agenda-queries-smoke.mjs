import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function assertAgendaQueriesSmoke(db,backend,frontend,staffId,sessionCookie){
 const arenas=[];
 try{
  for(const name of ['Agenda queries own','Agenda queries foreign'])arenas.push(await db.arena.create({data:{name,slug:'agenda-queries-'+randomUUID(),createdById:'goal-test'}}));
  const[arena,foreign]=arenas;
  const member=await db.arenaMember.create({data:{arenaId:arena.id,userId:staffId,role:'STAFF',viewPermissions:['calendar'],editPermissions:[]}});
  const cookie=sessionCookie.split(';')[0]+`; padel_arena=${arena.id}`;
  const court=await db.court.create({data:{arenaId:arena.id,name:'Query court',weeklyRules:{create:{weekday:1,startsAtMinute:480,endsAtMinute:540,priceCents:7500,available:true}},dateAvailability:[{date:'2026-12-07',startsAtMinute:600,endsAtMinute:780,priceCents:9000,online:false}]}});
  const foreignCourt=await db.court.create({data:{arenaId:foreign.id,name:'Foreign query court'}});
  const create=(arenaId,courtId,start,end)=>db.scheduleOccurrence.create({data:{arenaId,sourceType:'BOOKING',title:'Query fixture',startsAt:new Date(start),endsAt:new Date(end),occurrenceCourts:{create:{courtId}}}});
  const original=await create(arena.id,court.id,'2026-12-07T10:00:00','2026-12-07T11:00:00');
  await create(arena.id,court.id,'2026-12-07T08:00:00','2026-12-07T08:30:00');
  const outsider=await create(foreign.id,foreignCourt.id,'2026-12-07T10:00:00','2026-12-07T11:00:00');
  const read=(origin,path,authCookie=cookie)=>fetch(origin+path,{headers:{cookie:authCookie},redirect:'manual'});
  const query=`courtId=${court.id}&date=2026-12-07`;
  let expectedVersion;
  for(const origin of [backend,frontend]){
   const prefixes=origin===backend?['/api/management/agenda','/api/agenda']:['/api/agenda'];
   for(const prefix of prefixes){
    const availability=await read(origin,`${prefix}/availability?${query}`);assert.equal(availability.status,200,await availability.clone().text());assert.equal(availability.headers.get('cache-control'),'private, no-store');const result=await availability.json();assert.deepEqual(result,{slotMinutes:30,availableMinutes:[510,660,690,720,750]});
    const editing=await read(origin,`${prefix}/availability?${query}&occurrenceId=${original.id}`);assert.equal(editing.status,200);assert.deepEqual((await editing.json()).availableMinutes,[510,600,630,660,690,720,750]);
    for(const suffix of [`courtId=${foreignCourt.id}&date=2026-12-07`,`${query}&occurrenceId=${outsider.id}`])assert.equal((await read(origin,`${prefix}/availability?${suffix}`)).status,404);
    for(const suffix of [`${query}&arenaId=${foreign.id}`,`${query}&date=2026-12-08`,`courtId=${court.id}&date=2026-02-29`])assert.equal((await read(origin,`${prefix}/availability?${suffix}`)).status,400);
    assert.equal((await read(origin,`${prefix}/availability?${query}`,'')).status,401);
    const version=await read(origin,`${prefix}/version?date=2026-12-07`);assert.equal(version.status,200);const value=await version.json();assert.match(value.version,/^[a-f0-9]{64}$/);if(expectedVersion)assert.deepEqual(value,expectedVersion);else expectedVersion=value;
    assert.equal((await read(origin,`${prefix}/version?date=2026-12-07&date=2026-12-08`)).status,400);assert.equal((await read(origin,`${prefix}/version?date=2026-02-29`)).status,400);assert.equal((await read(origin,`${prefix}/version?date=2026-12-07`,'' )).status,401);
   }
  }
  await db.scheduleOccurrence.update({where:{id:outsider.id},data:{status:'CANCELED'}});assert.deepEqual(await(await read(backend,'/api/management/agenda/version?date=2026-12-07')).json(),expectedVersion);
  await db.scheduleOccurrence.update({where:{id:original.id},data:{notes:'Version changed'}});assert.notDeepEqual(await(await read(frontend,'/api/agenda/version?date=2026-12-07')).json(),expectedVersion);
  const overnightCourt=await db.court.create({data:{arenaId:arena.id,name:'Overnight query court',dateAvailability:[{date:'2026-12-07',startsAtMinute:0,endsAtMinute:60,priceCents:1000,online:false}]}});await create(arena.id,overnightCourt.id,'2026-12-06T23:30:00','2026-12-07T00:30:00');assert.deepEqual((await(await read(backend,`/api/management/agenda/availability?courtId=${overnightCourt.id}&date=2026-12-07`)).json()).availableMinutes,[30]);
  await db.arena.update({where:{id:arena.id},data:{accountStatus:'SUSPENDED'}});
  for(const area of ['availability','version'])assert.equal((await read(backend,`/api/management/agenda/${area}?${area==='availability'?query:'date=2026-12-07'}`)).status,403);
  await db.arena.update({where:{id:arena.id},data:{accountStatus:'ACTIVE'}});
  await db.arenaMember.update({where:{id:member.id},data:{viewPermissions:[]}});
  for(const origin of [backend,frontend])for(const area of ['availability','version'])assert.equal((await read(origin,`/api/agenda/${area}?${area==='availability'?query:'date=2026-12-07'}`)).status,403);
  console.log('Agenda query gateways: API-local compatibility with unusable remote origin, frontend forwarding, strict scope/auth, dated openings, overnight occupancy and version parity passed.');
 }finally{const ids=arenas.map(row=>row.id);await db.scheduleOccurrence.deleteMany({where:{arenaId:{in:ids}}});await db.auditEvent.deleteMany({where:{arenaId:{in:ids}}});await db.arena.deleteMany({where:{id:{in:ids},slug:{startsWith:'agenda-queries-'}}});}
}
