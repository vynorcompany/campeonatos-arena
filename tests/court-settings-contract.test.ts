import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/court-settings';
import {backendOrigin} from '../src/lib/backend/http-client';
test('court settings reject tenant injection, duplicated scalars and excessive selections',()=>{
 for(const op of Object.keys(contracts.courtSettingsFields) as contracts.CourtSettingsOperation[])assert.equal(contracts.courtSettingsInputSchema(op).safeParse({fields:{arenaId:['foreign']}}).success,false);
 assert.equal(contracts.courtSettingsInputSchema('rule-update').safeParse({fields:{ruleId:['one','two']}}).success,false);
 assert.equal(contracts.courtSettingsInputSchema('court-copy').safeParse({fields:{targetCourtId:['one','two']}}).success,true);
 assert.equal(contracts.courtSettingsInputSchema('court-copy').safeParse({fields:{targetCourtId:Array(101).fill('one')}}).success,false);
 assert.equal(contracts.courtSettingsOutcomeSchema.safeParse({error:null,checkinToken:'private'}).success,false);
});
test('court transport preserves selected courts/durations and never retries writes',async()=>{
 const exported:Record<string,Function>={};const calls:{url:URL;init:RequestInit}[]=[];let fail=false;
 const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/contracts/court-settings':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/court-settings-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({error:null});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.set('courtId','c');form.append('onlineDurationMinutes','60');form.append('onlineDurationMinutes','90');form.set('arenaId','forged');await exported.remoteCourtSettingsMutation('https://backend.example.test','court-update',form);assert.deepEqual(JSON.parse(calls[0].init.body as string),{fields:{courtId:['c'],onlineDurationMinutes:['60','90']}});assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.cache,'no-store');
 form.append('courtId','other');await assert.rejects(exported.remoteCourtSettingsMutation('https://backend.example.test','court-update',form));assert.equal(calls.length,1);form.set('courtId','c');fail=true;await assert.rejects(exported.remoteCourtSettingsMutation('https://backend.example.test','court-update',form));assert.equal(calls.length,2);
});
test('court facade invalidates booking views only on success and hides internal cache metadata',async()=>{
 const exported:Record<string,Function>={};const paths:string[]=[];let result:object={error:'Recusado'};let calendars=0;
 const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(p:string)=>paths.push(p)},'@/lib/calendar/revalidation':{refreshCalendarRoutes:()=>calendars++},'@/lib/arena-booking-path':{arenaBookingPath:(slug:string)=>'/portal/'+slug+'/reservas'},'@/lib/backend/court-settings-client':{remoteCourtSettingsMutation:async()=>result},'@/lib/backend/contracts/court-settings':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/court-settings/mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,encodeURIComponent,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 await exported.runCourtSettingsMutation('online',new FormData());assert.equal(calendars,0);assert.equal(paths.length,0);result={error:null,cacheSlugs:['arena']};const response=await exported.runCourtSettingsMutation('online',new FormData());assert.equal(calendars,1);assert.ok(paths.includes('/reservar/arena'));assert.equal('cacheSlugs'in response,false);
});
