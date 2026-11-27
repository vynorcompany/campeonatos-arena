import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function assertCalendarManagementSmoke(db,origin,staffId,sessionCookie){
 const arenas=[];
 try{
  for(const name of ['Calendar own synthetic','Calendar foreign synthetic'])arenas.push(await db.arena.create({data:{name,slug:'calendar-management-'+randomUUID(),createdById:'goal-test'}}));
  const[arena,foreign]=arenas;
  const member=await db.arenaMember.create({data:{arenaId:arena.id,userId:staffId,role:'STAFF',viewPermissions:['calendar'],editPermissions:[]}});
  const cookie=sessionCookie.split(';')[0]+`; padel_arena=${arena.id}`;
  const post=(operation,fields={},requestOrigin='http://127.0.0.1:3014')=>fetch(`${origin}/api/management/calendar/actions/${operation}`,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,Array.isArray(value)?value:[value]]))}),redirect:'manual'});
  const ok=async response=>{assert.equal(response.status,200,await response.clone().text());const value=await response.json();assert.equal(value.error,null,JSON.stringify(value));return value;};
  const event={eventType:'EVENTO',title:'Synthetic event',scheduledAt:'2026-12-07T10:00',durationMinutes:'60',notes:'Plain <script>never_execute()</script>'};
  assert.equal((await post('event-create',event)).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['calendar:event:manage']}});
  assert.equal((await post('client-create',{name:'Not allowed',phone:'41990000000'})).status,403);
  assert.equal((await post('event-create',{...event,arenaId:foreign.id})).status,400);
  assert.equal((await post('event-create',{...event,title:['first','second']})).status,400);
  assert.equal((await post('event-create',event,'https://foreign.invalid')).status,403);
  const invalid=await post('event-create',{...event,title:'x'});assert.equal(invalid.status,200);assert.ok((await invalid.json()).error);assert.equal(await db.calendarEvent.count({where:{arenaId:arena.id}}),0);
  await ok(await post('event-create',event));
  let stored=await db.calendarEvent.findFirstOrThrow({where:{arenaId:arena.id,title:event.title}});assert.equal(stored.notes,event.notes);assert.equal(stored.durationMinutes,60);
  const foreignEvent=await db.calendarEvent.create({data:{arenaId:foreign.id,title:'Foreign event',eventType:'EVENTO',scheduledAt:new Date('2026-12-07T10:00:00Z')}});
  const edit={...event,sourceType:'calendar',lessonId:'',calendarEventId:stored.id,title:'Updated event',durationMinutes:'90'};
  for(const operation of ['event-update','event-delete'])assert.equal((await post(operation,operation==='event-update'?{...edit,calendarEventId:foreignEvent.id}:{sourceType:'calendar',lessonId:'',calendarEventId:foreignEvent.id})).status,400);
  await ok(await post('event-update',edit));stored=await db.calendarEvent.findUniqueOrThrow({where:{id:stored.id}});assert.equal(stored.title,'Updated event');assert.equal(stored.durationMinutes,90);
  await ok(await post('event-update',{...edit,eventType:'AULA',title:'Converted lesson'}));assert.equal(await db.calendarEvent.count({where:{id:stored.id}}),0);const lesson=await db.lesson.findFirstOrThrow({where:{arenaId:arena.id,title:'Converted lesson'}});
  await ok(await post('event-update',{...edit,sourceType:'lesson',lessonId:lesson.id,calendarEventId:'',title:'Updated lesson'}));assert.equal((await db.lesson.findUniqueOrThrow({where:{id:lesson.id}})).title,'Updated lesson');
  await ok(await post('event-delete',{sourceType:'lesson',lessonId:lesson.id,calendarEventId:''}));assert.equal(await db.lesson.count({where:{id:lesson.id}}),0);
  await ok(await post('event-create',{...event,eventType:'AULA',title:'Created lesson'}));assert.equal(await db.lesson.count({where:{arenaId:arena.id,title:'Created lesson'}}),1);
  await ok(await post('event-create',{...event,title:'Delete event'}));const deleting=await db.calendarEvent.findFirstOrThrow({where:{arenaId:arena.id,title:'Delete event'}});await ok(await post('event-delete',{sourceType:'calendar',lessonId:'',calendarEventId:deleting.id}));assert.equal(await db.calendarEvent.count({where:{id:deleting.id}}),0);
  assert.equal((await db.calendarEvent.findUniqueOrThrow({where:{id:foreignEvent.id}})).title,'Foreign event');
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['players:create']}});
  assert.equal((await post('event-create',event)).status,403);
  const client={name:'paulo marcelo teste',phone:'(41) 99000-1234',email:'',cpf:'',class:'',gender:'',birthDate:'',personType:'PF',cnpj:''};
  const race=await Promise.all([post('client-create',client),post('client-create',{...client,phone:'5541990001234'})]);const outcomes=await Promise.all(race.map(async response=>{assert.equal(response.status,200,await response.clone().text());return response.json();}));
  assert.equal(outcomes.filter(value=>value.id).length,1);assert.equal(outcomes.filter(value=>value.error).length,1);const created=outcomes.find(value=>value.id);assert.deepEqual(Object.keys(created).sort(),['error','id','name']);assert.equal(created.name,'Paulo Marcelo Teste');assert.equal(await db.player.count({where:{arenaId:arena.id}}),1);
  const storedPlayer=await db.player.findUniqueOrThrow({where:{id:created.id}});assert.equal(storedPlayer.arenaId,arena.id);assert.equal(storedPlayer.phone,'41990001234');
  console.log('Calendar management HTTP: permission and Origin isolation, event/lesson conversions, scoped edits/removals, literal notes and concurrent normalized-phone deduplication passed.');
 }finally{const ids=arenas.map(row=>row.id);await db.lesson.deleteMany({where:{arenaId:{in:ids}}});await db.calendarEvent.deleteMany({where:{arenaId:{in:ids}}});await db.auditEvent.deleteMany({where:{arenaId:{in:ids}}});await db.arena.deleteMany({where:{id:{in:ids},slug:{startsWith:'calendar-management-'}}});}
}
