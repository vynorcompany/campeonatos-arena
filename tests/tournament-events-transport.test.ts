import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as contracts from "../src/lib/backend/contracts/tournament-events";
function fixture(body: unknown, fail = false) {
 const exports: Record<string, Function> = {}, calls: Array<{ url: URL; init: RequestInit }> = [], effects: string[] = [];
 vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/tournament/event-mutation.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
  exports, URL, AbortSignal, process: { env: { VX4_BACKEND_ORIGIN: "http://backend.test" } },
  fetch: async (url: URL, init: RequestInit) => { calls.push({url,init}); if(fail) throw Error("private backend credential"); return Response.json(body); },
  require(name: string) {
   if(name==='server-only')return{};
   if(name==='next/headers')return{headers:async()=>new Headers({origin:'https://frontend.test'})};
   if(name==='next/cache')return{revalidatePath:(path:string,type?:string)=>effects.push(`path:${path}:${type??''}`)};
   if(name==='next/navigation')return{redirect:(path:string)=>{effects.push('redirect:'+path);throw Error('NEXT_REDIRECT');}};
   if(name==='./revalidation')return{refreshTournamentRoutes:()=>effects.push('refresh')};
   if(name.endsWith('management-context-client'))return{managementCookieHeader:async()=>'padel_session=synthetic; padel_arena=own'};
   if(name.endsWith('http-client'))return{backendOrigin:(value:string)=>new URL(value)};
   if(name.endsWith('tournament-events'))return contracts;
   throw Error('Unexpected '+name);
  }
 });
 return {exports,calls,effects};
}
test("event transport projects fields, forwards only management session/Origin and applies frontend cache before Next redirect", async()=>{
 const f=fixture({state:null,refresh:true,paths:[{path:'/torneios/event'},{path:'/inscricao/[slug]',type:'page'}],redirect:'/torneios/event/categorias/category'});
 const form=new FormData();form.set('tournamentId','event');form.set('registrationType','TRIO');form.set('actorId','forged');
 await assert.rejects(f.exports.runTournamentEventMutation('create-category',form),/NEXT_REDIRECT/);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].url.pathname,'/api/management/tournaments/events/create-category');assert.deepEqual(JSON.parse(String(f.calls[0].init.body)),{tournamentId:'event',registrationType:'TRIO'});
 const headers=new Headers(f.calls[0].init.headers);assert.equal(headers.get('cookie'),'padel_session=synthetic; padel_arena=own');assert.equal(headers.get('origin'),'https://frontend.test');assert.equal(headers.get('authorization'),null);assert.equal(f.calls[0].init.cache,'no-store');assert.equal(f.calls[0].init.redirect,'error');
 assert.deepEqual(f.effects,['refresh','path:/torneios/event:','path:/inscricao/[slug]:page','redirect:/torneios/event/categorias/category']);
});
test("event writes never retry uncertain failures or invalidate caches for rejected contracts",async()=>{
 for(const f of [fixture(null,true),fixture({state:null,refresh:true,paths:[],redirect:'https://evil.test'})]){
  const result=await f.exports.runTournamentEventMutation('finish',new FormData());assert.equal(result.error,'Não foi possível confirmar a alteração. Confira o evento antes de tentar novamente.');assert.equal(f.calls.length,1);assert.equal(f.effects.length,0);
 }
});
test("all eight public event bindings preserve form feedback and route to their matching backend operation",async()=>{
 const exports:Record<string,Function>={},calls:Array<{operation:string;form:FormData}>=[];
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/actions/tournament/events.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:(name:string)=>{assert.equal(name,'@/lib/tournament/event-mutation');return{runTournamentEventMutation:async(operation:string,form:FormData)=>{calls.push({operation,form});return{error:'Erro controlado',success:null};}};}});
 for(const[name,operation,stateful]of [['createTournamentAction','create',true],['updateTournamentAction','update',true],['removeTournamentCategoryAction','remove-category',true],['createTournamentCategoryAction','create-category',false],['finishTournamentAction','finish',false],['reopenTournamentAction','reopen',false],['deleteTournamentAction','delete',false],['updateTournamentStatusAction','status',false]]as const){const form=new FormData();const result=await(stateful?exports[name]({error:null,success:null},form):exports[name](form));assert.equal(result.error,'Erro controlado');assert.equal(calls.at(-1)?.operation,operation);assert.equal(calls.at(-1)?.form,form);}
});
