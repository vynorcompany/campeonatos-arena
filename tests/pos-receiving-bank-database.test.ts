import * as stockAggregates from "../src/lib/products/stock-aggregates";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { Prisma, PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import { requireReceivingBankAccount } from "../src/lib/finance/receiving-bank-account";
import { recordCashSaleIfOpen } from "../src/lib/finance/cash-register-sales";
import { cashReferenceDate } from "../src/lib/finance/cash-day";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
const require = createRequire(import.meta.url);
test("vendas diretas exigem conta da arena e gravam venda, recebimento e estoque juntos", {skip: !local}, async () => {
  const admin = new PrismaClient({datasources:{db:{url}}});
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({datasources:{db:{url:runtimeUrl.toString()}}});
  const ids:string[]=[];
  try {
    for (let n=0;n<2;n++) ids.push((await admin.arena.create({data:{name:"PDV banco QA",slug:`pos-bank-${randomUUID()}`,createdById:"goal-test"}})).id);
    const [active,inactive,foreign]=await Promise.all([
      admin.bankAccount.create({data:{arenaId:ids[0],name:"Conta ativa"}}),
      admin.bankAccount.create({data:{arenaId:ids[0],name:"Conta inativa",active:false}}),
      admin.bankAccount.create({data:{arenaId:ids[1],name:"Outra arena"}}),
    ]);
    const product=await admin.product.create({data:{arenaId:ids[0],name:"Água QA",sku:`QA-${randomUUID()}`,priceCents:500,costCents:200,stockQuantity:10}});
    const actions:Record<string,(form:FormData)=>Promise<unknown>>={};
    const mocks:Record<string,unknown>={ "@/lib/products/stock-aggregates": stockAggregates,
      "@prisma/client":{Prisma},
      "next/cache":{revalidatePath(){}},
      zod:require("zod"),
      "@/lib/prisma":{prisma:runtime},
      "@/lib/auth/guards":{requireModuleEdit:async()=>({arenaId:ids[0],userId:"goal-test"})},
      "@/lib/arena-database":{arenaDatabase:(id:string)=>arenaDatabaseForTest(runtime,id)},
      "@/lib/finance/receiving-bank-account":{requireReceivingBankAccount},
      "@/lib/finance/cash-register-sales":{recordCashSaleIfOpen},
      "@/lib/finance/cash-day":{cashReferenceDate},
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/pos.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:actions,Date,Math,Map,require:(name:string)=>{if(!(name in mocks))throw Error(`Unexpected import: ${name}`);return mocks[name];}});
    const form=(bankAccountId:string)=>{const data=new FormData();for(const [key,value] of Object.entries({bankAccountId,productId:product.id,quantity:"2",paymentMethod:"PIX",customerName:"Cliente QA",items:JSON.stringify([{productId:product.id,quantity:2}])}))data.set(key,value);return data;};
    for(const action of [actions.createSaleAction,actions.createCartSaleAction])for(const account of ["",inactive.id,foreign.id])await assert.rejects(action(form(account)),/conta bancária/);
    assert.equal(await admin.sale.count({where:{arenaId:ids[0]}}),0);
    assert.equal(await admin.financialEntry.count({where:{arenaId:ids[0]}}),0);
    assert.equal((await admin.product.findUniqueOrThrow({where:{id:product.id}})).stockQuantity,10);
    await actions.createSaleAction(form(active.id));
    await actions.createCartSaleAction(form(active.id));
    const receipts=await admin.financialEntry.findMany({where:{arenaId:ids[0]},include:{sale:{include:{payments:true}}}});
    assert.equal(receipts.length,2);
    for(const receipt of receipts){assert.equal(receipt.bankAccountId,active.id);assert.equal(receipt.amountCents,1000);assert.equal(receipt.status,"PAID");assert.equal(receipt.sale?.payments.length,1);assert.equal(receipt.sale?.payments[0].bankAccountId,active.id);assert.equal(receipt.sale?.payments[0].amountCents,1000);}
    assert.equal((await admin.product.findUniqueOrThrow({where:{id:product.id}})).stockQuantity,6);
    assert.equal(await admin.stockMovement.count({where:{arenaId:ids[0],type:"OUT"}}),2);
  } finally {await admin.sale.deleteMany({where:{arenaId:{in:ids}}});await admin.arena.deleteMany({where:{id:{in:ids}}});await runtime.$disconnect();await admin.$disconnect();}
});
