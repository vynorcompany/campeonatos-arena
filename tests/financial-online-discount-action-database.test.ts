import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import * as schemas from "../src/lib/finance/action-schemas";
import { parseMoneyToCents } from "../src/lib/finance/inputs";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";
import { claimFinancialOnlineCharge } from "../src/lib/payments/financial-online-charge-claim";
import { hasExistingOnlineCharge } from "../src/lib/payments/existing-online-charge";
const require=createRequire(import.meta.url);
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL??"";
const enabled=(()=>{try{const u=new URL(url);return u.hostname==="127.0.0.1"&&u.port==="55433"&&u.pathname==="/arena_goal"}catch{return false}})();
test("staff emits the quoted Pix and boleto amount, preserves principal and refuses changed quotes after uncertain provider failures",{skip:!enabled},async()=>{
 const admin=new PrismaClient({datasources:{db:{url}}});const runtimeUrl=new URL(url);runtimeUrl.username="arena_runtime";runtimeUrl.password="";const runtime=new PrismaClient({datasources:{db:{url:runtimeUrl.toString()}}});const arenas:string[]=[];
 try{
  const arena=await admin.arena.create({data:{name:"Online discount QA",slug:`quote-${randomUUID()}`,createdById:"goal-test"}});arenas.push(arena.id);
  const player=await admin.player.create({data:{arenaId:arena.id,name:"Cliente cotação QA",email:"quote@example.test"}});
  const calls:{amountCents:number;externalReference:string}[]=[];let fail=false;
  const provider=async(input:{amountCents:number;externalReference:string})=>{calls.push(input);if(fail)throw Error("Synthetic timeout");return {paymentId:`test-${input.externalReference}`,checkoutUrl:"https://example.test/charge",qrCode:"synthetic-code",expiresAt:new Date(Date.now()+3600000)}};
  const scope=<T>(arenaId:string,run:(tx:Prisma.TransactionClient)=>Promise<T>)=>runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;return run(tx)});
  const mocks:Record<string,unknown>={
   "@/lib/auth/guards":{requirePermission:async()=>({arenaId:arena.id,userId:"goal-test"})},
   "@/lib/rls":{withArenaTransaction:scope},"@/lib/finance/action-schemas":schemas,
   "@/lib/finance/inputs":{parseMoneyToCents},"@/lib/finance/ledger":{getFinancialEntryBalance},
   "@/lib/payments/existing-online-charge":{hasExistingOnlineCharge},"@/lib/payments/financial-online-charge-claim":{claimFinancialOnlineCharge},
   "@/lib/payments/mercado-pago":{createPixPayment:provider,createBoletoPayment:provider,getMissingBoletoPayerFields:()=>[]},
   "@/lib/finance/revalidation":{refreshFinanceRoutes(){}},
  };
  const actions:Record<string,(data:FormData)=>Promise<{error?:string;url?:string}>>={};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/finance.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:actions,FormData,Date,Intl,console:{error(){}},require:(name:string)=>mocks[name]??(name.startsWith("@/")?{}:require(name))});
  const create=()=>admin.financialEntry.create({data:{arenaId:arena.id,playerId:player.id,type:"REVENUE",category:"QA",description:"Quote action QA",amountCents:10000,status:"PENDING"}});
  const issue=(entryId:string,method:string,discount:string,mode="AMOUNT",interest="0,00",amount?:string)=>{const data=new FormData();for(const[key,value]of Object.entries({entryId,method,discount,discountMode:mode,interest,...amount?{amount}:{}}))data.set(key,value);return actions.generateFinancialEntryOnlineChargeAction(data)};
  const pix=await create();assert((await issue(pix.id,"PIX","10","PERCENTAGE","5,00","95,00")).url);assert.equal(calls.at(-1)?.amountCents,9500);
  const saved=await admin.financialEntry.findUniqueOrThrow({where:{id:pix.id},include:{settlements:true}});assert.equal(saved.amountCents,10000);assert.equal(saved.onlineChargeDiscountCents,1000);assert.equal(saved.onlineChargeInterestCents,500);assert.equal(saved.settlements.length,0);assert.equal(saved.status,"PENDING");
  assert((await issue(pix.id,"PIX","10","PERCENTAGE")).error);assert.equal(calls.length,1);
  const boleto=await create();assert((await issue(boleto.id,"BOLETO","15,00","AMOUNT","0,00","85,00")).url);assert.equal(calls.at(-1)?.amountCents,8500);
  const invalid=await create();assert((await issue(invalid.id,"PIX","101","PERCENTAGE")).error);assert((await issue(invalid.id,"PIX","100","PERCENTAGE")).error);assert.equal(calls.length,2);
  const uncertain=await create();fail=true;assert((await issue(uncertain.id,"PIX","10,00")).error);assert.equal(calls.length,3);
  fail=false;assert((await issue(uncertain.id,"PIX","20,00")).error);assert.equal(calls.length,3);
  assert((await issue(uncertain.id,"PIX","10,00")).url);assert.equal(calls.length,4);assert.equal(calls.at(-1)?.amountCents,9000);
  assert.equal(await admin.financialSettlement.count({where:{arenaId:arena.id}}),0);
  const overdue=await create();await admin.financialEntry.update({where:{id:overdue.id},data:{status:"OVERDUE"}});assert((await issue(overdue.id,"PIX","5,00","AMOUNT","0,00","95,00")).url);assert.equal(calls.at(-1)?.amountCents,9500);
  const partial=await create();await admin.financialEntry.update({where:{id:partial.id},data:{status:"PARTIAL"}});await admin.financialSettlement.create({data:{arenaId:arena.id,financialEntryId:partial.id,amountCents:4000,paymentMethod:"PIX",paidAt:new Date()}});
  assert((await issue(partial.id,"PIX","5,00","AMOUNT","0,00","55,00")).url);assert.equal(calls.at(-1)?.amountCents,5500);
  assert.equal((await admin.financialEntry.findUniqueOrThrow({where:{id:partial.id}})).amountCents,10000);
  assert.equal(await admin.financialSettlement.count({where:{arenaId:arena.id}}),1);

 }finally{await admin.arena.deleteMany({where:{id:{in:arenas}}});await runtime.$disconnect();await admin.$disconnect()}
});
