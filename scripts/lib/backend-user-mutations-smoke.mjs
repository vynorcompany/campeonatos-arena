import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import bcrypt from 'bcryptjs';
export async function assertUserMutationsSmoke(db,origin,arenaId,cookie,staffId) {
 const member=await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:staffId}});const users=[];const arenas=[];const profiles=[];
 const initial='UserContractInitial123!';const hash=await bcrypt.hash(initial,12);
 const createUser=async(name,memberships=[])=>{const user=await db.user.create({data:{name,email:randomUUID()+'@example.test',passwordHash:hash,systemRole:'VIEWER',...(memberships.length?{memberships:{create:memberships}}:{})}});users.push(user.id);const raw=randomUUID();await db.session.create({data:{userId:user.id,token:createHash('sha256').update(raw).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});return{...user,cookie:`padel_session=${raw}${memberships.length?'; padel_arena='+memberships[0].arenaId:''}`};};
 const post=(operation,body,authCookie=cookie,requestOrigin='http://127.0.0.1:3014')=>fetch(`${origin}/api/management/access/users/actions/${operation}`,{method:'POST',headers:{cookie:authCookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
 try {
  const other=await db.arena.create({data:{name:'User foreign disposable',slug:'user-foreign-'+randomUUID(),createdById:'goal-test'}});arenas.push(other.id);
  const profile=await db.permissionProfile.create({data:{arenaId,name:'User profile '+randomUUID(),viewPermissions:['calendar:view'],editPermissions:[]}});
  profiles.push(profile.id);
  const foreignProfile=await db.permissionProfile.create({data:{arenaId:other.id,name:'Foreign user profile '+randomUUID()}});
  const target=await createUser('Local User Contract',[{arenaId,role:'STAFF'}]);
  const shared=await createUser('Shared User Contract',[{arenaId,role:'STAFF'},{arenaId:other.id,role:'STAFF'}]);
  const outsider=await createUser('Foreign User Contract',[{arenaId:other.id,role:'STAFF'}]);
  const owner=await createUser('Owner User Contract',[{arenaId,role:'OWNER'}]);
  const body={userId:target.id,name:'Local User Atualizado',email:('UPPER-'+randomUUID()+'@EXAMPLE.TEST'),arenaRole:'STAFF',permissionProfileId:profile.id};
  // Arena management cannot forge scope or alter privileged owners.
  assert.equal((await post('update',body)).status,403);assert.equal((await post('remove',{userId:target.id})).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{role:'ADMIN'}});
  assert.equal((await post('update',body,cookie,'https://foreign.invalid')).status,403);
  assert.equal((await post('update',{...body,arenaId:other.id})).status,400);
  assert.equal((await post('update',{...body,permissionProfileId:foreignProfile.id})).status,400);
  assert.equal((await post('update',{...body,userId:outsider.id})).status,400);
  assert.equal((await post('remove',{userId:outsider.id})).status,400);
  assert.equal((await post('role',{userId:owner.id,arenaRole:'ADMIN'})).status,400);
  assert.equal((await post('remove',{userId:owner.id})).status,400);
  assert.deepEqual(await(await post('update',body)).json(),{error:null,success:null});
  const changed=await db.user.findUniqueOrThrow({where:{id:target.id}});assert.equal(changed.name,body.name);assert.equal(changed.email,body.email.toLowerCase());assert.equal(changed.passwordHash,hash);
  const targetMember=await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:target.id}});assert.equal(targetMember.permissionProfileId,profile.id);assert.deepEqual(targetMember.viewPermissions,['calendar:view']);
  assert.equal((await post('update',{...body,email:owner.email})).status,400);assert.equal((await db.user.findUniqueOrThrow({where:{id:target.id}})).email,body.email.toLowerCase());
  // A shared account keeps its global identity and foreign membership.
  assert.equal((await post('update',{...body,userId:shared.id,name:'Changed Global Identity',email:shared.email})).status,400);
  assert.deepEqual(await(await post('update',{...body,userId:shared.id,name:shared.name,email:shared.email})).json(),{error:null,success:null});
  assert.deepEqual(await(await post('remove',{userId:shared.id})).json(),{error:null,success:null});
  assert.equal(await db.arenaMember.count({where:{arenaId,userId:shared.id}}),0);assert.equal(await db.arenaMember.count({where:{arenaId:other.id,userId:shared.id}}),1);assert.equal((await db.user.findUniqueOrThrow({where:{id:shared.id}})).name,shared.name);
  assert.equal((await post('remove',{userId:owner.id},owner.cookie)).status,400);
  assert.equal((await post('role',{userId:owner.id,arenaRole:'STAFF'},owner.cookie)).status,400);
  const role=await post('role',{userId:target.id,arenaRole:'VIEWER'},owner.cookie);assert.equal(role.status,200);assert.equal((await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:target.id}})).role,'VIEWER');
  // Self-service remains available to a signed-in identity without an arena.
  const self=await createUser('Self User Contract');
  assert.equal((await post('own-profile',{name:'Self Changed Contract',userId:target.id},self.cookie)).status,400);
  assert.deepEqual(await(await post('own-profile',{name:'Self Changed Contract'},self.cookie)).json(),{error:null,success:'Seu perfil foi atualizado.'});
  assert.equal((await db.user.findUniqueOrThrow({where:{id:self.id}})).name,'Self Changed Contract');
  const extraSession=await db.session.create({data:{userId:self.id,token:createHash('sha256').update(randomUUID()).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
  const reset=await db.accountActionToken.create({data:{userId:self.id,email:self.email,kind:'RESET',tokenHash:randomUUID(),expiresAt:new Date(Date.now()+3600000)}});
  const invite=await db.accountActionToken.create({data:{userId:self.id,email:self.email,kind:'INVITE',tokenHash:randomUUID(),expiresAt:new Date(Date.now()+3600000)}});
  const foreignReset=await db.accountActionToken.create({data:{userId:owner.id,email:owner.email,kind:'RESET',tokenHash:randomUUID(),expiresAt:new Date(Date.now()+3600000)}});
  const password={currentPassword:initial,newPassword:'UserContractUpdated123!',confirmPassword:'UserContractUpdated123!'};
  const wrong=await(await post('own-password',{...password,currentPassword:'wrong'},self.cookie)).json();assert.ok(wrong.error);assert.equal(await db.session.count({where:{userId:self.id}}),2);assert.equal((await db.accountActionToken.findUniqueOrThrow({where:{id:reset.id}})).usedAt,null);
  assert.ok((await(await post('own-password',{...password,confirmPassword:'Mismatch123!'},self.cookie)).json()).error);
  const success=await(await post('own-password',password,self.cookie)).json();assert.equal(success.error,null);assert.equal(JSON.stringify(success).includes('passwordHash'),false);
  const final=await db.user.findUniqueOrThrow({where:{id:self.id}});assert.match(final.passwordHash,/^\$2[ab]\$12\$/);assert.ok(await bcrypt.compare(password.newPassword,final.passwordHash));assert.equal(await bcrypt.compare(initial,final.passwordHash),false);
  assert.equal(await db.session.count({where:{userId:self.id}}),0);assert.ok((await db.accountActionToken.findUniqueOrThrow({where:{id:reset.id}})).usedAt);assert.equal((await db.accountActionToken.findUniqueOrThrow({where:{id:invite.id}})).usedAt,null);assert.equal((await db.accountActionToken.findUniqueOrThrow({where:{id:foreignReset.id}})).usedAt,null);assert.equal(await db.session.count({where:{id:extraSession.id}}),0);
  assert.equal((await post('own-profile',{name:'Rejected Old Session'},self.cookie)).status,307);
  // A stale password comparison cannot win twice or preserve old sessions.
  const concurrent=await createUser('Concurrent Password Contract');
  const passwordReplies=await Promise.all(['ConcurrentFirst123!','ConcurrentSecond123!'].map(value=>post('own-password',{currentPassword:initial,newPassword:value,confirmPassword:value},concurrent.cookie)));
  const outcomes=await Promise.all(passwordReplies.map(async r=>r.status===200?r.json():{error:'expired'}));assert.equal(outcomes.filter(row=>row.error===null).length,1);assert.equal(await db.session.count({where:{userId:concurrent.id}}),0);
  const concurrentHash=(await db.user.findUniqueOrThrow({where:{id:concurrent.id}})).passwordHash;assert.equal(Number(await bcrypt.compare('ConcurrentFirst123!',concurrentHash))+Number(await bcrypt.compare('ConcurrentSecond123!',concurrentHash)),1);
  // Two authenticated owners cannot concurrently leave the arena ownerless.
  const race=await db.arena.create({data:{name:'Last owner race disposable',slug:'last-owner-'+randomUUID(),createdById:'goal-test'}});arenas.push(race.id);
  const ownerA=await createUser('Race Owner Alpha',[{arenaId:race.id,role:'OWNER'}]);const ownerB=await createUser('Race Owner Beta',[{arenaId:race.id,role:'OWNER'}]);
  const replies=await Promise.all([post('remove',{userId:ownerB.id},ownerA.cookie),post('remove',{userId:ownerA.id},ownerB.cookie)]);
  assert.equal(replies.filter(r=>r.status===200).length,1);assert.equal(await db.arenaMember.count({where:{arenaId:race.id,role:'OWNER'}}),1);
  return {userMutationTargetId:target.id};
 } finally {
  await db.arenaMember.update({where:{id:member.id},data:{role:member.role,permissionProfileId:member.permissionProfileId,viewPermissions:member.viewPermissions,editPermissions:member.editPermissions}});
  await db.accountActionToken.deleteMany({where:{userId:{in:users}}});await db.auditEvent.deleteMany({where:{OR:[{actorId:{in:users}},{arenaId:{in:arenas}}]}});
  await db.arena.deleteMany({where:{id:{in:arenas}}});await db.user.deleteMany({where:{id:{in:users}}});await db.permissionProfile.deleteMany({where:{arenaId,id:{in:profiles}}});
 }
}
