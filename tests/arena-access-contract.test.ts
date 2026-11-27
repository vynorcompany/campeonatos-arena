import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/arena-access';
import {backendOrigin} from '../src/lib/backend/http-client';
test('arena access contracts reject forged arena, private identities and oversized permissions',()=>{
 assert.equal(contracts.accessInputSchema('create').safeParse({name:'Perfil',arenaId:'foreign'}).success,false);
 assert.equal(contracts.accessInputSchema('update').safeParse({name:'Perfil',profileId:'p',viewPermissions:Array(513).fill('calendar')}).success,false);
 assert.equal(contracts.accessInputSchema('delete').safeParse({profileId:'p',userId:'other'}).success,false);
 assert.equal(contracts.canManageAccess({systemRole:'VIEWER',arenaRole:'STAFF'}),false);assert.equal(contracts.canManageAccess({systemRole:'VIEWER',arenaRole:'ADMIN'}),true);
 assert.equal(contracts.accessUsersSchema.safeParse({members:[],profiles:[],invites:[{id:'i',name:'N',email:'n@example.test',expiresAt:new Date().toISOString(),tokenHash:'secret'}]}).success,false);
 assert.equal(contracts.accessProfileSchema.safeParse({id:'p',name:'P',description:'',viewPermissions:[],editPermissions:[],_count:{members:0},arenaId:'private'}).success,false);
});
test('access transport preserves multi-checkbox permissions, strips authority and never retries',async()=>{
 const exported:Record<string,Function>={};const calls:{url:URL;init:RequestInit}[]=[];let fail=false;
 const modules:Record<string,unknown>={'server-only':{},'next/headers':{headers:async()=>new Headers({origin:'https://front.example.test'})},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=fixture'},'@/lib/backend/http-client':{backendOrigin},'@/lib/backend/contracts/arena-access':contracts};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/arena-access-client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,URL,AbortSignal,JSON,Error,Object,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('timeout');return Response.json({profileId:'profile'});},require:(name:string)=>{assert.ok(name in modules,name);return modules[name];}});
 const form=new FormData();form.set('name','Perfil');form.append('viewPermissions','calendar');form.append('viewPermissions','players');form.set('arenaId','forged');await exported.remoteAccessMutation('https://backend.example.test','create',form);const payload=JSON.parse(calls[0].init.body as string);assert.deepEqual(payload.viewPermissions,['calendar','players']);assert.equal('arenaId'in payload,false);assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.cache,'no-store');
 form.append('name','Duplicado');await assert.rejects(exported.remoteAccessMutation('https://backend.example.test','create',form));assert.equal(calls.length,1);form.set('name','Perfil');fail=true;await assert.rejects(exported.remoteAccessMutation('https://backend.example.test','create',form));assert.equal(calls.length,2);
});
test('permission initialization is not exported as a remotely callable frontend action',()=>{
 const exports:Record<string,unknown>={};vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/actions/permission-profile.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>{assert.equal(name,'@/lib/arena-access/mutation');return{runAccessMutation(){}};}});
 assert.deepEqual(Object.keys(exports).sort(),['createPermissionProfileAction','deletePermissionProfileAction','updatePermissionProfileAction']);
});
