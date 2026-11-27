import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/agency-mutations';
import {backendOrigin} from '../src/lib/backend/http-client';
test('agency contracts constrain operations and redact provider/database fields',()=>{
 assert.equal(contracts.agencyInputSchema('whatsapp-connect').safeParse({arenaId:'a',instanceName:'forged'}).success,false);
 assert.equal(contracts.agencyInputSchema('arena-update').safeParse({arenaId:'a',encryptedToken:'forged'}).success,false);
 assert.equal(contracts.agencyInputSchema('system-role').safeParse({userId:'u',systemRole:'VIEWER',arenaId:'a'}).success,false);
 assert.equal(contracts.agencyInputSchema('whatsapp-reset').safeParse({arenaId:['a','b']}).success,false);
 assert.equal(contracts.agencyOutcomeSchema.safeParse({error:null,connected:true,token:'private'}).success,false);
 assert.equal(contracts.agencyUsersSchema.safeParse({users:[{id:'u',name:'Name',email:'e',systemRole:'VIEWER',memberships:[],passwordHash:'private'}]}).success,false);
 assert.equal(contracts.isAgencySystemRole('OWNER'),false);assert.equal(contracts.isAgencySystemRole('MANAGER'),true);
});
test('agency transport strips unknown fields and refuses duplicated authority fields without retries',async()=>{
 const exported:Record<string,Function>={};const calls:{url:URL;init:RequestInit}[]=[];let fail=false;
 const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/contracts/agency-mutations':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/agency-mutations-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('private provider');return Response.json({error:null,connected:false});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.set('arenaId','a');form.set('token','private');await exported.remoteAgencyMutation('https://backend.example.test','whatsapp-connect',form);assert.deepEqual(JSON.parse(calls[0].init.body as string),{arenaId:'a'});assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.cache,'no-store');
 form.append('arenaId','other');await assert.rejects(exported.remoteAgencyMutation('https://backend.example.test','whatsapp-connect',form));assert.equal(calls.length,1);form.set('arenaId','a');fail=true;await assert.rejects(exported.remoteAgencyMutation('https://backend.example.test','whatsapp-connect',form));assert.equal(calls.length,2);
});
test('agency facade refreshes shared connection context only after successful operations',async()=>{
 const exported:Record<string,Function>={};const paths:string[]=[];let result:object={error:'Recusado'};
 const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(p:string)=>paths.push(p)},'@/lib/backend/agency-mutations-client':{remoteAgencyMutation:async()=>result},'@/lib/backend/contracts/agency-mutations':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/agency/mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 await exported.runAgencyMutation('whatsapp-connect',new FormData());assert.equal(paths.length,0);result={error:null,connected:false};await exported.runAgencyMutation('whatsapp-status',new FormData());assert.equal(paths.length,0);result={error:null};await exported.runAgencyMutation('whatsapp-connect',new FormData());assert.ok(paths.includes('/'));assert.ok(paths.includes('/arena'));
});
