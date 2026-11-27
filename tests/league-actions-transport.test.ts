import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../src/lib/backend/contracts/league-actions';
function fixture(outcome:unknown,fail=false){
 const requests:{url:string,init:RequestInit}[]=[],cache:string[]=[];const exports:Record<string,Function>={};
 const source=readFileSync(new URL('../src/lib/portal/league-mutation.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,FormData,Error,AbortSignal,process:{env:{VX4_BACKEND_ORIGIN:'http://backend.test'}},fetch:async(url:URL,init:RequestInit)=>{requests.push({url:String(url),init});if(fail)throw Error('private provider failure');return Response.json(outcome);},require(name:string){if(name==='server-only')return{};if(name==='next/headers')return{cookies:async()=>({get:(key:string)=>({value:({'padel_session':'management','padel_arena':'selected','arena_player_session':'athlete',secret:'hidden'}as Record<string,string>)[key]})}),headers:async()=>new Headers({origin:'https://portal.test'})};if(name==='next/cache')return{revalidatePath:(path:string)=>cache.push(path)};if(name.endsWith('http-client'))return{backendOrigin:(value:string)=>new URL(value)};if(name.endsWith('league-actions'))return contracts;throw Error('Unexpected '+name);}});
 return{run:exports.runLeagueMutation,requests,cache};
}
const form=()=>{const f=new FormData();f.set('arenaSlug','arena');f.set('matchId','match');f.set('playerId','forged');return f;};
test('league transport forwards the appropriate session and invalidates views only after confirmed success',async()=>{
 const f=fixture({error:null,result:{success:true,matchId:'match',homeScore:2,awayScore:0}});assert.equal((await f.run('score',form())).result.success,true);assert.equal(f.requests.length,1);const init=f.requests[0].init;assert.equal((init.headers as Record<string,string>).cookie,'arena_player_session=athlete');assert.equal((init.headers as Record<string,string>).origin,'https://portal.test');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(JSON.parse(String(init.body)).fields.playerId,undefined);assert.ok(f.cache.includes('/home'));assert.ok(f.cache.includes('/classificacao'));assert.ok(f.cache.includes('/torneios'));
 const review=fixture({error:null});const r=new FormData();r.set('requestId','r');r.set('decision','REJECTED');await review.run('review',r);assert.equal(new URL(review.requests[0].url).pathname,'/api/management/league/medical');assert.equal((review.requests[0].init.headers as Record<string,string>).cookie,'padel_session=management; padel_arena=selected');
});
test('rejected or uncertain league writes never retry or invalidate cached screens',async()=>{
 for(const [outcome,fail]of [[{error:null,result:{success:false,error:'Jogo indisponível.'}},false],[{error:'Sem permissão.'},false],[null,true]]as const){const f=fixture(outcome,fail);await f.run('score',form());assert.equal(f.requests.length,1);assert.equal(f.cache.length,0);}
 const f=fixture({error:null});const repeated=form();repeated.append('matchId','another');assert.ok((await f.run('score',repeated)).error);assert.equal(f.requests.length,0);
});
