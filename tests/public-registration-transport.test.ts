import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../src/lib/backend/contracts/public-registration';
function fixture(outcome:unknown,fail=false){
 const requests:{url:string,init:RequestInit}[]=[],cache:string[]=[];const exports:Record<string,Function>={};
 const source=readFileSync(new URL('../src/lib/portal/registration-mutation.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,FormData,Error,AbortSignal,process:{env:{VX4_BACKEND_ORIGIN:'http://backend.test'}},fetch:async(url:URL,init:RequestInit)=>{requests.push({url:String(url),init});if(fail)throw Error('private provider failure');return Response.json(outcome);},require(name:string){if(name==='server-only')return{};if(name==='next/headers')return{cookies:async()=>({get:(key:string)=>({value:({'padel_session':'management','padel_arena':'selected','arena_player_session':'athlete',secret:'hidden'}as Record<string,string>)[key]})}),headers:async()=>new Headers({origin:'https://portal.test'})};if(name==='next/cache')return{revalidatePath:(path:string)=>cache.push(path)};if(name.endsWith('http-client'))return{backendOrigin:(value:string)=>new URL(value)};if(name.endsWith('public-registration'))return contracts;throw Error('Unexpected '+name);}});
 return{run:exports.runPublicRegistration,requests,cache};
}
const form=()=>{const f=new FormData();f.set('tournamentSlug','event');f.set('categoryId','category');f.set('arenaId','forged');return f;};
test('registration transport sends no session or pricing authority and refreshes confirmed partial commits',async()=>{
 for(const error of [null,'Cobrança cancelada após falha do provedor.']){const state={error,success:error?null:'Confirmada',registrationId:'r',amountCents:7500};const f=fixture({state,committed:true});const result=await f.run(form());assert.equal(result.error,error);assert.equal(f.requests.length,1);const init=f.requests[0].init;assert.equal((init.headers as Record<string,string>).cookie,undefined);assert.equal((init.headers as Record<string,string>).origin,'https://portal.test');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(JSON.parse(String(init.body)).fields.arenaId,undefined);assert.ok(f.cache.includes('/financeiro/contas-a-receber'));assert.ok(f.cache.includes('/torneios/inscricoes'));assert.ok(f.cache.includes('/inscricao/event'));}
});
test('registration validation failures and uncertain writes never retry or leak backend details',async()=>{
 for(const [outcome,fail]of [[{state:{error:'Dados inválidos.',success:null},committed:false},false],[null,true],[{state:{error:null,success:'ok',encryptedSecrets:'private'},committed:true},false]]as const){const f=fixture(outcome,fail);const result=await f.run(form());assert.ok(result.error);assert.doesNotMatch(result.error,/private|encrypted/);assert.equal(f.requests.length,1);assert.equal(f.cache.length,0);}
 const f=fixture({state:{error:null,success:'ok'},committed:true});const repeated=form();repeated.append('categoryId','other');assert.ok((await f.run(repeated)).error);assert.equal(f.requests.length,0);
});
