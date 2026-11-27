import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';

/** Own synthetic arenas and identities; the caller supplies a loopback-only provider. */
export async function assertAgencySmoke(db,origin,staffId,sessionCookie,provider){
 const staff=await db.user.findUniqueOrThrow({where:{id:staffId}});const arenas=[];const users=[];let plan;
 const createArena=async(name)=>{const a=await db.arena.create({data:{name,slug:'agency-contract-'+randomUUID(),createdById:'goal-test'}});arenas.push(a);return a;};
 const createUser=async(role='VIEWER')=>{const u=await db.user.create({data:{name:'Agency Synthetic '+randomUUID(),email:randomUUID()+'@example.test',passwordHash:'synthetic-unused-password',systemRole:role}});users.push(u.id);const token=randomBytes(20).toString('hex');await db.session.create({data:{userId:u.id,token:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});return{...u,cookie:`padel_session=${token}`};};
 const post=(operation,input,cookie,requestOrigin='http://127.0.0.1:3014')=>fetch(`${origin}/api/management/agency/actions/${operation}`,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(input),redirect:'manual'});
 const ok=async response=>{assert.equal(response.status,200);const body=await response.json();assert.equal(body.error,null,JSON.stringify(body));return body;};
 try{
  const arena=await createArena('Agency connection synthetic');const foreign=await createArena('Agency archive synthetic');await db.arenaMember.create({data:{arenaId:arena.id,userId:staffId,role:'ADMIN'}});
  const cookie=sessionCookie.split(';')[0]+`; padel_arena=${arena.id}`;
  const target=await createUser();
  const reads=area=>fetch(`${origin}/api/management/agency/workspaces/${area}`,{headers:{cookie},redirect:'manual'});
  assert.equal((await reads('users')).status,403);
  assert.equal((await post('arena-status',{arenaId:foreign.id,accountStatus:'PAUSED'},cookie)).status,403);
  assert.equal((await post('system-role',{userId:target.id,systemRole:'SUPER_ADMIN'},cookie)).status,403);
  const count=provider.requests.length;
  assert.equal((await post('whatsapp-connect',{arenaId:foreign.id},cookie)).status,403);
  assert.equal((await post('whatsapp-connect',{arenaId:arena.id,instanceName:'forged'},cookie)).status,400);
  assert.equal((await post('whatsapp-connect',{arenaId:arena.id},cookie,'https://foreign.invalid')).status,403);assert.equal(provider.requests.length,count);
  await ok(await post('whatsapp-connect',{arenaId:arena.id},cookie));let connection=await db.whatsAppConnection.findUniqueOrThrow({where:{arenaId:arena.id}});assert.equal(connection.status,'AWAITING_SCAN');assert.ok(connection.encryptedToken);assert.ok(connection.webhookSecretHash);assert.equal(connection.encryptedToken.includes('synthetic-evolution-api-key'),false);
  const initialToken=connection.encryptedToken,initialHash=connection.webhookSecretHash,name=connection.instanceName;
  assert.equal(provider.requests.filter(row=>row.path==='/instance/create'&&row.body.instanceName===name).length,1);
  const waiting=await ok(await post('whatsapp-status',{arenaId:arena.id},cookie));assert.equal(waiting.connected,false);
  provider.setConnected(name,'5541999996300@s.whatsapp.net');const status=await ok(await post('whatsapp-status',{arenaId:arena.id},cookie));assert.equal(status.connected,true);
  connection=await db.whatsAppConnection.findUniqueOrThrow({where:{arenaId:arena.id}});assert.equal(connection.status,'CONNECTED');assert.ok(connection.lastConnectedAt);assert.equal(connection.qrCodeDataUrl,'');
  await ok(await post('whatsapp-connect',{arenaId:arena.id},cookie));assert.equal(provider.requests.filter(row=>row.path==='/instance/create'&&row.body.instanceName===name).length,1);assert.equal(provider.requests.filter(row=>row.path==='/instance/logout/'+name).length,0);
  await ok(await post('whatsapp-reset',{arenaId:arena.id},cookie));connection=await db.whatsAppConnection.findUniqueOrThrow({where:{arenaId:arena.id}});assert.equal(connection.status,'AWAITING_SCAN');assert.equal(connection.encryptedToken,initialToken);assert.equal(connection.webhookSecretHash,initialHash);assert.equal(connection.connectedPhone,'');assert.equal(connection.lastConnectedAt,null);assert.equal(provider.requests.filter(row=>row.path==='/instance/logout/'+name).length,1);assert.equal(provider.requests.filter(row=>row.path==='/instance/create'&&row.body.instanceName===name).length,1);
  await ok(await post('whatsapp-qr',{arenaId:arena.id},cookie));
  provider.setFailure(true);try{const failed=await(await post('whatsapp-connect',{arenaId:arena.id},cookie)).json();assert.ok(failed.error);assert.equal(JSON.stringify(failed).includes('PRIVATE_PROVIDER_TOKEN'),false);assert.equal((await db.whatsAppConnection.findUniqueOrThrow({where:{arenaId:arena.id}})).lastError.includes('PRIVATE_PROVIDER_TOKEN'),false);}finally{provider.setFailure(false);}
  assert.equal(provider.requests.some(row=>row.path.includes('/message/')),false);
  await db.user.update({where:{id:staffId},data:{systemRole:'MANAGER'}});
  for(const area of ['users','arenas']){const response=await reads(area);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');const text=await response.text();for(const forbidden of ['passwordHash','encryptedToken','webhookSecretHash','checkinToken'])assert.equal(text.includes(forbidden),false,forbidden);}
  assert.equal((await reads('users?arenaId=forged')).status,400);
  assert.equal((await post('system-role',{userId:target.id,systemRole:'SUPER_ADMIN'},cookie)).status,403);
  const edit={arenaId:foreign.id,name:'Agency updated synthetic',legalName:'Test legal',cnpj:'',email:'fixture@example.test',phone:'41900000000',city:'Curitiba',state:'PR',agencyNotes:'Private agency test note'};
  await ok(await post('arena-update',edit,cookie));assert.equal((await db.arena.findUniqueOrThrow({where:{id:foreign.id}})).agencyNotes,edit.agencyNotes);
  await ok(await post('arena-status',{arenaId:foreign.id,accountStatus:'PAUSED'},cookie));assert.equal((await db.arena.findUniqueOrThrow({where:{id:foreign.id}})).accountStatus,'PAUSED');
  plan=await db.agencyPlan.create({data:{name:'Agency fixture '+randomUUID(),monthlyPriceCents:1000}});await db.agencySubscription.create({data:{arenaId:foreign.id,planId:plan.id,nextDueAt:new Date()}});
  const notConfirmed=await(await post('arena-archive',{arenaId:foreign.id,confirmation:'wrong'},cookie)).json();assert.ok(notConfirmed.error);assert.equal((await db.arena.findUniqueOrThrow({where:{id:foreign.id}})).archivedAt,null);
  await ok(await post('arena-archive',{arenaId:foreign.id,confirmation:'ARQUIVAR'},cookie));const archived=await db.arena.findUniqueOrThrow({where:{id:foreign.id}});assert.ok(archived.archivedAt);assert.equal(archived.accountStatus,'CANCELED');const subscription=await db.agencySubscription.findUniqueOrThrow({where:{arenaId:foreign.id}});assert.equal(subscription.status,'CANCELED');assert.equal(subscription.nextDueAt,null);
  await ok(await post('arena-status',{arenaId:foreign.id,accountStatus:'ACTIVE'},cookie));assert.equal((await db.arena.findUniqueOrThrow({where:{id:foreign.id}})).archivedAt,null);
  await db.user.update({where:{id:staffId},data:{systemRole:'ADMIN'}});assert.equal((await post('system-role',{userId:target.id,systemRole:'SUPER_ADMIN'},cookie)).status,403);
  await db.user.update({where:{id:staffId},data:{systemRole:'SUPER_ADMIN'}});await ok(await post('system-role',{userId:target.id,systemRole:'MANAGER'},cookie));assert.equal((await db.user.findUniqueOrThrow({where:{id:target.id}})).systemRole,'MANAGER');assert.equal((await post('system-role',{userId:staffId,systemRole:'VIEWER'},cookie)).status,400);
  const a=await createUser('SUPER_ADMIN'),b=await createUser('SUPER_ADMIN');const race=await Promise.all([post('system-role',{userId:b.id,systemRole:'VIEWER'},a.cookie),post('system-role',{userId:a.id,systemRole:'VIEWER'},b.cookie)]);assert.equal(race.filter(row=>row.status===200).length,1);assert.equal(await db.user.count({where:{id:{in:[a.id,b.id]},systemRole:'SUPER_ADMIN'}}),1);
  console.log('Agency HTTP: minimal DTOs, privilege isolation, owner race, archive preservation and loopback Evolution connect/status/reset/QR passed.');
 }finally{
  provider.setFailure(false);await db.user.update({where:{id:staffId},data:{systemRole:staff.systemRole}});
  await db.auditEvent.deleteMany({where:{OR:[{arenaId:{in:arenas.map(row=>row.id)}},{actorId:{in:users}}]}});await db.arena.deleteMany({where:{id:{in:arenas.map(row=>row.id)},slug:{startsWith:'agency-contract-'}}});if(plan)await db.agencyPlan.delete({where:{id:plan.id}});await db.user.deleteMany({where:{id:{in:users}}});
 }
}
