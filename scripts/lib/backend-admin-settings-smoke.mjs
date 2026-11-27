import { createForeignArenaFixture } from './backend-foreign-fixtures.mjs';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
export async function assertAdminSettingsSmoke(db,origin,arenaId,cookie,staffId) {
 const member=await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:staffId}});
 const get=(area,suffix='')=>fetch(`${origin}/api/management/settings/${area}${suffix}`,{headers:{cookie}});
 const post=(operation,fields,requestOrigin='http://127.0.0.1:3014')=>fetch(`${origin}/api/management/settings/actions/${operation}`,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({fields})});
 const player=await db.player.create({data:{arenaId,name:'Titular privacidade sintético',phone:'41900000555'}});
 const request=await db.privacyRequest.create({data:{arenaId,playerId:player.id,kind:'ACCESS',message:'Solicitação sintética de acesso aos próprios dados.'}});
 const erasure=await db.privacyRequest.create({data:{arenaId,playerId:player.id,kind:'ERASURE',status:'COMPLETED',response:'Encerramento sintético sem alterar o histórico financeiro.'}});
 const hash=createHash('sha256').update(randomUUID()).digest('hex');
 const reference=await db.erasedContactReference.create({data:{arenaId,playerId:player.id,contactHash:hash}});
 const receivable=await db.financialEntry.create({data:{arenaId,playerId:player.id,type:'REVENUE',category:'Teste',description:'Histórico preservado privacidade',amountCents:8900,status:'PENDING'}});
 const other=await createForeignArenaFixture(db, 'admin-settings');
 const otherPlayer=await db.player.create({data:{arenaId:other.id,name:'Foreign privacy holder fixture'},select:{id:true}});
 const foreign=await db.privacyRequest.create({data:{arenaId:other.id,playerId:otherPlayer.id,kind:'ACCESS',message:'Foreign request '+randomUUID()}});
 try {
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:[]}});
  assert.equal((await get('printer')).status,404);assert.equal((await get('privacy')).status,404);assert.equal((await post('printer',{printerPaper:'A4',printerCopies:'2'})).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['arena:settings']}});
  for(const area of ['printer','policies','privacy']){const response=await get(area);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');const text=await response.text();for(const value of ['encryptedFocusTokens','contactHash',hash,foreign.message])assert.equal(text.includes(value),false);}
  assert.equal((await get('privacy','?arenaId='+other.id)).status,400);assert.equal((await get('privacy','?q=a&q=b')).status,400);assert.equal((await get('printer','?q=unexpected')).status,400);
  assert.equal((await post('printer',{printerPaper:'A4',printerCopies:'2'},'https://foreign.invalid')).status,403);assert.equal((await post('printer',{printerPaper:'A4',printerCopies:'2',arenaId:other.id})).status,400);
  assert.ok((await(await post('printer',{printerPaper:'A4',printerCopies:'4'})).json()).error);
  assert.deepEqual(await(await post('printer',{printerPaper:'A4',printerCopies:'2'})).json(),{error:null});
  const printer=await db.arenaOperationalSettings.findUniqueOrThrow({where:{arenaId}});assert.equal(printer.printerPaper,'A4');assert.equal(printer.printerCopies,2);
  assert.ok((await(await post('policies',{cancellationPolicy:'Curta',cancellationPolicyPublished:'on'})).json()).error);
  const policy='Condições sintéticas de cancelamento e reembolso para validar preservação do texto.';
  assert.deepEqual(await(await post('policies',{cancellationPolicy:policy,cancellationPolicyPublished:'on'})).json(),{error:null});
  const policyAt=(await db.arenaOperationalSettings.findUniqueOrThrow({where:{arenaId}})).cancellationPolicyUpdatedAt;
  assert.deepEqual(await(await post('policies',{cancellationPolicy:policy,cancellationPolicyPublished:'on'})).json(),{error:null});
  assert.equal((await db.arenaOperationalSettings.findUniqueOrThrow({where:{arenaId}})).cancellationPolicyUpdatedAt.getTime(),policyAt.getTime());assert.equal(await db.auditEvent.count({where:{arenaId,action:'CANCELLATION_POLICY_UPDATED',actorId:staffId}}),1);
  const filtered=await(await get('privacy','?q='+erasure.id)).json();assert.equal(filtered.references[0].id,reference.id);assert.equal(filtered.references[0].player.privacyRequests[0].id,erasure.id);assert.equal(filtered.requests.some(row=>row.id===foreign.id),false);
  assert.ok((await(await post('privacy-respond',{requestId:foreign.id,response:policy})).json()).error);
  assert.ok((await(await post('privacy-respond',{requestId:request.id,response:'Curta'})).json()).error);
  const replies=await Promise.all([post('privacy-respond',{requestId:request.id,response:policy}),post('privacy-respond',{requestId:request.id,response:policy})]);const outcomes=await Promise.all(replies.map(response=>response.json()));assert.equal(outcomes.filter(row=>row.error===null).length,1);assert.equal(await db.auditEvent.count({where:{arenaId,entityId:request.id,action:'PRIVACY_REQUEST_RESPONDED',actorId:staffId}}),1);assert.equal(await db.playerNotification.count({where:{playerId:player.id,title:'Resposta à sua solicitação de privacidade'}}),1);
  assert.ok((await(await post('privacy-release',{referenceId:reference.id,reason:policy,confirmRelease:'on'})).json()).error,'Privacy release requires the financial permission too');
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:['arena:settings','finance:settings:manage']}});
  assert.ok((await(await post('privacy-release',{referenceId:reference.id,reason:policy})).json()).error);
  assert.deepEqual(await(await post('privacy-release',{referenceId:reference.id,reason:policy,confirmRelease:'on'})).json(),{error:null});
  assert.equal(await db.erasedContactReference.count({where:{arenaId,id:reference.id}}),0);const preserved=await db.financialEntry.findUniqueOrThrow({where:{id:receivable.id}});assert.equal(preserved.amountCents,8900);assert.equal(preserved.status,'PENDING');assert.equal(await db.financialSettlement.count({where:{financialEntryId:receivable.id}}),0);assert.equal(await db.auditEvent.count({where:{arenaId,entityId:reference.id,action:'RETAINED_CONTACT_RELEASED',actorId:staffId}}),1);
  assert.equal((await db.privacyRequest.findUniqueOrThrow({where:{id:foreign.id}})).status,'OPEN');
 } finally {await db.privacyRequest.delete({where:{id:foreign.id}});await db.arenaMember.update({where:{id:member.id},data:{viewPermissions:member.viewPermissions,editPermissions:member.editPermissions}});}
}
export async function assertDeviceSessionsSmoke(db,origin,cookie,staffId) {
 const rawToken=cookie.match(/padel_session=([^;]+)/)[1];const current=await db.session.findFirstOrThrow({where:{userId:staffId,token:createHash('sha256').update(rawToken).digest('hex')},select:{id:true}});
 const own=await db.session.create({data:{userId:staffId,token:createHash('sha256').update(randomUUID()).digest('hex'),deviceLabel:'Dispositivo sintético revogável',expiresAt:new Date(Date.now()+3600000)}});
 const expired=await db.session.create({data:{userId:staffId,token:createHash('sha256').update(randomUUID()).digest('hex'),deviceLabel:'Dispositivo sintético vencido',expiresAt:new Date(Date.now()-3600000)}});
 const outsider=await db.user.create({data:{name:'Usuário sintético sem arena',email:randomUUID()+'@example.test',passwordHash:'unused-synthetic',systemRole:'VIEWER'}});const foreignRaw=randomUUID();const foreign=await db.session.create({data:{userId:outsider.id,token:createHash('sha256').update(foreignRaw).digest('hex'),deviceLabel:'Dispositivo de outro usuário sintético',expiresAt:new Date(Date.now()+3600000)}});
 const read=(authCookie=cookie,suffix='')=>fetch(`${origin}/api/management/devices${suffix}`,{headers:{cookie:authCookie},redirect:'manual'});
 const revoke=(id,requestOrigin='http://127.0.0.1:3014',extra={})=>fetch(`${origin}/api/management/devices/revoke`,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({sessionId:id,...extra})});
 try {
  const response=await read();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');const data=await response.json();assert.equal(data.currentId,current.id);assert.ok(data.sessions.some(row=>row.id===own.id));assert.equal(data.sessions.some(row=>row.id===foreign.id||row.id===expired.id),false);for(const key of ['token','userId','passwordHash'])assert.equal(JSON.stringify(data).includes('"'+key+'"'),false);
  assert.equal((await read(cookie,'?userId='+outsider.id)).status,400);assert.equal((await read('')).status,307);
  const noArena=await(await read('padel_session='+foreignRaw)).json();assert.equal(noArena.currentId,foreign.id);assert.equal(noArena.sessions.length,1);
  assert.equal((await revoke(own.id,'https://foreign.invalid')).status,403);assert.equal((await revoke(own.id,undefined,{userId:outsider.id})).status,400);
  assert.ok((await(await revoke(current.id)).json()).error);assert.ok((await(await revoke(foreign.id)).json()).error);
  assert.deepEqual(await(await revoke(own.id)).json(),{error:null});assert.equal(await db.session.count({where:{id:own.id}}),0);assert.equal(await db.session.count({where:{id:current.id}}),1);assert.equal(await db.session.count({where:{id:foreign.id}}),1);
 } finally {await db.session.deleteMany({where:{id:{in:[own.id,expired.id,foreign.id]}}});await db.user.delete({where:{id:outsider.id}});}
}
