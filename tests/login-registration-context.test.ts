import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {portalArenaSlugForHost} from "../src/lib/portal/login-arena-host";
import {loginBrandingSchema} from "../src/lib/backend/contracts/login-branding";

test("cadastro deriva a arena do domínio permitido e não pede código ao visitante",async()=>{
 let directoryReads=0;
 const exports:any={};
 const mocks:Record<string,unknown>={"server-only":{},"@/lib/env":{env:{portalArenaHosts:JSON.stringify({"arena.example":"arena-a"})}},"@/lib/portal/login-arena-host":{portalArenaSlugForHost},"@/lib/prisma":{prisma:{arena:{findFirst:async(args:any)=>{assert.equal(args.where.slug,"arena-a");assert.equal(args.where.archivedAt,null);assert.equal(args.select.slug,true);return{name:"Arena A",slug:"arena-a",logoUrl:"/logo.svg",athletePortalLogoUrl:""};},findMany:async()=>{directoryReads++;return[];}}}}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/services/login-branding.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>{if(!(name in mocks))throw Error(name);return mocks[name];}});
 const result=loginBrandingSchema.parse(await exports.resolveLoginBranding("arena.example:443"));
 assert.equal(result.arena?.slug,"arena-a");assert.deepEqual(result.arenas,[]);assert.equal(directoryReads,0);
});

test("acesso geral oferece somente nomes e slugs de arenas ativas",async()=>{
 const exports:any={};let queries=0;
 const mocks:Record<string,unknown>={"server-only":{},"@/lib/env":{env:{portalArenaHosts:"{}"}},"@/lib/portal/login-arena-host":{portalArenaSlugForHost},"@/lib/prisma":{prisma:{arena:{findFirst:async()=>{throw Error("Unknown host must not select arena");},findMany:async(args:any)=>{queries++;assert.deepEqual(JSON.parse(JSON.stringify(args)),{where:{archivedAt:null,accountStatus:"ACTIVE"},select:{name:true,slug:true},orderBy:{name:"asc"},take:1000});return[{name:"Arena A",slug:"arena-a"}];}}}}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/services/login-branding.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>mocks[name]});
 const result=loginBrandingSchema.parse(await exports.resolveLoginBranding("unknown.example"));assert.equal(result.arena,null);assert.equal(result.arenas[0]?.slug,"arena-a");assert.equal(queries,1);
 assert.equal(loginBrandingSchema.safeParse({...result,arenas:[{name:"Arena",slug:"arena",agencyNotes:"private"}]}).success,false);
});
