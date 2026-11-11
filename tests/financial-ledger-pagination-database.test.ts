import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { PrismaClient, type Prisma } from "@prisma/client";
import { paginationInput, paginationRange } from "../src/lib/pagination";
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL??"";
const disposable=(()=>{try {const u=new URL(url);return u.hostname==="127.0.0.1"&&u.port==="55433"&&u.pathname==="/arena_goal"&&u.username==="postgres";}catch{return false;}})();
test("pagination bounds reject arbitrary sizes and clamp empty/last pages",()=>{
  assert.deepEqual(paginationInput({page:-2,pageSize:999}),{page:1,pageSize:20,skip:0});
  assert.deepEqual(paginationInput({page:"3",pageSize:"50"}),{page:3,pageSize:50,skip:100});
  assert.deepEqual(paginationRange(45,90,20),{page:3,pages:3,from:41,to:45});
  assert.deepEqual(paginationRange(0,3,20),{page:1,pages:1,from:0,to:0});
});
test("financial pagination limits hydrated rows, keeps full-filter totals and isolates the arena",{skip:!disposable},async()=>{
 const admin=new PrismaClient({datasources:{db:{url}}}),runtime=new PrismaClient({datasources:{db:{url:url.replace("postgres@","arena_runtime@")}}});
 const category=`pagination-${randomUUID()}`,ids=Array.from({length:48},()=>randomUUID());
 try {
  const own=await admin.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}}),other=await admin.arena.findUniqueOrThrow({where:{slug:"arena-beta-goal"}});
  await admin.financialEntry.createMany({data:ids.map((id,i)=>({id,arenaId:i===47?other.id:own.id,type:"EXPENSE",category,description:`Item ${i}`,amountCents:100,status:i===45?"PAID":i===46?"VOIDED":"PENDING",source:"MANUAL",dueDate:new Date("2026-11-11T12:00:00Z")}))});
  type Page={entries:{id:string}[];total:number;totalCents:number;activeCount:number;page:number;pageSize:number};
  const exports:{getAccountsLedgerPage?:(id:string,type:string,filters:object,paging:object)=>Promise<Page>}={};const require=createRequire(import.meta.url);
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/finance/accounts.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name:string){
   if(name==="@/lib/rls")return {withArenaTransaction:(arenaId:string,run:(tx:Prisma.TransactionClient)=>Promise<unknown>)=>runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;return run(tx);})};
   if(name==="@/lib/pagination")return require("../src/lib/pagination.ts");
   if(name.startsWith("@/lib/finance/"))return require(`../src/lib/finance/${name.slice("@/lib/finance/".length)}.ts`);return require(name);
  }});
  const read=(page:unknown,pageSize:unknown=20)=>exports.getAccountsLedgerPage!(own.id,"EXPENSE",{category,status:"OPEN"},{page,pageSize});
  const first=await read(1),second=await read(2),third=await read(999);
  assert.equal(first.entries.length,20);assert.equal(second.entries.length,20);assert.equal(third.entries.length,5);assert.equal(third.page,3);
  assert.equal(first.total,45);assert.equal(first.totalCents,4500);assert.equal(first.activeCount,45);
  const unique=new Set([...first.entries,...second.entries,...third.entries].map(e=>e.id));assert.equal(unique.size,45);assert.ok(!unique.has(ids[47]));
  const focused = await exports.getAccountsLedgerPage!(own.id,"EXPENSE",{category,status:"OPEN"},{entryId:third.entries[0].id});
  assert.equal(focused.page,3);assert.ok(focused.entries.some(entry=>entry.id===third.entries[0].id));
  await admin.financialEntry.update({where:{id:ids[0]},data:{amountCents:9000}});
  await admin.financialEntry.update({where:{id:ids[44]},data:{amountCents:7000}});
  const sorted=await exports.getAccountsLedgerPage!(own.id,"EXPENSE",{category,status:"OPEN",sort:"amountCents",direction:"desc"},{page:1});
  assert.deepEqual(sorted.entries.slice(0,2).map(e=>e.id),[ids[0],ids[44]],"ordena todo o conjunto antes de paginar");
  assert.equal((await read(1,100)).entries.length,45);assert.equal((await read(1,999)).entries.length,20);
 }finally{await admin.financialEntry.deleteMany({where:{id:{in:ids}}});await Promise.all([admin.$disconnect(),runtime.$disconnect()]);}
});
