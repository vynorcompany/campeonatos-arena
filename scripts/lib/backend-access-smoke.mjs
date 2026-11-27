import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
export async function assertAccessSmoke(db,origin,arenaId,cookie,staffId) {
 const tag='AccessContract'+randomUUID().replace(/-/g,'');const member=await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:staffId}});
 const other=await db.arena.create({data:{name:'Access foreign disposable',slug:'access-foreign-'+randomUUID(),createdById:'goal-test'}});
 const foreign=await db.permissionProfile.create({data:{arenaId:other.id,name:'Foreign private profile '+tag,description:'foreign'}});
 const legacy=await db.user.create({data:{name:'Usuário Legado '+tag,email:tag+'@example.test',passwordHash:'PRIVATE_HASH_'+tag,systemRole:'VIEWER',memberships:{create:{arenaId,role:'STAFF',viewPermissions:['calendar'],editPermissions:['calendar']}}}});
 const legacyMember=await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:legacy.id}});
 const tokens=Array.from({length:54},(_,i)=>({id:tag+'-'+i,arenaId,email:`${i}@example.test`,name:'Convite '+i,kind:'INVITE',tokenHash:createHash('sha256').update(tag+'-'+i).digest('hex'),expiresAt:new Date(Date.now()+3600000),createdAt:new Date(Date.now()-i*1000)}));
 await db.accountActionToken.createMany({data:[...tokens,{...tokens[0],id:tag+'-foreign',arenaId:other.id,tokenHash:tag+'foreign'},{...tokens[0],id:tag+'-expired',tokenHash:tag+'expired',expiresAt:new Date(Date.now()-1)},{...tokens[0],id:tag+'-used',tokenHash:tag+'used',usedAt:new Date()},{...tokens[0],id:tag+'-reset',tokenHash:tag+'reset',kind:'PASSWORD_RESET'}]});
 const get=(path)=>fetch(origin+'/api/management/access/'+path,{headers:{cookie},redirect:'manual'});
 const post=(operation,body,requestOrigin='http://127.0.0.1:3014')=>fetch(origin+'/api/management/access/profiles/actions/'+operation,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
 const body={name:'Perfil '+tag,description:'Descrição sintética',viewPermissions:['calendar'],editPermissions:['calendar'],financialEntryDelete:'on'};
 try {
  assert.equal((await get('profiles')).status,403);assert.equal((await get('users')).status,403);assert.equal((await post('create',body)).status,403);assert.equal(await db.permissionProfile.count({where:{arenaId}}),0);
  await db.arenaMember.update({where:{id:member.id},data:{role:'ADMIN',permissionProfileId:null}});
  assert.equal((await get('profiles?arenaId='+other.id)).status,400);assert.equal((await get('users?q=a&q=b')).status,400);
  const reads=await Promise.all([get('profiles'),get('profiles')]);assert.ok(reads.every(x=>x.status===200));
  const first=await reads[0].json();assert.equal(first.profiles.some(row=>row.id===foreign.id),false);const count=await db.permissionProfile.count({where:{arenaId}});await get('profiles');assert.equal(await db.permissionProfile.count({where:{arenaId}}),count);
  const migrated=await db.arenaMember.findUniqueOrThrow({where:{id:legacyMember.id},include:{permissionProfile:true}});assert.ok(migrated.permissionProfile);assert.deepEqual(migrated.permissionProfile.viewPermissions,['calendar']);assert.deepEqual(migrated.permissionProfile.editPermissions,['calendar']);assert.deepEqual(migrated.viewPermissions,['calendar']);
  assert.equal((await post('create',body,'https://foreign.invalid')).status,403);assert.equal((await post('create',{...body,arenaId:other.id})).status,400);assert.equal((await post('create',{...body,viewPermissions:'calendar'})).status,400);
  const created=await(await post('create',body)).json();assert.ok(created.profileId);
  const detail=await get('profiles/detail/'+created.profileId);assert.equal(detail.headers.get('cache-control'),'private, no-store');const profile=await detail.json();assert.ok(profile.editPermissions.includes('finance:delete-entry'));assert.equal(profile._count.members,0);
  assert.equal(await(await get('profiles/detail/'+foreign.id)).json(),null);
  assert.equal((await post('update',{...body,profileId:foreign.id})).status,400);assert.equal((await post('delete',{profileId:foreign.id})).status,400);assert.equal((await db.permissionProfile.findUniqueOrThrow({where:{id:foreign.id}})).name,'Foreign private profile '+tag);
  await db.arenaMember.update({where:{id:legacyMember.id},data:{permissionProfileId:created.profileId}});
  assert.equal((await post('delete',{profileId:created.profileId})).status,400);assert.equal((await db.arenaMember.findUniqueOrThrow({where:{id:legacyMember.id}})).permissionProfileId,created.profileId);
  const updated=await(await post('update',{...body,name:'Atualizado '+tag,profileId:created.profileId,viewPermissions:['players']})).json();assert.equal(updated.profileId,created.profileId);
  const users=await(await get('users')).json();assert.equal(users.invites.length,50);assert.ok(users.invites.every(row=>tokens.some(token=>token.id===row.id)));assert.ok(users.members.find(row=>row.userId===legacy.id).permissionProfile.name.startsWith('Atualizado '));
  const serialized=JSON.stringify(users);for(const key of ['passwordHash','tokenHash','PRIVATE_HASH_','kind','usedAt'])assert.equal(serialized.includes(key),false,key);
  const searched=await(await get('users?q='+encodeURIComponent(legacy.email))).json();assert.equal(searched.members.length,1);assert.equal(searched.members[0].userId,legacy.id);
  await db.arenaMember.update({where:{id:legacyMember.id},data:{permissionProfileId:migrated.permissionProfile.id}});
  assert.equal((await(await post('delete',{profileId:created.profileId})).json()).profileId,created.profileId);assert.equal(await db.permissionProfile.count({where:{id:created.profileId}}),0);
  return {accessProfileId:migrated.permissionProfile.id};
 } finally {
  await db.arenaMember.update({where:{id:member.id},data:{role:member.role,permissionProfileId:member.permissionProfileId,viewPermissions:member.viewPermissions,editPermissions:member.editPermissions}});
  await db.accountActionToken.deleteMany({where:{id:{startsWith:tag},arenaId:{in:[arenaId,other.id]}}});await db.user.delete({where:{id:legacy.id}});
  await db.auditEvent.deleteMany({where:{arenaId:other.id}});await db.arena.delete({where:{id:other.id}});
 }
}
