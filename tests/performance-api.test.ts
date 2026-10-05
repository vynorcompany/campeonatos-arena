import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { readWhatsAppReactions } from "../src/lib/whatsapp-message-data";
import { createShortSnapshotCache } from "../src/lib/short-snapshot-cache";
class Response {
  constructor(public body: any, public options: any = {}) {}
  static json(body: any, options: any = {}) { return new Response(body, options); }
}
function route(path: string, mocks: Record<string, unknown>) {
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:(name:string)=>name==='next/server'?{NextResponse:Response}:mocks[name] ?? (()=>{throw Error(name)})()});
  return exports;
}
test("lazy WhatsApp history validates arena/account before reading messages and returns 304 without loading the history", async () => {
  let account="current",authChecks=0,reads=0;const queries:any[]=[];
  const api=route("src/app/api/whatsapp/conversations/[conversationId]/messages/route.ts",{
    "@/lib/auth/guards":{requireModuleView:async()=>{authChecks++;return{arenaId:"arena"}}},
    "@/lib/whatsapp-active-account":{getActiveWhatsAppAccountJid:async()=>account},
    "@/lib/whatsapp-message-data":{readWhatsAppReactions},
    "@/lib/prisma":{prisma:{whatsAppConversation:{findFirst:async({where}:any)=>where.id==='owned'&&where.arenaId==='arena'&&where.accountJid==='current'?{id:'owned',updatedAt:new Date(123)}:null},whatsAppMessage:{findMany:async(query:any)=>{reads++;queries.push(query);return[{id:'message',sentAt:new Date(100),reactions:[],body:'Text'}]}}}},
  });
  const call=(id:string,etag="")=>api.GET({headers:new Headers(etag?{'if-none-match':etag}:{})},{params:Promise.resolve({conversationId:id})});
  const first=await call('owned');assert.equal(reads,1);assert.equal(queries[0].take,120);assert.equal(queries[0].select.mediaUrl,undefined);assert.equal(queries[0].select.providerPayload,undefined);assert.equal(first.body.messages[0].mediaUrl,'');
  const unchanged=await call('owned',first.options.headers.etag);assert.equal(unchanged.options.status,304);assert.equal(reads,1);assert.equal(authChecks,2);
  assert.equal((await call('other-arena')).options.status,404);account='old-account';assert.equal((await call('owned')).options.status,404);assert.equal(reads,1);account='';assert.equal((await call('owned')).options.status,404);
});
test("TV snapshots share work by arena and reauthorize even for an unchanged response",async()=>{
  let arenaId='arena-a',allowed=true,loads=0,authChecks=0;
  const api=route('src/app/api/manual-upcoming-matches/route.ts',{
    '@/lib/auth/session':{requireArenaAccess:async()=>{authChecks++;if(!allowed)throw Error('Denied');return{arenaId}}},
    '@/lib/services/tv-presentation':{getTvPresentationPayload:async(arena:string)=>{loads++;return{arena,matches:[]}}},
    '@/lib/short-snapshot-cache':{createShortSnapshotCache},
  });
  const first=await api.GET({headers:new Headers()});const second=await api.GET({headers:new Headers({'if-none-match':first.options.headers.etag})});assert.equal(second.options.status,304);assert.equal(loads,1);assert.equal(authChecks,2);
  arenaId='arena-b';await api.GET({headers:new Headers()});assert.equal(loads,2);allowed=false;await assert.rejects(api.GET({headers:new Headers()}),/Denied/);assert.equal(loads,2);
});
