import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/fiscal-invoices';
import { backendOrigin } from '../src/lib/backend/http-client';
test('fiscal DTO refuses private state and file targets reject other origins and credentials', () => {
  assert.deepEqual(contracts.fiscalInvoicesDataSchema.parse({documents:[]}),{documents:[]});
  assert.equal(contracts.fiscalInvoicesDataSchema.safeParse({documents:[],encryptedFocusTokens:'private'}).success,false);
  assert.equal(contracts.fiscalInvoicesQuerySchema.safeParse({arenaId:'foreign'}).success,false);
  assert.equal(contracts.fiscalConsultInputSchema.safeParse({fields:{documentId:'doc',arenaId:'foreign'}}).success,false);
  for(const url of ['https://untrusted.test/file.xml','javascript:alert(1)','https://user:secret@homologacao.focusnfe.com.br/test.xml','https://api.focusnfe.com.br:8443/test.xml'])assert.equal(contracts.fiscalFileTargetSchema.safeParse({url}).success,false);
  assert.equal(contracts.fiscalFileTargetSchema.safeParse({url:'https://homologacao.focusnfe.com.br/notas_fiscais_consumidor/test.html'}).success,true);
});
test('fiscal consultation transport forwards staff cookies and explicit fields without replay', async () => {
  const calls:{url:URL;init:RequestInit}[]=[];let fail=false;const exported:Record<string,Function>={};
  const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/contracts/fiscal-invoices':contracts};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/fiscal-consult-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,JSON,Object,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
  const form=new FormData();form.set('documentId','doc');form.set('arenaId','forged');await exported.remoteFiscalConsult('https://backend.example.test',form);assert.deepEqual(JSON.parse(calls[0].init.body as string),{fields:{documentId:'doc'}});assert.equal(new Headers(calls[0].init.headers).get('cookie'),'padel_session=fixture');assert.equal(new Headers(calls[0].init.headers).get('authorization'),null);assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.cache,'no-store');
  form.append('documentId','other');await assert.rejects(exported.remoteFiscalConsult('https://backend.example.test',form));assert.equal(calls.length,1);form.set('documentId','doc');fail=true;await assert.rejects(exported.remoteFiscalConsult('https://backend.example.test',form));assert.equal(calls.length,2);
});
test('fiscal facade invalidates only after confirmation and hides transport details', async () => {
  const paths:string[]=[];let result:object={};let fail=false;const exported:Record<string,Function>={};const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(p:string)=>paths.push(p)},'@/lib/backend/fiscal-consult-client':{remoteFiscalConsult:async()=>{if(fail)throw Error('private token');return result;}}};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/fiscal/consult-mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
  await exported.runFiscalConsult(new FormData());assert.deepEqual(paths,['/financeiro/notas-fiscais']);paths.length=0;result={error:'Nota definitiva.'};assert.deepEqual(await exported.runFiscalConsult(new FormData()),result);assert.deepEqual(paths,[]);fail=true;assert.equal((await exported.runFiscalConsult(new FormData())).error.includes('private'),false);assert.deepEqual(paths,[]);
});
test('fiscal core preserves status checks, cancellation authority and actor audit', async () => {
  let status='PROCESSING',deny=false;const calls:unknown[][]=[];const audits:any[]=[];const exported:Record<string,Function>={};const modules:Record<string,unknown>={'server-only':{},'@/lib/auth/guards':{requirePermission:async(key:string)=>{assert.equal(key,'finance:settings:manage');if(deny)throw Error('Sem permissão');return{arenaId:'arena',userId:'operator',userName:'Operador'};}},'@/lib/arena-database':{arenaDatabase:(arenaId:string)=>{assert.equal(arenaId,'arena');return{fiscalDocument:{findFirst:async({where}:any)=>{assert.equal(where.arenaId,'arena');assert.equal(where.provider,'FOCUS');return where.id==='doc'?{id:'doc',status}:null;}},auditEvent:{create:async({data}:any)=>audits.push(data)}};}},'@/lib/fiscal/focus-issuance':{dispatchFocusNfce:async(...args:unknown[])=>calls.push(args)}};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/services/focus-fiscal-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
  const form=new FormData();form.set('documentId','doc');deny=true;await assert.rejects(exported.consultFocusDocumentAction(form));assert.equal(calls.length,0);deny=false;form.set('cancelReason','short');assert.ok((await exported.consultFocusDocumentAction(form)).error);form.set('cancelReason','Cancelamento sintético solicitado');assert.ok((await exported.consultFocusDocumentAction(form)).error);form.delete('cancelReason');await exported.consultFocusDocumentAction(form);assert.deepEqual(calls[0],['arena','doc',undefined]);assert.equal(audits[0].actorId,'operator');assert.equal(audits[0].action,'FOCUS_CONSULT_REQUESTED');status='AUTHORIZED';assert.ok((await exported.consultFocusDocumentAction(form)).error);form.set('cancelReason','Cancelamento sintético solicitado');await exported.consultFocusDocumentAction(form);assert.equal(calls[1][2],'Cancelamento sintético solicitado');assert.equal(audits[1].action,'FOCUS_CANCEL_REQUESTED');form.set('documentId','foreign');assert.ok((await exported.consultFocusDocumentAction(form)).error);assert.equal(calls.length,2);
});

 test('fiscal file redirects override the global referrer header', async () => {
  const configPath = '../next.config.mjs';
  const config = (await import(configPath)).default;
  const rules = await config.headers();
  const fiscal = rules.find((rule: { source: string }) => rule.source === '/api/fiscal/documents/:path*');
  assert.ok(fiscal);
  assert.ok(fiscal.headers.some((header: { key: string; value: string }) => header.key === 'Referrer-Policy' && header.value === 'no-referrer'));
  assert.ok(rules.indexOf(fiscal) > rules.findIndex((rule: { source: string }) => rule.source === '/(.*)'));
});
