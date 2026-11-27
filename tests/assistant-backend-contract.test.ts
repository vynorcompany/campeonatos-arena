import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/assistant';
import {backendOrigin} from '../src/lib/backend/http-client';

test('assistant API accepts only bounded text and minimal history/reply fields',()=>{
 for(const input of ['', '   ', 'x'.repeat(2001)])assert.equal(contracts.assistantCommandInputSchema.safeParse({input}).success,false);
 assert.equal(contracts.assistantCommandInputSchema.safeParse({input:'consulta',userId:'other'}).success,false);
 assert.equal(contracts.assistantHistorySchema.safeParse({messages:[{id:'m',role:'USER',content:'Texto',createdAt:new Date().toISOString(),conversationId:'private'}]}).success,false);
 assert.equal(contracts.assistantReplySchema.safeParse({ok:true,message:'OK',createdAt:new Date().toISOString(),refreshFinance:true}).success,false);
});

test('assistant write sends only the command with current cookie and Origin, without retries',async()=>{
 const exported:Record<string,Function>={};const calls:{url:URL;init:RequestInit}[]=[];let fail=false;
 const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/contracts/assistant':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/assistant-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,JSON,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({ok:true,message:'OK',createdAt:'2026-11-27T00:00:00.000Z',refreshFinance:true});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 await exported.remoteAssistantCommand('https://backend.example.test','consulta');assert.deepEqual(JSON.parse(calls[0].init.body as string),{input:'consulta'});assert.equal(calls[0].url.pathname,'/api/management/assistant/command');assert.equal(new Headers(calls[0].init.headers).get('cookie'),'padel_session=fixture');assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.redirect,'error');
 fail=true;await assert.rejects(exported.remoteAssistantCommand('https://backend.example.test','consulta'));assert.equal(calls.length,2);
});

test('assistant facade refreshes financial views only with backend outcome and strips cache context',async()=>{
 const exported:Record<string,Function>={};const paths:string[]=[];let refresh=false;
 const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(path:string)=>paths.push(path)},'@/lib/backend/assistant-client':{remoteAssistantCommand:async()=>({ok:true,message:'OK',createdAt:'2026-11-27T00:00:00.000Z',...(refresh?{refreshFinance:true}:{})})}};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/assistant/command-mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 assert.equal('refreshFinance' in await exported.runAssistantCommand('consulta'),false);assert.deepEqual(paths,[]);refresh=true;assert.equal('refreshFinance' in await exported.runAssistantCommand('comando'),false);assert.deepEqual(paths,['/assistente','/financeiro/contas-a-receber','/painel']);
});
