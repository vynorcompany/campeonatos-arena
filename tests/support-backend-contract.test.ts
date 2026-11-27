import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/support';
import { backendOrigin } from '../src/lib/backend/http-client';

test('support contracts reject forged authority and private user relations',()=>{
 const create={title:'Teste',category:'BUG',priority:'MEDIUM',description:'Descrição sintética do chamado'};
 assert.equal(contracts.supportInputSchema('create').safeParse({...create,arenaId:'other'}).success,false);
 assert.equal(contracts.supportInputSchema('create').safeParse({...create,requesterId:'other'}).success,false);
 assert.equal(contracts.supportInputSchema('create').safeParse({...create,title:'x'}).success,false);
 assert.equal(contracts.supportInputSchema('message').parse({ticketId:'ticket',body:'Resposta pública'}).internal,'');
 assert.equal(contracts.supportInputSchema('update').parse({ticketId:'ticket',status:'OPEN',priority:'LOW'}).assigneeId,'');
 const ticket={id:'t',code:'t',title:'t',description:'t',category:'BUG',priority:'LOW',status:'OPEN',updatedAt:new Date().toISOString(),requester:{name:'Nome'},assignee:null,messages:[]};
 assert.ok(contracts.supportWorkspaceSchema.safeParse({tickets:[ticket]}).success);
 assert.equal(contracts.supportWorkspaceSchema.safeParse({tickets:[{...ticket,requester:{name:'Nome',passwordHash:'private'}}]}).success,false);
 assert.equal(contracts.agencySupportWorkspaceSchema.safeParse({tickets:[],agencyUsers:[{id:'a',name:'A',email:'private'}]}).success,false);
});

test('support transport whitelists form fields, handles unchecked notes and never retries mutations',async()=>{
 const exported:Record<string,Function>={}; const calls:{url:URL;init:RequestInit}[]=[]; let fail=false;
 const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/contracts/support':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/support-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,JSON,Error,Object,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({error:null});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.set('ticketId','ticket');form.set('body','Resposta pública');form.set('arenaId','forged');
 await exported.remoteSupportMutation('https://backend.example.test','message',form);
 assert.deepEqual(JSON.parse(calls[0].init.body as string),{ticketId:'ticket',body:'Resposta pública',internal:''});
 assert.equal(calls[0].url.pathname,'/api/management/support/actions/message');assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.redirect,'error');
 assert.equal(new Headers(calls[0].init.headers).get('cookie'),'padel_session=fixture');
 form.append('body','Duplicada');await assert.rejects(exported.remoteSupportMutation('https://backend.example.test','message',form));assert.equal(calls.length,1);
 form.set('body','Resposta pública');fail=true;await assert.rejects(exported.remoteSupportMutation('https://backend.example.test','message',form));assert.equal(calls.length,2);
});
