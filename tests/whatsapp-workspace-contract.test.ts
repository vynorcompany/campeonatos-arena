import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { whatsappWorkspaceSchema, whatsappWorkspaceQuerySchema } from "../src/lib/backend/contracts/whatsapp-workspace";
import { normalizeWhatsAppAccountJid } from "../src/lib/whatsapp-account";
import { readWhatsAppReactions } from "../src/lib/whatsapp-message-data";
function load(file: string, dependencies: Record<string, unknown>, extra = {}) {
 const exports: Record<string, Function> = {};
 vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, ...extra, require(name: string) { if(name === "server-only") return {}; assert.ok(name in dependencies, name); return dependencies[name]; } });
 return exports;
}
test("WhatsApp workspace rejects authority and oversized/duplicate-shaped query values", () => {
 for(const query of [{arenaId:"foreign"},{conversa:"x".repeat(101)},{conversa:["a","b"]}]) assert.equal(whatsappWorkspaceQuerySchema.safeParse(query).success,false);
 assert.equal(whatsappWorkspaceQuerySchema.safeParse({conversa:"own"}).success,true);
});
test("WhatsApp workspace scopes list and selected conversation to arena and connected account, serializes dates/revision without provider data", async () => {
 const calls: any[] = [];
 const conversation = {id:"selected",contactName:"Raw",contactPhone:"55",profilePhotoUrl:"",unreadCount:0,lastMessageAt:new Date("2026-11-27T12:00:00Z"),slaResolvedAt:null,playerId:null,player:null,archivedAt:null,pinned:false,favorite:false,listName:"",remoteJid:"remote@s.whatsapp.net",messages:[{id:"message",direction:"IN",body:"Hello",senderName:"",participantJid:"",quotedProviderId:"",quotedBody:"",quotedAuthor:"",reactions:[{actorJid:"actor",emoji:"👍",privateMetadata:"not rendered"}],mediaType:"",mediaMimeType:"",mediaFileName:"",sentAt:new Date("2026-11-27T12:00:00Z")}]};
 let connected = true;
 const db = {whatsAppConnection:{findUnique:async()=>({status:connected?"CONNECTED":"DISCONNECTED",connectedPhone:"554299633125:7@c.us",inboxRevision:99n})},player:{findMany:async()=>[]},whatsAppConversation:{findMany:async(args: any)=>{calls.push(args);return[];},findFirst:async(args:any)=>{calls.push(args);return conversation;}}};
 const service = load("src/lib/backend/services/whatsapp-workspace.ts", {
 "@/lib/auth/guards":{requireModuleView:async(module:string)=>{assert.equal(module,"support");return{arenaId:"own"};}},
 "@/lib/prisma":{prisma:{arena:{findUniqueOrThrow:async(args:any)=>{assert.equal(args.where.id,"own");return{whatsappSlaMinutes:30};}}}},
 "@/lib/arena-database":{arenaDatabase:(id:string)=>{assert.equal(id,"own");return db;}},
 "@/lib/whatsapp-account":{normalizeWhatsAppAccountJid},"@/lib/whatsapp-message-data":{readWhatsAppReactions},
 "../contracts/whatsapp-workspace":{whatsappWorkspaceSchema},
 });
 const result = await service.resolveWhatsAppWorkspace("selected");
 assert.equal(result.selectedConversationId,"selected");assert.equal(result.initialVersion,"554299633125@s.whatsapp.net:99");assert.equal(result.conversations[0].lastMessageAt,"2026-11-27T12:00:00.000Z");
 for(const call of calls){assert.equal(call.where.arenaId,"own");assert.equal(call.where.accountJid,"554299633125@s.whatsapp.net");assert.equal(call.select.messages.take,1);assert.equal(call.select.messages.select.providerPayload,undefined);}
 assert.equal(calls[1].where.id,"selected");assert.deepEqual(Object.keys(result.conversations[0].messages[0].reactions[0]).sort(),["actorJid","emoji"]);
 connected=false;calls.length=0;const empty=await service.resolveWhatsAppWorkspace("selected");assert.equal(empty.initialVersion,"empty");assert.equal(empty.selectedConversationId,"");assert.equal(calls.length,0);
 assert.equal(whatsappWorkspaceSchema.safeParse({...result,token:"private"}).success,false);
});
test("WhatsApp frontend forwards only session and bounded conversation query; private failures are sanitized", async () => {
 const calls:any[]=[];
 const dependencies={"@/lib/backend/http-client":{readBackendContract:async(...args:unknown[])=>{calls.push(args);return{ok:true};}},"@/lib/backend/management-context-client":{managementCookieHeader:async()=>"padel_session=synthetic"},"@/lib/backend/contracts/whatsapp-workspace":{whatsappWorkspaceSchema}};
 const client=load("src/lib/whatsapp/workspace.ts",dependencies,{process:{env:{VX4_BACKEND_ORIGIN:"http://backend.test"}},URLSearchParams});
 await client.getWhatsAppWorkspace("selected & another");assert.equal(calls[0][1],"/api/management/whatsapp/workspace?conversa=selected+%26+another");assert.equal(calls[0][3].cookie,"padel_session=synthetic");
 dependencies["@/lib/backend/http-client"].readBackendContract=async()=>{throw Error("private credentials");};
 await assert.rejects(client.getWhatsAppWorkspace(""),/^Error: Não foi possível consultar as conversas do WhatsApp\.$/);
 const page=readFileSync("src/app/(app)/whatsapp/page.tsx","utf8");assert.doesNotMatch(page,/@prisma|arenaDatabase|lib\/prisma|backend\/services/);assert.match(page,/await getWhatsAppWorkspace/);
});
