import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

test('perfil de outra arena responde como página não encontrada',async()=>{
 const source=readFileSync(new URL('../src/app/(app)/arena/perfis/[profileId]/page.tsx',import.meta.url),'utf8');
 const exported:Record<string,Function>={};const calls:string[][]=[];
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports:exported,require:(name:string)=>{
   if(name==='@/lib/auth/guards')return{requireRole:async(role:string)=>{assert.equal(role,'ADMIN');return{arenaId:'own-arena'};}};
   if(name==='@/lib/arena-access/data')return{getAccessProfile:async(arena:string,id:string)=>{calls.push([arena,id]);return null;}};
   if(name==='next/navigation')return{notFound(){throw Error('NOT_FOUND');}};
   if(name==='./page.utilities')return{viewStyles:{}};
   assert.notEqual(name,'@/lib/prisma');return{};
  }
 });
 await assert.rejects(exported.default({params:Promise.resolve({profileId:'foreign-profile'})}),/NOT_FOUND/);
 assert.deepEqual(calls,[['own-arena','foreign-profile']]);
});
