import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../src/lib/backend/contracts/event-results';
function fixture(outcome:unknown,fail=false){
 const requests:{url:string,init:RequestInit}[]=[],cache:string[]=[];const exports:Record<string,Function>={};
 const source=readFileSync(new URL('../src/lib/portal/event-result-mutation.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,FormData,Error,AbortSignal,process:{env:{VX4_BACKEND_ORIGIN:'http://backend.test'}},fetch:async(url:URL,init:RequestInit)=>{requests.push({url:String(url),init});if(fail)throw Error('private provider failure');return Response.json(outcome);},require(name:string){if(name==='server-only')return{};if(name==='next/headers')return{cookies:async()=>({get:(key:string)=>({value:({'padel_session':'management','padel_arena':'selected','arena_player_session':'athlete',secret:'hidden'}as Record<string,string>)[key]})}),headers:async()=>new Headers({origin:'https://portal.test'})};if(name==='next/cache')return{revalidatePath:(path:string)=>cache.push(path)};if(name.endsWith('http-client'))return{backendOrigin:(value:string)=>new URL(value)};if(name.endsWith('event-results'))return contracts;throw Error('Unexpected '+name);}});
 return{run:exports.runEventResultMutation,requests,cache};
}
const form=()=>{const f=new FormData();f.set('arenaSlug','arena');f.set('matchId','match');f.set('playerId','forged');return f;};
test('event result transport carries athlete identity only and refreshes confirmed results',async()=>{
 const f=fixture({success:true,matchId:'match',homeScore:6,awayScore:2});assert.equal((await f.run('match',form())).success,true);assert.equal(f.requests.length,1);const init=f.requests[0].init;assert.equal((init.headers as Record<string,string>).cookie,'arena_player_session=athlete');assert.equal((init.headers as Record<string,string>).origin,'https://portal.test');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(JSON.parse(String(init.body)).fields.playerId,undefined);assert.ok(f.cache.includes('/home'));assert.ok(f.cache.includes('/classificacao/arena'));assert.ok(f.cache.includes('/torneios'));
 const t=fixture({success:true,matchId:'match',homeScore:1,awayScore:0});const trio=form();trio.append('homePlayerIds','a');trio.append('homePlayerIds','b');trio.append('awayPlayerIds','c');trio.append('awayPlayerIds','d');await t.run('trio',trio);assert.deepEqual(JSON.parse(String(t.requests[0].init.body)).fields.homePlayerIds,['a','b']);
});
test('event result rejections and uncertain writes never retry or announce success',async()=>{
 for(const [outcome,fail]of [[{success:false,error:'Jogo indisponível.'},false],[null,true]]as const){const f=fixture(outcome,fail);assert.equal((await f.run('match',form())).success,false);assert.equal(f.requests.length,1);assert.equal(f.cache.length,0);}
 const f=fixture({success:true,matchId:'m',homeScore:6,awayScore:2});const repeated=form();repeated.append('matchId','another');assert.equal((await f.run('match',repeated)).success,false);assert.equal(f.requests.length,0);
});
