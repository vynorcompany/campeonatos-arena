import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as audit from '../src/lib/backend/contracts/audit-workspace';
import * as regulation from '../src/lib/backend/contracts/regulation';
import { actionLabel } from '../src/lib/audit/event-label';
import { backendOrigin } from '../src/lib/backend/http-client';
test('audit and regulation contracts reject authority overrides and private state',()=>{
 assert.equal(audit.auditWorkspaceQuerySchema.safeParse({arenaId:'other'}).success,false);assert.equal(audit.auditWorkspaceQuerySchema.safeParse({page:0}).success,false);assert.equal(audit.auditWorkspaceQuerySchema.safeParse({page:100001}).success,false);assert.equal(audit.auditWorkspaceDataSchema.safeParse({page:1,global:false,total:0,events:[],details:{token:'private'}}).success,false);
 assert.equal(regulation.regulationCreateInputSchema.safeParse({content:'Texto',createdById:'other'}).success,false);assert.equal(regulation.regulationAcceptInputSchema.safeParse({regulationDocumentId:'doc',accepted:'on',arenaId:'other'}).success,false);assert.equal(regulation.regulationPublicDataSchema.safeParse({id:'doc',content:'Termos',arena:{name:'Arena',logoUrl:''},createdById:'private'}).success,false);assert.equal(regulation.regulationOutcomeSchema.safeParse({error:null,success:'OK',publicUrl:'javascript:alert(1)'}).success,false);
});
test('audit labels retain financial operations and display changes only through the presentation allowlist',()=>{
 assert.equal(actionLabel('DB:UPDATE:FinancialEntry',{before:{status:'PENDING'},after:{status:'PAID'}}),'Lançamento quitado');assert.equal(actionLabel('DB:UPDATE:Comanda',{after:{status:'CLOSED'}}),'Comanda fechada');assert.equal(actionLabel('DB:CREATE:Product',{}),'Inclusão · produto');
});
test('public regulation acceptance forwards no management cookie and never retries',async()=>{
 const exported:Record<string,Function>={};const calls:{url:URL;init:RequestInit}[]=[];let fail=false,cookieReads=0;const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>{cookieReads++;return'padel_session=fixture';}},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/contracts/regulation':regulation};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/regulation-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,JSON,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({error:null,success:'Confirmado',publicSlug:'public-slug'});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.set('regulationDocumentId','document');form.set('accepted','on');form.set('arenaId','forged');await exported.remoteRegulationMutation('https://backend.example.test','accept',form);assert.equal(cookieReads,0);assert.equal(new Headers(calls[0].init.headers).get('cookie'),null);assert.deepEqual(JSON.parse(calls[0].init.body as string),{regulationDocumentId:'document',accepted:'on'});assert.equal(calls[0].url.pathname,'/api/public/regulation/accept');assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.redirect,'error');form.append('accepted','on');await assert.rejects(exported.remoteRegulationMutation('https://backend.example.test','accept',form));assert.equal(calls.length,1);form.set('accepted','on');fail=true;await assert.rejects(exported.remoteRegulationMutation('https://backend.example.test','accept',form));assert.equal(calls.length,2);
});
test('regulation facade invalidates the accepted version and keeps internal cache context out of the public form state',async()=>{
 const exported:Record<string,Function>={};const paths:unknown[][]=[];let fail=false;const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(...args:unknown[])=>paths.push(args)},'@/lib/backend/regulation-client':{remoteRegulationMutation:async()=>{if(fail)throw Error('private failure');return{error:null,success:'Aceito',publicSlug:'public-version'};}}};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/regulation/mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const result=await exported.runRegulationMutation('accept',new FormData());assert.equal('publicSlug'in result,false);assert.equal(result.error,null);assert.deepEqual(paths,[['/arena/regulamento'],['/arena'],['/regulamento/public-version']]);paths.length=0;fail=true;assert.equal((await exported.runRegulationMutation('create',new FormData())).error.includes('private'),false);assert.deepEqual(paths,[]);
});
