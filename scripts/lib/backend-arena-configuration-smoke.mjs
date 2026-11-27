import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';

/** Uses only the parent disposable arena and restores its temporary staff permissions. */
export async function assertArenaConfigurationSmoke(db,origin,arenaId,cookie,staffId){
 const member=await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:staffId}});
 const before=await db.arena.findUniqueOrThrow({where:{id:arenaId}});
 const foreign=await db.arena.create({data:{name:'Configuration foreign disposable',slug:'config-foreign-'+randomUUID(),createdById:'goal-test'}});
 const query=(section,extra='')=>fetch(`${origin}/api/management/arena/configuration?section=${section}${extra}`,{headers:{cookie},redirect:'manual'});
 const post=(operation,fields={},file,requestOrigin='http://127.0.0.1:3014')=>fetch(`${origin}/api/management/arena/actions/${operation}`,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,Array.isArray(value)?value:[value]])),...(file?{file}:{})}),redirect:'manual'});
 const ok=async response=>{assert.equal(response.status,200);const body=await response.json();assert.equal(body.error,null,JSON.stringify(body));return body;};
 try{
  await db.arenaMember.update({where:{id:member.id},data:{role:'STAFF',permissionProfileId:null,viewPermissions:['arena:portal'],editPermissions:[]}});
  assert.equal((await query('data')).status,403);assert.equal((await query('integrations')).status,403);
  assert.equal((await post('portal-settings',{showBooking:'on'})).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{viewPermissions:['arena:portal','arena:settings'],editPermissions:['arena:portal','arena:settings']}});
  assert.equal((await query('portal','&arenaId='+foreign.id)).status,400);assert.equal((await query('portal','&section=data')).status,400);
  assert.equal((await post('announcement-create',{title:'Notice',message:'Text',linkUrl:'',startsAt:'',endsAt:''},undefined,'https://foreign.invalid')).status,403);
  assert.equal((await post('portal-settings',{arenaId:foreign.id})).status,400);
  assert.equal((await post('portal-settings',{showBooking:['on','on']})).status,400);
  const logo={name:'fixture.png',type:'image/png',base64:(await sharp({create:{width:16,height:16,channels:4,background:'#16834e'}}).png().toBuffer()).toString('base64')};
  const profile={name:'Configuration Test '+randomUUID(),legalName:'Private legal identity',cnpj:'',phone:'41900000000',email:'fixture@example.test',address:'',city:'',state:'',zipCode:''};
  await ok(await post('profile',profile,logo));const renamed=await db.arena.findUniqueOrThrow({where:{id:arenaId}});assert.equal(renamed.name,profile.name);assert.ok(renamed.logoUrl);assert.equal((await db.arenaPublicSlug.findUniqueOrThrow({where:{slug:before.slug}})).arenaId,arenaId);
  await ok(await post('profile',profile));assert.equal((await db.arena.findUniqueOrThrow({where:{id:arenaId}})).logoUrl,renamed.logoUrl);
  const invalid=await(await post('profile',profile,{...logo,base64:Buffer.from('<svg/>').toString('base64')})).json();assert.ok(invalid.error);assert.equal((await db.arena.findUniqueOrThrow({where:{id:arenaId}})).logoUrl,renamed.logoUrl);
  await ok(await post('portal-settings',{showBooking:'on',showLeagues:'on'},logo));await ok(await post('portal-settings',{showBooking:'on'}));
  const settings=await db.arena.findUniqueOrThrow({where:{id:arenaId}});assert.equal(settings.athletePortalShowBooking,true);assert.equal(settings.athletePortalShowLeagues,false);assert.ok(settings.athletePortalLogoUrl);
  const foreignNotice=await db.portalAnnouncement.create({data:{arenaId:foreign.id,title:'Foreign notice',message:'Private'}});
  for(const operation of ['announcement-toggle','announcement-pin','announcement-delete'])assert.equal((await post(operation,{announcementId:foreignNotice.id})).status,400);
  assert.equal((await post('announcement-create',{title:'Notice',message:'Text',linkUrl:'javascript:alert(1)',startsAt:'',endsAt:''})).status,400);
  await ok(await post('announcement-create',{title:'Configuration Notice',message:'Contract content',linkUrl:'https://example.test',startsAt:'',endsAt:'',pinned:'on'}));
  const notice=await db.portalAnnouncement.findFirstOrThrow({where:{arenaId,title:'Configuration Notice'}});await ok(await post('announcement-toggle',{announcementId:notice.id}));await ok(await post('announcement-pin',{announcementId:notice.id}));assert.equal((await db.portalAnnouncement.findUniqueOrThrow({where:{id:notice.id}})).active,false);
  const event=await db.calendarEvent.create({data:{arenaId,title:'Configuration event',scheduledAt:new Date()}});const foreignEvent=await db.calendarEvent.create({data:{arenaId:foreign.id,title:'Foreign event',scheduledAt:new Date()}});
  await ok(await post('calendar-feature',{calendarEventId:event.id}));assert.equal((await db.calendarEvent.findUniqueOrThrow({where:{id:event.id}})).featuredInPortal,true);assert.equal((await post('calendar-feature',{calendarEventId:foreignEvent.id})).status,400);
  await ok(await post('post-create',{title:'Configuration Post',caption:'Content',linkUrl:''},logo));let article=await db.portalEventPost.findFirstOrThrow({where:{arenaId,title:'Configuration Post'}});assert.match(article.imageUrl,/\.webp$/);
  await ok(await post('post-update',{eventPostId:article.id,title:'Updated Post',caption:'Edited',linkUrl:'https://example.test'}));await ok(await post('post-toggle',{eventPostId:article.id}));await ok(await post('post-pin',{eventPostId:article.id}));await ok(await post('post-image',{eventPostId:article.id},logo));
  article=await db.portalEventPost.findUniqueOrThrow({where:{id:article.id}});assert.equal(article.active,false);assert.equal(article.pinned,true);assert.equal(article.title,'Updated Post');
  const foreignPost=await db.portalEventPost.create({data:{arenaId:foreign.id,title:'Private post',imageUrl:'https://example.test/private'}});
  for(const operation of ['post-toggle','post-pin','post-delete','post-image']){const result=await(await post(operation,{eventPostId:foreignPost.id},operation==='post-image'?logo:undefined)).json();assert.ok(result.error);}
  const portalResponse=await query('portal');assert.equal(portalResponse.headers.get('cache-control'),'private, no-store');const portal=await portalResponse.json();assert.equal(portal.profile,null);assert.equal(portal.connection,null);assert.equal(portal.posts.some(row=>row.id===foreignPost.id),false);assert.equal(JSON.stringify(portal).includes(profile.legalName),false);
  await db.whatsAppConnection.create({data:{arenaId,instanceName:'config-'+randomUUID(),encryptedToken:'PRIVATE_PROVIDER_TOKEN',lastError:'PRIVATE_PROVIDER_TOKEN endpoint debug',qrCodeDataUrl:'https://private.invalid'}});
  assert.equal((await post('agent-create',{name:'Contract key',scopes:['agents:read'],days:'30'})).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{role:'ADMIN'}});
  const connection=await(await query('integrations')).json();assert.equal(JSON.stringify(connection).includes('PRIVATE_PROVIDER_TOKEN'),false);assert.equal(connection.connection.qrCodeDataUrl,'');
  assert.ok((await(await post('agent-create',{name:'Contract key',scopes:['unrecognized'],days:'30'})).json()).error);
  const created=await ok(await post('agent-create',{name:'Contract key',scopes:['agents:read'],days:'30'}));assert.match(created.secret,/^arena_[a-f0-9]{64}$/);
  const key=await db.agentApiKey.findFirstOrThrow({where:{arenaId,name:'Contract key'}});assert.equal(key.tokenHash,createHash('sha256').update(created.secret).digest('hex'));assert.equal(key.prefix,created.secret.slice(0,14));
  const list=await fetch(`${origin}/api/management/arena/agent-keys`,{headers:{cookie}});assert.equal(list.status,200);const listText=await list.text();assert.equal(listText.includes(created.secret),false);assert.equal(listText.includes('tokenHash'),false);
  assert.equal((await fetch(`${origin}/api/agents/agents`,{headers:{authorization:'Bearer '+created.secret}})).status,200);
  const foreignKey=await db.agentApiKey.create({data:{arenaId:foreign.id,name:'Foreign key',prefix:'foreign',tokenHash:randomUUID(),scopes:['agents:read'],expiresAt:new Date(Date.now()+3600000)}});assert.equal((await post('agent-revoke',{keyId:foreignKey.id})).status,400);
  const revoked=await Promise.all([post('agent-revoke',{keyId:key.id}),post('agent-revoke',{keyId:key.id})]);assert.equal(revoked.filter(row=>row.status===200).length,1);assert.equal(await db.auditEvent.count({where:{arenaId,entityId:key.id,action:'AGENT_KEY_REVOKED'}}),1);
  assert.ok([401,403].includes((await fetch(`${origin}/api/agents/agents`,{headers:{authorization:'Bearer '+created.secret}})).status));
  await ok(await post('announcement-delete',{announcementId:notice.id}));await ok(await post('post-delete',{eventPostId:article.id}));assert.equal(await db.portalAnnouncement.count({where:{id:notice.id}}),0);assert.equal(await db.portalEventPost.count({where:{id:article.id}}),0);
  // Restore the parent's identifying slug so its ownership-checked cleanup remains valid.
  await db.arena.update({where:{id:arenaId},data:{name:before.name,slug:before.slug}});
 } finally{
  await db.arena.update({where:{id:arenaId},data:{name:before.name,slug:before.slug}});
  await db.arenaMember.update({where:{id:member.id},data:{role:member.role,permissionProfileId:member.permissionProfileId,viewPermissions:member.viewPermissions,editPermissions:member.editPermissions}});
  await db.arena.deleteMany({where:{id:foreign.id,slug:foreign.slug}});
 }
}
