import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../src/lib/backend/contracts/arena-settings';
import { backendOrigin } from '../src/lib/backend/http-client';

test('administrative contracts reject identity overrides and private settings',()=>{
 assert.equal(contracts.arenaSettingsInputSchema('printer').safeParse({fields:{printerPaper:'A4',arenaId:'other'}}).success,false);
 assert.equal(contracts.arenaSettingsInputSchema('privacy-release').safeParse({fields:{referenceId:'ref',userId:'forged'}}).success,false);
 assert.equal(contracts.revokeDeviceInputSchema.safeParse({sessionId:'one',userId:'other'}).success,false);
 assert.equal(contracts.printerSettingsDataSchema.safeParse({settings:{printerPaper:'A4',printerCopies:2,encryptedFocusTokens:'private'}}).success,false);
 assert.equal(contracts.deviceSessionsDataSchema.safeParse({currentId:null,sessions:[],token:'private'}).success,false);
 assert.equal(contracts.privacySettingsDataSchema.safeParse({requests:[],references:[],contactHash:'private'}).success,false);
});

test('settings transport forwards only explicit fields and never retries an uncertain write',async()=>{
 const calls:{url:URL;init:RequestInit}[]=[];let fail=false;const exported:Record<string,Function>={};const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/contracts/arena-settings':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/arena-settings-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,JSON,Object,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({error:null});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.set('sessionId','own-device');form.set('userId','other');await exported.remoteArenaSettingsMutation('https://backend.example.test','device-revoke',form);assert.deepEqual(JSON.parse(calls[0].init.body as string),{sessionId:'own-device'});assert.equal(calls[0].url.pathname,'/api/management/devices/revoke');assert.equal(new Headers(calls[0].init.headers).get('cookie'),'padel_session=fixture');assert.equal(new Headers(calls[0].init.headers).get('authorization'),null);assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.cache,'no-store');
 form.append('sessionId','another');await assert.rejects(exported.remoteArenaSettingsMutation('https://backend.example.test','device-revoke',form));assert.equal(calls.length,1);form.set('sessionId','own-device');fail=true;await assert.rejects(exported.remoteArenaSettingsMutation('https://backend.example.test','device-revoke',form));assert.equal(calls.length,2);
});

test('settings facade refreshes affected pages only after confirmation',async()=>{
 const paths:unknown[][]=[];let result:{error:string|null}={error:null};let fail=false;const exported:Record<string,Function>={};const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(...args:unknown[])=>paths.push(args)},'@/lib/backend/arena-settings-client':{remoteArenaSettingsMutation:async()=>{if(fail)throw Error('private credential');return result;}}};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/settings/mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 await exported.runArenaSettingsMutation('policies',new FormData());assert.deepEqual(paths,[['/configuracoes/politicas'],['/classificacao','layout']]);paths.length=0;result={error:'Recusado'};await exported.runArenaSettingsMutation('privacy-respond',new FormData());assert.deepEqual(paths,[]);fail=true;assert.equal((await exported.runArenaSettingsMutation('printer',new FormData())).error.includes('private'),false);assert.deepEqual(paths,[]);
});
