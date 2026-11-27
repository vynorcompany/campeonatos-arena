import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../src/lib/backend/contracts/boleto-queue';
import { backendOrigin } from '../src/lib/backend/http-client';

test('boleto contracts limit batches and omit payer identity and provider credentials', () => {
 assert.equal(contracts.boletoQueueQuerySchema.safeParse({arenaId:'foreign'}).success,false);
 assert.equal(contracts.boletoQueueInputSchema('cancel').safeParse({entryId:'entry',arenaId:'foreign'}).success,false);
 assert.equal(contracts.boletoQueueInputSchema('cancel').safeParse({entryIds:['entry']}).success,false);
 assert.equal(contracts.boletoQueueInputSchema('reconcile').safeParse({entryId:'entry'}).success,false);
 assert.equal(contracts.boletoQueueInputSchema('cancel-batch').safeParse({entryIds:Array(101).fill('entry')}).success,false);
 assert.equal(contracts.boletoQueueOutcomeSchema.safeParse({}).success,false);
 assert.equal(contracts.boletoQueueOutcomeSchema.safeParse({success:true,accessToken:'private'}).success,false);
 assert.deepEqual(contracts.boletoQueueDataSchema.parse({capped:false,rows:[]}),{capped:false,rows:[]});
 assert.equal(contracts.boletoQueueDataSchema.safeParse({capped:false,rows:[],players:[]}).success,false);
});

test('boleto transport deduplicates explicit IDs, forwards cookies and does not replay uncertain operations', async () => {
 const calls:RequestInit[]=[];let fails=false;const exported:Record<string,Function>={};
 const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/contracts/boleto-queue':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/boleto-queue-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,JSON,Set,Error,fetch:async(_url:URL,init:RequestInit)=>{calls.push(init);if(fails)throw Error('timeout');return Response.json({success:true,failedIds:[]});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.append('entryId','one');form.append('entryId','one');form.append('entryId','two');form.set('arenaId','forged');await exported.remoteBoletoQueueMutation('https://backend.example.test','cancel-batch',form);
 assert.deepEqual(JSON.parse(calls[0].body as string),{entryIds:['one','two']});assert.equal(new Headers(calls[0].headers).get('cookie'),'padel_session=fixture');assert.equal(new Headers(calls[0].headers).get('authorization'),null);assert.equal(calls[0].cache,'no-store');assert.equal(calls[0].redirect,'error');
 await assert.rejects(exported.remoteBoletoQueueMutation('https://backend.example.test','cancel',form));assert.equal(calls.length,1);
 fails=true;form.delete('entryId');form.set('entryId','one');await assert.rejects(exported.remoteBoletoQueueMutation('https://backend.example.test','generate',form));assert.equal(calls.length,2);
});

test('boleto facade refreshes partial batches and hides unconfirmed transport failures', async () => {
 const paths:string[]=[];let result:object={success:true};let fail=false;const exported:Record<string,Function>={};const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(path:string)=>paths.push(path)},'@/lib/backend/boleto-queue-client':{remoteBoletoQueueMutation:async()=>{if(fail)throw Error('private connection');return result;}},'@/lib/backend/contracts/boleto-queue':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/finance/boleto-queue-mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,FormData,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 await exported.runBoletoQueueMutation('cancel');assert.equal(paths.length,2);paths.length=0;result={error:'1 pendente',failedIds:['two']};await exported.runBoletoQueueMutation('cancel-batch');assert.equal(paths.length,2);paths.length=0;result={retired:0,failed:0};await exported.runBoletoQueueMutation('reconcile');assert.equal(paths.length,0);fail=true;const uncertain=await exported.runBoletoQueueMutation('cancel');assert.equal(uncertain.error.includes('private'),false);assert.equal(paths.length,0);
});
