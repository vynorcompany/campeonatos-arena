import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { portalArenaSlugForHost } from "../src/lib/portal/login-arena-host";

async function renderLogin(host: string, matched: boolean) {
 const calls: {directory: number; specific: number} = {directory: 0, specific: 0};
 const component = Symbol("GlobalAthleteAuthForm");
 const jsx = (type: unknown, props: unknown) => ({type, props});
 const mocks: Record<string, unknown> = {
  "react/jsx-runtime": {jsx, jsxs: jsx},
  "next/headers": {headers: async () => new Map([["host", host]])},
  "@/lib/env": {env: {portalArenaHosts: JSON.stringify({"arena.example": "arena-a"})}},
  "@/lib/portal/login-arena-host": {portalArenaSlugForHost},
  "@/lib/auth/player-session": {getPublicAthleteIdentity: async () => null},
  "@/components/global-athlete-auth-form": {GlobalAthleteAuthForm: component},
  "@/lib/prisma": {prisma: {arena: {
   findFirst: async (args: any) => {calls.specific++;assert.equal(args.where.slug,"arena-a");assert.equal(args.where.archivedAt,null);assert.equal(args.select.slug,true);return matched ? {slug:"arena-a",name:"Arena A",logoUrl:"/logo.svg"} : null;},
   findMany: async (args: any) => {calls.directory++;assert.deepEqual(JSON.parse(JSON.stringify(args)),{where:{archivedAt:null,accountStatus:"ACTIVE"},select:{name:true,slug:true},orderBy:{name:"asc"},take:1000});return [{slug:"arena-b",name:"Arena B"}];},
  }}},
 };
 const exports: any = {};
 const source = readFileSync(new URL("../src/app/portal/page.tsx",import.meta.url),"utf8");
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(name:string)=>mocks[name]??{}});
 const result = await exports.default();
 assert.equal(result.props.children.type,component);
 return {calls,props:JSON.parse(JSON.stringify(result.props.children.props))};
}

test("domínio da arena abre cadastro diretamente sem link ou código",async()=>{
 const result=await renderLogin("arena.example:443",true);
 assert.equal(result.props.arenaSlug,"arena-a");assert.deepEqual(result.props.arenas,[]);assert.deepEqual(result.calls,{directory:0,specific:1});
});
test("portal geral permite selecionar pelo nome somente arenas ativas",async()=>{
 const result=await renderLogin("portal.example",false);
 assert.deepEqual(result.props,{arenas:[{slug:"arena-b",name:"Arena B"}]});assert.deepEqual(result.calls,{directory:1,specific:0});
});
test("arena indisponível não é inferida nem imposta ao cadastro",async()=>{
 const result=await renderLogin("arena.example",false);
 assert.deepEqual(result.props,{arenas:[{slug:"arena-b",name:"Arena B"}]});assert.deepEqual(result.calls,{directory:1,specific:1});
});
