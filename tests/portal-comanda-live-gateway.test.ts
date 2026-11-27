import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {backendOrigin} from '../src/lib/backend/http-client';
function load(){const exports:any={};vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/portal/comandas-live-gateway.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,URLSearchParams,Headers,Response,AbortSignal,fetch,Error,require:(name:string)=>{if(name==='server-only')return{};if(name==='@/lib/backend/http-client')return{backendOrigin};throw Error(name);}});return exports.readPortalComandasLive as(request:Request,origin:string)=>Promise<Response>;}
test('comanda polling forwards only athlete identity and ETag, preserving status without frontend database work',async()=>{
 const requests:any[]=[];
 const server=createServer((req,res)=>{requests.push({url:req.url,cookie:req.headers.cookie,etag:req.headers['if-none-match']});res.setHeader('etag','"own-snapshot"');if(req.headers['if-none-match']==='"own-snapshot"'){res.writeHead(304);res.end();return;}res.setHeader('content-type','application/json');res.end(JSON.stringify({disabled:false,comandas:[{id:'own'}]}));});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+(server.address()as{port:number}).port,read=load();
 try{
  const headers={cookie:'padel_session=staff-private; arena_player_session=athlete-proof; secret=private'};
  const request=new Request('http://frontend/api/portal/comandas?arenaSlug=own-arena&playerId=foreign',{headers});
  const response=await read(request,origin);assert.equal(response.status,200);assert.deepEqual(await response.json(),{disabled:false,comandas:[{id:'own'}]});assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie');
  assert.deepEqual(requests,[{url:'/api/portal/comandas?arenaSlug=own-arena',cookie:'arena_player_session=athlete-proof',etag:undefined}]);
  const unchanged=await read(new Request(request.url,{headers:{...headers,'if-none-match':'"own-snapshot"'}}),origin);assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');assert.equal(unchanged.headers.get('etag'),'"own-snapshot"');
  assert.equal((await read(new Request('http://frontend/api/portal/comandas'),origin)).status,400);assert.equal(requests.length,2);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('comanda polling fails closed without exposing backend failures or following redirects',async()=>{
 let redirect=false;const server=createServer((_req,res)=>{if(redirect){res.writeHead(302,{location:'/private'});res.end();return;}res.writeHead(500);res.end('private-database-error');});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+(server.address()as{port:number}).port;
 try{for(const redirected of [false,true]){redirect=redirected;const response=await load()(new Request('http://frontend/api/portal/comandas?arenaSlug=own'),origin);assert.equal(response.status,503);assert.equal((await response.text()).includes('private'),false);}}
 finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
