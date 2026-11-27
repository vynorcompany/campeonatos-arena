import assert from 'node:assert/strict';
import { createAgencyPagesFixture, cleanupAgencyPagesFixture } from './backend-agency-pages-smoke.mjs';
/** @param {import('@prisma/client').PrismaClient} db */
export async function assertWhatsAppWorkspaceSmoke(db, origin, frontendOrigin) {
 const f = await createAgencyPagesFixture(db);
 const get = (query = '', cookie = f.viewer.cookie) => fetch(`${origin}/api/management/whatsapp/workspace${query}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
 try {
  await db.arenaMember.update({where:{userId_arenaId:{arenaId:f.arenas[0].id,userId:f.users[1].id}},data:{role:'STAFF',viewPermissions:[]}});
  assert.equal((await get()).status,403);
  await db.arenaMember.update({where:{userId_arenaId:{arenaId:f.arenas[0].id,userId:f.users[1].id}},data:{viewPermissions:['support']}});
  assert.equal((await get('', '')).status,307);
  for(const query of ['?arenaId=foreign','?userId=forged','?conversa=a&conversa=b','?conversa='+ 'x'.repeat(101)]) assert.equal((await get(query)).status,400);
  const accountJid='5541999996300@s.whatsapp.net';
  await db.whatsAppConnection.update({where:{id:f.connection.id},data:{connectedPhone:accountJid}});
  const own = await db.whatsAppConversation.create({data:{arenaId:f.arenas[0].id,accountJid,remoteJid:'5511000000001@s.whatsapp.net',contactName:'Contato fictício inbox',messages:{create:{providerId:'private-provider-id',direction:'IN',body:'Mensagem fictícia inbox',providerPayload:{secret:'private-provider-payload'},mediaUrl:'https://private.example.test/media'}}}});
  const old = await db.whatsAppConversation.create({data:{arenaId:f.arenas[0].id,accountJid:'old@s.whatsapp.net',remoteJid:'5511000000002@s.whatsapp.net',contactName:'private-old-account'}});
  const foreign = await db.whatsAppConversation.create({data:{arenaId:f.arenas[1].id,accountJid,remoteJid:'5511000000003@s.whatsapp.net',contactName:'private-foreign-arena'}});
  const response=await get('?conversa='+own.id);assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');assert.ok(response.headers.get('vary').includes('Cookie'));
  const text=await response.text();for(const marker of ['private-agency-token','private-agency-webhook','private-provider-payload','private-provider-id','private.example.test','private-old-account','private-foreign-arena','passwordHash']) assert.equal(text.includes(marker),false,marker);
  const data=JSON.parse(text);assert.equal(data.selectedConversationId,own.id);assert.equal(data.conversations.length,1);assert.equal(data.conversations[0].messages[0].body,'Mensagem fictícia inbox');assert.equal(data.conversations[0].messages[0].mediaUrl,'');assert.equal(data.currentAccountJid,accountJid);
  for(const id of [old.id,foreign.id]){const scoped=await get('?conversa='+id);assert.equal(scoped.status,200);assert.equal((await scoped.json()).selectedConversationId,'');}
  const page=await fetch(frontendOrigin+'/whatsapp?conversa='+own.id,{headers:{cookie:f.viewer.cookie},redirect:'manual'});assert.equal(page.status,200);assert.ok((await page.text()).includes('Contato fictício inbox'));
  await db.whatsAppConnection.update({where:{id:f.connection.id},data:{status:'DISCONNECTED'}});
  const disconnected=await get('?conversa='+own.id);assert.equal(disconnected.status,200);const empty=await disconnected.json();assert.equal(empty.connected,false);assert.equal(empty.initialVersion,'empty');assert.equal(empty.conversations.length,0);assert.equal(empty.selectedConversationId,'');
  console.log('WhatsApp inbox HTTP: support permission, authenticated strict query, arena/account isolation, minimal message DTO, disconnected account and SSR passed without provider calls.');
 } finally { await cleanupAgencyPagesFixture(db,f); }
}
