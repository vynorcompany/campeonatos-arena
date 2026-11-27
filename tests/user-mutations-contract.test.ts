import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/user-mutations';
import {backendOrigin} from '../src/lib/backend/http-client';
test('user contracts separate self-service identity from arena authority',()=>{
 assert.equal(contracts.userInputSchema('own-profile').safeParse({name:'Nome Completo',userId:'other'}).success,false);
 assert.equal(contracts.userInputSchema('own-password').safeParse({currentPassword:'a',newPassword:'b',confirmPassword:'b',arenaId:'other'}).success,false);
 assert.equal(contracts.userInputSchema('role').safeParse({userId:'other',arenaRole:'SUPER_ADMIN'}).success,false);
 assert.equal(contracts.userInputSchema('update').safeParse({userId:'u',name:'Nome Completo',email:'a@example.test',arenaRole:'STAFF',viewPermissions:Array(513).fill('calendar')}).success,false);
 assert.equal(contracts.userOutcomeSchema.safeParse({error:null,success:'OK',passwordHash:'private'}).success,false);
});
test('user transport sends only selected fields, keeps repeated permission checkboxes and does not retry',async()=>{
 const exported:Record<string,Function>={};const calls:{url:URL;init:RequestInit}[]=[];let fail=false;
 const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/contracts/user-mutations':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/user-mutations-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,JSON,Error,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({error:null,success:'OK'});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.set('name','Nome Completo');form.set('userId','forged');await exported.remoteUserMutation('https://backend.example.test','own-profile',form);assert.deepEqual(JSON.parse(calls[0].init.body as string),{name:'Nome Completo'});assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].url.pathname,'/api/management/access/users/actions/own-profile');
 form.append('name','Duplicado');await assert.rejects(exported.remoteUserMutation('https://backend.example.test','own-profile',form));assert.equal(calls.length,1);form.set('name','Nome Completo');fail=true;await assert.rejects(exported.remoteUserMutation('https://backend.example.test','own-profile',form));assert.equal(calls.length,2);
});
test('user facade never invalidates cached views on a rejected update',async()=>{
 const exported:Record<string,Function>={};const paths:string[]=[];let error:string|null='Recusado';
 const modules:Record<string,unknown>={'server-only':{},'next/cache':{revalidatePath:(path:string)=>paths.push(path)},'@/lib/backend/user-mutations-client':{remoteUserMutation:async()=>({error,success:null})}};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/arena-access/user-mutation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,process:{env:{VX4_BACKEND_ORIGIN:'https://backend.example.test'}},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 await exported.runUserMutation('own-profile',new FormData());assert.deepEqual(paths,[]);error=null;await exported.runUserMutation('own-profile',new FormData());assert.deepEqual(paths,['/painel','/usuarios','/minha-conta','/arena']);
});

test('controlled management errors are returned as form state instead of a production-redacted exception',async()=>{
 const exported:Record<string,Function>={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/actions/user.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,require:(name:string)=>{assert.equal(name,'@/lib/arena-access/user-mutation');return{runUserMutation:async()=>({error:'A arena precisa manter pelo menos um owner.',success:null})};}});
 for(const name of ['updateArenaUserRoleAction','updateArenaUserAction','removeArenaUserAction'])assert.equal((await exported[name](new FormData())).error,'A arena precisa manter pelo menos um owner.');
});
