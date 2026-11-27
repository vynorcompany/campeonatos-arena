import assert from 'node:assert/strict';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { createAgencyPagesFixture, cleanupAgencyPagesFixture } from './backend-agency-pages-smoke.mjs';
function encryptedFixture() {const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',createHash('sha256').update('synthetic-backend-contract-key-not-for-production').digest(),iv);const bytes=Buffer.concat([cipher.update(JSON.stringify({token:'synthetic-evolution-api-key'})),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64url');}
/** @param {import('@prisma/client').PrismaClient} db */
export async function assertWhatsAppActionsSmoke(db,origin,frontendOrigin,provider) {
 const f=await createAgencyPagesFixture(db),accountJid='5541999996300@s.whatsapp.net',instance=f.connection.instanceName;
 const member={userId_arenaId:{userId:f.users[1].id,arenaId:f.arenas[0].id}};
 const post=(operation,input={},cookie=f.viewer.cookie,requestOrigin=frontendOrigin)=>{const form=input instanceof FormData?input:new FormData();if(!(input instanceof FormData))for(const[key,value]of Object.entries(input))form.set(key,String(value));return fetch(`${origin}/api/management/whatsapp/actions/${operation}`,{method:'POST',headers:{...(cookie?{cookie}:{}),origin:requestOrigin},body:form,redirect:'manual'});};
 const ok=async(operation,input={})=>{const response=await post(operation,input);assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');const text=await response.text();for(const marker of ['private-agency-token','private-provider-payload','encryptedToken','senderUserId','PRIVATE_PROVIDER_TOKEN'])assert.equal(text.includes(marker),false,marker);const result=JSON.parse(text);assert.equal(result.error,null,text);return result.result;};
 try {
  await db.arenaMember.update({where:member,data:{role:'STAFF',viewPermissions:['support'],editPermissions:[]}});
  await db.whatsAppConnection.update({where:{id:f.connection.id},data:{connectedPhone:accountJid,encryptedToken:encryptedFixture()}});
  provider.instances.set(instance,{instanceName:instance,state:'OPEN',ownerJid:accountJid});
  const own=await db.whatsAppConversation.create({data:{arenaId:f.arenas[0].id,accountJid,remoteJid:'5511000000001@s.whatsapp.net',contactPhone:'5511000000001',contactName:'Contato API WhatsApp',unreadCount:2}});
  const old=await db.whatsAppConversation.create({data:{arenaId:f.arenas[0].id,accountJid:'old@s.whatsapp.net',remoteJid:'5511000000002@s.whatsapp.net',contactPhone:'5511000000002'}});
  const foreign=await db.whatsAppConversation.create({data:{arenaId:f.arenas[1].id,accountJid,remoteJid:'5511000000003@s.whatsapp.net',contactPhone:'5511000000003'}});
  const ownPlayer=await db.player.create({data:{arenaId:f.arenas[0].id,name:'Cliente API WhatsApp',phone:'11999996201'}}),foreignPlayer=await db.player.create({data:{arenaId:f.arenas[1].id,name:'private-foreign-player',phone:'11999996202'}});
  assert.equal((await post('read',{conversationId:own.id},'')).status,303);
  assert.equal((await post('read',{conversationId:own.id},f.viewer.cookie,'https://evil.test')).status,403);
  assert.equal((await post('send-text',{conversationId:own.id,body:'Forbidden'})).status,403);
  assert.equal((await post('sla',{minutes:30})).status,403);
  assert.equal((await post('unknown')).status,404);
  await ok('read',{conversationId:own.id});assert.equal((await db.whatsAppConversation.findUniqueOrThrow({where:{id:own.id}})).unreadCount,0);
  assert.equal((await ok('profile-photo',{conversationId:own.id})).profilePhotoUrl,'/favicon.ico');assert.equal((await ok('group-name',{conversationId:own.id})).name,'');
  for(const input of [{conversationId:own.id,arenaId:f.arenas[1].id},{conversationId:own.id,senderUserId:'forged'}])assert.equal((await post('read',input)).status,400);
  const repeated=new FormData();repeated.append('conversationId',own.id);repeated.append('conversationId',foreign.id);assert.equal((await post('read',repeated)).status,400);
  assert.equal((await post('read',{conversationId:'x'.repeat(140000)})).status,413);
  await db.arenaMember.update({where:member,data:{editPermissions:['support:whatsapp:send']}});
  assert.equal((await post('create-contact',{name:'Blocked',phone:'41999996201'})).status,403);
  const before=provider.requests.filter(row=>row.path.startsWith('/message/')).length;
  for(const id of [old.id,foreign.id]){const response=await post('send-text',{conversationId:id,body:'Never send'});assert.equal(response.status,200);assert.ok((await response.json()).error);}
  assert.equal(provider.requests.filter(row=>row.path.startsWith('/message/')).length,before);
  const opened=await ok('open-player',{playerId:ownPlayer.id});assert.ok(opened.id);const foreignOpen=await ok('open-player',{playerId:foreignPlayer.id});assert.equal(foreignOpen.error,'Cliente não encontrado nesta arena.');
  await ok('open-contact',{accountJid,remoteJid:'5511000000010@s.whatsapp.net',name:'Contato escolhido'});
  const text=await ok('send-text',{conversationId:own.id,body:'Mensagem HTTP fictícia'});assert.ok(text.id);
  const audio=new FormData();audio.set('conversationId',own.id);audio.set('audio',new File(['synthetic audio'],'audio.webm',{type:'audio/webm'}));await ok('send-audio',audio);
  const media=new FormData();media.set('conversationId',own.id);media.set('file',new File(['synthetic PDF'],'arquivo.pdf',{type:'application/pdf'}));media.set('caption','Legenda fictícia');await ok('send-media',media);
  await ok('react',{messageId:text.id,emoji:'👍'});
  await ok('send-text',{conversationId:own.id,body:'Resposta fictícia',replyToId:text.id});
  const audioRequest=provider.requests.find(row=>row.path==='/message/sendWhatsAppAudio/'+instance);assert.equal(audioRequest.body.audio,'data:audio/webm;base64,'+Buffer.from('synthetic audio').toString('base64'));
  const mediaRequest=provider.requests.find(row=>row.path==='/message/sendMedia/'+instance);assert.equal(mediaRequest.body.fileName,'arquivo.pdf');assert.equal(mediaRequest.body.caption,'Legenda fictícia');assert.equal(mediaRequest.body.mimetype,'application/pdf');
  const replyRequest=provider.requests.filter(row=>row.path==='/message/sendText/'+instance).at(-1);assert.ok(replyRequest.body.quoted.key.id);assert.equal(replyRequest.body.quoted.key.fromMe,true);
  const stored=await db.whatsAppMessage.findUniqueOrThrow({where:{id:text.id}});assert.equal(stored.senderUserId,f.users[1].id);assert.equal(stored.senderName,f.users[1].name);
  const foreignMessage=await db.whatsAppMessage.create({data:{conversationId:foreign.id,providerId:'private-foreign-message',direction:'INBOUND',body:'private-provider-payload'}});
  const quoted=await post('send-text',{conversationId:own.id,body:'Invalid quote',replyToId:foreignMessage.id});assert.ok((await quoted.json()).error);
  const rejectedMediaBefore=provider.requests.filter(row=>row.path==='/message/sendMedia/'+instance).length;
  provider.setFailure(true,400);try {const rejected=await post('send-media',media);const body=await rejected.json();assert.equal(body.error,'A Evolution recusou o envio do anexo (400).');assert.equal(JSON.stringify(body).includes('PRIVATE_PROVIDER_TOKEN'),false);} finally {provider.setFailure(false);}
  assert.equal(provider.requests.filter(row=>row.path==='/message/sendMedia/'+instance).length,rejectedMediaBefore+2);
  const failuresBefore=provider.requests.filter(row=>row.path==='/message/sendText/'+instance).length;
  provider.setFailure(true);try {const uncertain=await post('send-text',{conversationId:own.id,body:'Failure once'});const body=await uncertain.json();assert.equal(body.error,'Não foi possível confirmar a operação. Atualize a conversa antes de tentar novamente.');} finally {provider.setFailure(false);}
  assert.equal(provider.requests.filter(row=>row.path==='/message/sendText/'+instance).length,failuresBefore+1);
  await db.arenaMember.update({where:member,data:{editPermissions:['support:whatsapp:manage']}});
  const created=await ok('create-contact',{name:'cliente teste',phone:'41999996203'});assert.equal(created.name,'Cliente Teste');
  await ok('link-client',{conversationId:own.id,playerId:created.id});await ok('sla',{minutes:45});assert.equal((await db.arena.findUniqueOrThrow({where:{id:f.arenas[0].id}})).whatsappSlaMinutes,45);
  for(const action of ['pin','favorite','archive','list','unread','resolve_sla'])await ok('conversation',{conversationId:own.id,action,listName:'Lista API'});
  provider.contacts.set(instance,[{id:own.remoteJid,name:'Nome sincronizado'}]);const sync=await ok('sync-contacts');assert.equal(sync.contacts[0].name,'Nome sincronizado');assert.equal(sync.accountJid,accountJid);assert.ok(sync.updated>=1);
  const group=await db.whatsAppConversation.create({data:{arenaId:f.arenas[0].id,accountJid,remoteJid:'synthetic-group@g.us'}});assert.equal((await ok('group-name',{conversationId:group.id})).name,'Grupo fictício backend');
  await ok('conversation',{conversationId:own.id,action:'clear'});assert.equal(await db.whatsAppMessage.count({where:{conversationId:own.id}}),0);await ok('conversation',{conversationId:group.id,action:'delete'});assert.equal(await db.whatsAppConversation.count({where:{id:group.id}}),0);
  assert.equal(await db.whatsAppConversation.count({where:{id:{in:[old.id,foreign.id]}}}),2);
  console.log('WhatsApp actions HTTP: permission tiers, multipart/files, Origin/strict fields, arena/account/quote isolation, attributed text/audio/PDF/reaction, uncertain send, contacts/SLA/clear/delete and preservation passed with loopback provider only.');
 } finally {provider.setFailure(false);provider.instances.delete(instance);provider.contacts.delete(instance);await cleanupAgencyPagesFixture(db,f);}
}
