import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { normalizeBrazilianPhone } from "../src/lib/phone";
import { normalizeWhatsAppAccountJid } from "../src/lib/whatsapp-account";
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL??"";
const enabled=/^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("agenda shortcut opens the correct client conversation, reuses it without messages, and rejects foreign clients and missing permissions",{skip:!enabled},async()=>{
 const p=new PrismaClient({datasources:{db:{url}}});const rollback=new Error("rollback shortcut fixtures");
 try{await assert.rejects(p.$transaction(async tx=>{
  const arena=await tx.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}}),foreign=await tx.arena.findUniqueOrThrow({where:{slug:"arena-beta-goal"}});
  const player=await tx.player.create({data:{arenaId:arena.id,name:`Atalho ${randomUUID()}`,phone:"(41) 90000-6301"}}),outside=await tx.player.create({data:{arenaId:foreign.id,name:"Cliente externo",phone:"41900006302"}});
  await tx.whatsAppConnection.upsert({where:{arenaId:arena.id},create:{arenaId:arena.id,instanceName:randomUUID(),status:"CONNECTED",connectedPhone:"5541999996300@s.whatsapp.net"},update:{status:"CONNECTED",connectedPhone:"5541999996300@s.whatsapp.net"}});
  await tx.$executeRaw`SELECT set_config('app.arena_id',${arena.id},true)`;await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
  let allowed=true,connected=true,recoverConnection=false;const accountJid="5541999996300@s.whatsapp.net";const exports:Record<string,any>={};
  const mocks:Record<string,unknown>={"zod":{z},"@/lib/actions/agency":{refreshArenaWhatsAppConnectionStatusAction:async()=>{if(recoverConnection)connected=true;return {connected};}},"@/lib/auth/guards":{requireWhatsAppSend:async()=>{if(!allowed)throw Error("Sem permissão para enviar mensagens no WhatsApp.");return {arenaId:arena.id};}},"@/lib/phone":{normalizeBrazilianPhone},"@/lib/whatsapp-account":{normalizeWhatsAppAccountJid},"@/lib/whatsapp-active-account":{getActiveWhatsAppAccountJid:async()=>connected?accountJid:""},"@/lib/rls":{withArenaTransaction:async(_:string,run:any)=>run(tx)}};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/whatsapp-chat.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,FormData,Error,require:(name:string)=>mocks[name]??{}});
  const form=new FormData();form.set("playerId",player.id);const first=await exports.openWhatsAppPlayerConversationAction(form);
  const stored=await tx.whatsAppConversation.findUniqueOrThrow({where:{id:first.id}});assert.equal(stored.playerId,player.id);assert.equal(stored.remoteJid,"5541900006301@s.whatsapp.net");assert.equal(stored.accountJid,accountJid);
  await tx.whatsAppConversation.update({where:{id:first.id},data:{archivedAt:new Date()}});
  assert.equal((await exports.openWhatsAppPlayerConversationAction(form)).id,first.id);assert.equal((await tx.whatsAppConversation.findUniqueOrThrow({where:{id:first.id}})).archivedAt,null);assert.equal(await tx.whatsAppMessage.count({where:{conversationId:first.id}}),0);
  form.set("playerId",outside.id);assert.match((await exports.openWhatsAppPlayerConversationAction(form)).error,/Cliente não encontrado/);
  allowed=false;form.set("playerId",player.id);assert.match((await exports.openWhatsAppPlayerConversationAction(form)).error,/Sem permissão/);
  allowed=true;connected=false;const disconnected=JSON.parse(JSON.stringify(await exports.openWhatsAppPlayerConversationAction(form)));assert.equal(disconnected.needsConnection,true);assert.match(disconnected.error,/Conecte o WhatsApp/);recoverConnection=true;assert.equal((await exports.openWhatsAppPlayerConversationAction(form)).id,first.id);assert.equal(await tx.whatsAppMessage.count({where:{conversationId:first.id}}),0);
  throw rollback;
 },{timeout:30000}),e=>e===rollback);}finally{await p.$disconnect();}
});
