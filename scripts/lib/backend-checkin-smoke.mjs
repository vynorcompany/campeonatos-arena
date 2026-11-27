import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
export async function assertCheckinSmoke(db,origin,frontendOrigin,staffId,sessionCookie){
 const arenas=[];
 try{
  for(const name of ['Checkin API own','Private foreign checkin'])arenas.push(await db.arena.create({data:{name,slug:'checkin-api-'+randomUUID(),createdById:'goal-test'}}));
  const[arena,foreign]=arenas;
  const member=await db.arenaMember.create({data:{arenaId:arena.id,userId:staffId,role:'STAFF',viewPermissions:['calendar'],editPermissions:[]}});
  const managementCookie=sessionCookie.split(';')[0]+`; padel_arena=${arena.id}`;
  const readSettings=(query='')=>fetch(origin+'/api/management/checkin'+query,{headers:{cookie:managementCookie}});
  const body=fields=>JSON.stringify({fields:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,Array.isArray(value)?value:[value]]))});
  const configure=(fields,requestOrigin=frontendOrigin)=>fetch(origin+'/api/management/checkin',{method:'POST',headers:{cookie:managementCookie,origin:requestOrigin,'content-type':'application/json'},body:body(fields)});
  assert.equal((await readSettings()).status,403);assert.equal((await configure({enabled:'true'})).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['calendar:settings:manage']}});
  const initial=await readSettings();assert.equal(initial.status,200);assert.equal((await initial.json()).checkinToken,null);
  assert.equal((await readSettings('?arenaId='+foreign.id)).status,400);assert.equal((await configure({enabled:'true',arenaId:foreign.id})).status,400);assert.equal((await configure({enabled:'true'},'https://foreign.invalid')).status,403);
  assert.equal((await configure({enabled:'true'})).status,200);let configured=await db.arena.findUniqueOrThrow({where:{id:arena.id}});assert.equal(configured.checkinEnabled,true);assert.equal(configured.checkinToken.length,64);const token=configured.checkinToken;
  assert.equal((await configure({checkinMode:'GROUP',enabled:'true',rotate:'true'})).status,200);configured=await db.arena.findUniqueOrThrow({where:{id:arena.id}});assert.equal(configured.checkinMode,'GROUP');assert.equal(configured.checkinToken,token);
  assert.equal((await configure({lessonDebtPolicy:'true',lessonCheckinBlockOverdue:'true'})).status,200);assert.equal((await db.arenaOperationalSettings.findUniqueOrThrow({where:{arenaId:arena.id}})).lessonCheckinBlockOverdue,true);
  const players=await Promise.all(['Checkin owner','Checkin invited','Private nonparticipant'].map(name=>db.player.create({data:{arenaId:arena.id,name,email:'private-checkin@example.test',phone:'00000000000',bio:'private-checkin-notes'}})));
  const foreignPlayer=await db.player.create({data:{arenaId:foreign.id,name:'Private foreign athlete'}});
  const account=await db.playerAccount.create({data:{arenaId:arena.id,playerId:players[0].id,phone:randomUUID(),passwordHash:'disabled-synthetic-no-login'}});const raw=randomUUID();await db.playerSession.create({data:{playerAccountId:account.id,token:createHash('sha256').update(raw).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});const cookie=`arena_player_session=${raw}`;
  const court=await db.court.create({data:{arenaId:arena.id,name:'Checkin API court'}});
  const wall=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  const slot=await db.scheduleOccurrence.create({data:{arenaId:arena.id,sourceType:'BOOKING',title:'Private occurrence title',notes:'Private occurrence notes',responsiblePlayerId:players[0].id,startsAt:wall,endsAt:new Date(wall.getTime()+3600000),occurrenceCourts:{create:{courtId:court.id}},participants:{create:players.slice(0,2).map(player=>({playerId:player.id,amountCents:2500}))}}});
  const view=(requestCookie=cookie,extra='')=>fetch(`${origin}/api/portal/checkin?${new URLSearchParams({arenaSlug:arena.slug,token,focusId:slot.id})}${extra}`,{headers:{cookie:requestCookie}});
  const anonymous=await view('');assert.equal(anonymous.status,200);assert.equal(anonymous.headers.get('cache-control'),'private, no-store');const anon=await anonymous.json();assert.equal(anon.auth,null);assert.deepEqual(anon.slots,[]);assert.deepEqual(anon.lessons,[]);
  const own=await(await view()).json();assert.equal(own.auth.playerId,players[0].id);assert.equal(own.slots.length,1);assert.equal(own.slots[0].canManage,true);assert.equal(own.slots[0].participants.length,2);for(const hidden of ['private-checkin@example.test','00000000000','private-checkin-notes','Private occurrence',foreignPlayer.id,players[2].id,'passwordHash'])assert.equal(JSON.stringify(own).includes(hidden),false,hidden);
  assert.equal((await view(cookie,'&playerId='+foreignPlayer.id)).status,400);assert.equal((await view(cookie,'&token='+token)).status,400);
  const post=(operation,fields,requestCookie=cookie,requestOrigin=frontendOrigin)=>fetch(`${origin}/api/portal/checkin/actions/${operation}`,{method:'POST',headers:{cookie:requestCookie,origin:requestOrigin,'content-type':'application/json'},body:body(fields)});
  const fields={arenaSlug:arena.slug,token,occurrenceId:slot.id,courtId:court.id,selectionMode:'group',playerIds:players.slice(0,2).map(p=>p.id)};
  assert.equal((await post('court',fields,'')).status,401);assert.equal((await post('court',fields,cookie,'https://foreign.invalid')).status,403);assert.equal((await post('court',{...fields,actorId:foreignPlayer.id})).status,400);assert.equal((await post('court',{...fields,arenaSlug:foreign.slug})).status,401);
  const rejected=await post('court',{...fields,playerIds:[players[0].id,foreignPlayer.id]});assert.equal(rejected.status,200);assert.match((await rejected.json()).error,/vinculados/);assert.equal(await db.checkinRecord.count({where:{arenaId:arena.id}}),0);
  const wrongToken=await post('court',{...fields,token:randomBytes(32).toString('hex')});assert.equal(wrongToken.status,200);assert.match((await wrongToken.json()).error,/QR Code/);
  await Promise.all([fields,{...fields,playerIds:[players[1].id,players[0].id]}].map(async input=>{const response=await post('court',input);assert.equal(response.status,200);assert.equal((await response.json()).error,null);}));
  assert.equal(await db.checkinRecord.count({where:{occurrenceId:slot.id}}),2);assert.equal(await db.auditEvent.count({where:{arenaId:arena.id,action:'COURT_CHECKIN',actorId:players[0].id}}),2);
  const refreshed=await(await view()).json();assert.ok(refreshed.slots[0].participants.every(p=>p.checkedIn));
  const shared=await post('share',{arenaSlug:arena.slug,occurrenceId:slot.id});assert.equal(shared.status,200);assert.equal((await shared.json()).path,`/checkin/${arena.slug}?token=${token}&jogo=${slot.id}`);
  const lesson=await post('lesson',{arenaSlug:arena.slug,token,lessonId:'nonexistent'});assert.equal(lesson.status,200);assert.match((await lesson.json()).error,/aula/);
  for(const path of ['/configuracoes/checkin',`/checkin/${arena.slug}?token=${token}&jogo=${slot.id}`]){const page=await fetch(frontendOrigin+path,{headers:{cookie:path.startsWith('/configuracoes')?managementCookie:cookie},redirect:'manual'});assert.equal(page.status,200);assert.ok((await page.text()).includes(path.startsWith('/configuracoes')?'Check-in':'Checkin owner'));}
  assert.equal((await configure({enabled:'false'})).status,200);assert.equal((await view()).status,404);assert.equal((await post('court',fields)).status,200);assert.match((await(await post('court',fields)).json()).error,/QR Code/);
  console.log('Checkin HTTP: management permission/config/token preservation, anonymous privacy, own/group projection, Origin and identity scope, atomic cross-arena rejection, concurrent idempotent presence/audit, guarded sharing, lesson rejection, SSR and disabled-QR rejection passed.');
 }finally{const ids=arenas.map(a=>a.id);await db.auditEvent.deleteMany({where:{arenaId:{in:ids}}});await db.checkinRecord.deleteMany({where:{arenaId:{in:ids}}});await db.scheduleOccurrence.deleteMany({where:{arenaId:{in:ids}}});await db.arena.deleteMany({where:{id:{in:ids},slug:{startsWith:'checkin-api-'}}});}
}
