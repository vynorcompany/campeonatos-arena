import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function assertAssistantSmoke(db,origin,arenaId,cookie,staffId) {
 const tag='AssistantContract'+randomUUID().replace(/-/g,'');
 const member=await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:staffId}});
 const other=await db.arena.create({data:{name:'Assistant foreign disposable',slug:'assistant-foreign-'+randomUUID(),createdById:'goal-test'}});
 const own=await db.assistantConversation.create({data:{arenaId,userId:staffId}});
 const foreign=await db.assistantConversation.create({data:{arenaId:other.id,userId:staffId}});
 const colleague=await db.assistantConversation.create({data:{arenaId,userId:tag}});
 await db.assistantMessage.createMany({data:[{conversationId:foreign.id,role:'USER',content:'FOREIGN_PRIVATE_'+tag},{conversationId:colleague.id,role:'USER',content:'COLLEAGUE_PRIVATE_'+tag},...Array.from({length:82},(_,i)=>({conversationId:own.id,role:'USER',content:tag+'-'+i,createdAt:new Date(Date.now()-200000+i*1000)}))]});
 const client=await db.player.create({data:{arenaId,name:'Cliente Assistente '+tag}});
 const duplicateName='Duplicado Assistente '+tag;
 await db.player.createMany({data:[{arenaId,name:duplicateName},{arenaId,name:duplicateName}]});
 const read=(suffix='')=>fetch(origin+'/api/management/assistant'+suffix,{headers:{cookie},redirect:'manual'});
 const post=(input,requestOrigin='http://127.0.0.1:3014',extra={})=>fetch(origin+'/api/management/assistant/command',{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({input,...extra}),redirect:'manual'});
 const command='Crie uma fatura no valor de 12,50 para o cliente '+client.name+'.';
 try {
  assert.equal((await fetch(origin+'/api/management/assistant',{redirect:'manual'})).status,307);
  assert.equal((await read()).status,403);assert.equal((await post(command)).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{role:'ADMIN',permissionProfileId:null,viewPermissions:[],editPermissions:[]}});
  assert.equal((await read('?userId='+tag)).status,400);
  const response=await read();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
  const history=await response.json();assert.equal(history.messages.length,80);assert.equal(history.messages[0].content,tag+'-0');assert.equal(history.messages[79].content,tag+'-79');
  for(const secret of ['FOREIGN_PRIVATE_','COLLEAGUE_PRIVATE_','conversationId','userId'])assert.equal(JSON.stringify(history).includes(secret),false);
  await db.assistantMessage.deleteMany({where:{conversationId:own.id}});
  assert.equal((await post(command,'https://foreign.invalid')).status,403);
  assert.equal((await post(command,undefined,{arenaId:other.id})).status,400);
  assert.equal((await post('x'.repeat(20000))).status,413);assert.equal((await post('x'.repeat(2001))).status,400);assert.equal((await post('   ')).status,400);
  assert.equal((await post(command)).status,403);assert.equal((await post('Quais clientes foram cadastrados hoje?')).status,403);
  assert.equal(await db.assistantCommand.count({where:{arenaId}}),0);assert.equal(await db.assistantMessage.count({where:{conversationId:own.id}}),0);
  await db.arenaMember.update({where:{id:member.id},data:{viewPermissions:['players:view'],editPermissions:['finance:receivable:create']}});
  const unsupported=await(await post('Faça um café agora.')).json();assert.equal(unsupported.ok,false);assert.equal(unsupported.refreshFinance,undefined);
  const missing=await(await post('Crie uma fatura no valor de 12,50 para o cliente Nome Inexistente '+tag+'.')).json();assert.equal(missing.ok,false);
  const duplicate=await(await post('Crie uma fatura no valor de 12,50 para o cliente '+duplicateName+'.')).json();assert.equal(duplicate.ok,false);assert.match(duplicate.message,/mais de um/);
  const readReply=await(await post('Quais clientes foram cadastrados hoje?')).json();assert.equal(readReply.ok,true);
  const result=await(await post(command)).json();assert.equal(result.ok,true);assert.equal(result.refreshFinance,true);assert.match(result.message,/12,50/);
  const entry=await db.financialEntry.findFirstOrThrow({where:{arenaId,source:'ASSISTANT'}});assert.equal(entry.amountCents,1250);assert.equal(entry.playerId,client.id);assert.equal(entry.status,'PENDING');
  const audit=await db.assistantCommand.findUniqueOrThrow({where:{id:entry.externalReference}});assert.equal(audit.requestedByUserId,staffId);assert.equal(audit.conversationId,own.id);assert.equal(audit.status,'EXECUTED');assert.equal(audit.targetId,entry.id);assert.ok(audit.executedAt);
  assert.equal(await db.financialEntry.count({where:{arenaId,source:'ASSISTANT'}}),1);assert.equal(await db.financialSettlement.count({where:{financialEntryId:entry.id}}),0);
  const finalHistory=await(await read()).json();assert.equal(finalHistory.messages.length,10);assert.equal(finalHistory.messages.at(-1).content,result.message);
  return {assistantClientId:client.id};
 } finally {
  await db.arenaMember.update({where:{id:member.id},data:{role:member.role,permissionProfileId:member.permissionProfileId,viewPermissions:member.viewPermissions,editPermissions:member.editPermissions}});
  await db.auditEvent.deleteMany({where:{arenaId:other.id}});await db.arena.delete({where:{id:other.id}});
 }
}
