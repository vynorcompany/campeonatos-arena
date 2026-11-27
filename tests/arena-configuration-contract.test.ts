import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/arena-configuration';
import {backendOrigin} from '../src/lib/backend/http-client';

test('arena configuration rejects tenant injection, repeated scalars and unexpected files',()=>{
 for(const operation of Object.keys(contracts.configurationFields) as contracts.ConfigurationOperation[]){
  assert.equal(contracts.configurationInputSchema(operation).safeParse({fields:{arenaId:['foreign']}}).success,false,operation);
 }
 assert.equal(contracts.configurationInputSchema('profile').safeParse({fields:{name:['Arena','Other']}}).success,false);
 assert.equal(contracts.configurationInputSchema('agent-create').safeParse({fields:{scopes:['agents:read','clients:read']}}).success,true);
 assert.equal(contracts.configurationInputSchema('agent-create').safeParse({fields:{name:['One','Two']}}).success,false);
 assert.equal(contracts.configurationInputSchema('agent-revoke').safeParse({fields:{},file:{name:'x',type:'image/png',base64:'YWJj'}}).success,false);
 assert.equal(contracts.configurationInputSchema('profile').safeParse({fields:{},file:{name:'x',type:'image/png',base64:'not base64!'}}).success,false);
 assert.equal(contracts.configurationInputSchema('profile').safeParse({fields:{},file:{name:'x',type:'image/png',base64:'a'.repeat(Math.ceil(500*1024/3)*4+4)}}).success,false);
 assert.equal(contracts.configurationOutcomeSchema.safeParse({error:null,success:null,tokenHash:'private'}).success,false);
 assert.equal(contracts.agentKeysDataSchema.safeParse({keys:[{id:'id',name:'Agent',prefix:'arena_',scopes:[],expiresAt:new Date().toISOString(),revokedAt:null,lastUsedAt:null,tokenHash:'private'}]}).success,false);
});

test('configuration transport serializes only selected fields and never retries mutations',async()=>{
 const exported:Record<string,Function>={};const calls:{url:URL;init:RequestInit}[]=[];let fail=false;
 const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/contracts/arena-configuration':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/arena-configuration-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,Buffer,File,JSON,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({error:null,success:null,cacheSlugs:['arena']});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.set('showBooking','on');form.set('arenaId','forged');await exported.remoteConfigurationMutation('https://backend.example.test','portal-settings',form);
 assert.deepEqual(JSON.parse(calls[0].init.body as string),{fields:{showBooking:['on']}});assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].url.pathname,'/api/management/arena/actions/portal-settings');
 form.append('showBooking','on');await assert.rejects(exported.remoteConfigurationMutation('https://backend.example.test','portal-settings',form));assert.equal(calls.length,1);
 form.set('showBooking','on');fail=true;await assert.rejects(exported.remoteConfigurationMutation('https://backend.example.test','portal-settings',form));assert.equal(calls.length,2);
});

test('configuration facade hides backend cache context and invalidates only successful mutations',async()=>{
 const exported:Record<string,Function>={};const paths:string[]=[];let rejected=true;
 const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(path:string)=>paths.push(path)},'@/lib/backend/arena-configuration-client':{remoteConfigurationMutation:async()=>rejected?{error:'Recusado',success:null}:{error:null,success:null,cacheSlugs:['arena'],secret:'arena_'+'a'.repeat(64)}}};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/arena-configuration/mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,encodeURIComponent,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 await exported.runConfigurationMutation('profile',new FormData());assert.equal(paths.length,0);rejected=false;const result=await exported.runConfigurationMutation('agent-create',new FormData());assert.equal('cacheSlugs'in result,false);assert.match(result.secret,/^arena_/);assert.ok(paths.includes('/classificacao/arena'));
});
