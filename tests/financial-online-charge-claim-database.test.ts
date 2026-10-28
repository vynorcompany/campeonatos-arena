import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { claimFinancialOnlineCharge } from "../src/lib/payments/financial-online-charge-claim";

function denied(result: Awaited<ReturnType<typeof claimFinancialOnlineCharge>>) {
  assert.equal(result.ok, false);
  return "error" in result ? result.error : "";
}

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("uma emissão financeira por vez, sem trocar Pix por boleto durante tentativa incerta", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const entryIds: string[] = [];
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const otherArena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const createEntry = async () => {
      const entry = await admin.financialEntry.create({ data: {
        id: `goal-charge-${randomUUID()}`, arenaId: arena.id, type: "REVENUE", category: "Teste descartável",
        description: "Cobrança concorrente descartável", amountCents: 5000, status: "PENDING",
      }, select: { id: true } });
      entryIds.push(entry.id);
      return entry.id;
    };
    const claim = (entryId: string, method: "PIX" | "BOLETO", now?: Date) => runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      return claimFinancialOnlineCharge(tx, { arenaId: arena.id, entryId, method, expectedAmountCents: 5000, now });
    });

    const entryId = await createEntry();
    const foreignClaim = await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${otherArena.id}, true)`;
      return claimFinancialOnlineCharge(tx, { arenaId: otherArena.id, entryId, method: "BOLETO", expectedAmountCents: 5000 });
    });
    assert.match(denied(foreignClaim), /não encontrado/);
    const startedAt = new Date();
    assert.equal((await claim(entryId, "PIX", startedAt)).ok, true);
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: entryId }, select: { onlineProvider: true } })).onlineProvider, "MERCADO_PAGO");
    assert.match(denied(await claim(entryId, "PIX", startedAt)), /em andamento/);
    assert.match(denied(await claim(entryId, "BOLETO", startedAt)), /Outro meio/);
    assert.equal((await claim(entryId, "PIX", new Date(startedAt.getTime() + 61_000))).ok, true);
    await admin.financialEntry.update({ where: { id: entryId }, data: { onlinePaymentId: "synthetic-payment-id" } });
    assert.match(denied(await claim(entryId, "PIX")), /já possui uma cobrança/);

    const concurrentId = await createEntry();
    const results = await Promise.all([claim(concurrentId, "PIX"), claim(concurrentId, "BOLETO")]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.match(results.find((result) => !result.ok)?.error ?? "", /Outro meio/);
    const saved = await admin.financialEntry.findUniqueOrThrow({ where: { id: concurrentId }, select: { onlinePaymentClaimMethod: true, onlineProvider: true } });
    assert.ok(["PIX", "BOLETO"].includes(saved.onlinePaymentClaimMethod));
    assert.equal(saved.onlineProvider, "MERCADO_PAGO");
  } finally {
    await admin.financialEntry.deleteMany({ where: { id: { in: entryIds } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});

test("a cotação preserva o principal, congela desconto e juros nas tentativas e valida o valor líquido", { skip: !disposableDatabase }, async () => {
 const admin = new PrismaClient({datasources:{db:{url:testUrl}}}); const runtimeUrl=new URL(testUrl);runtimeUrl.username="arena_runtime";runtimeUrl.password="";const runtime=new PrismaClient({datasources:{db:{url:runtimeUrl.toString()}}});const ids:string[]=[];
 try {
  const arena=await admin.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}});
  const create=async()=>{const row=await admin.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA cotação",description:"Cotação de teste",amountCents:5000,status:"PENDING"}});ids.push(row.id);return row.id;};
  const at=new Date();
  const claim=(entryId:string,extra:Partial<Parameters<typeof claimFinancialOnlineCharge>[1]>={})=>runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;return claimFinancialOnlineCharge(tx,{arenaId:arena.id,entryId,method:"PIX",expectedAmountCents:5000,now:at,...extra});});
  const id=await create();
  const quote={discountCents:1000,interestCents:200,quotedAmountCents:4200};
  const result=await claim(id,quote);assert.equal(result.ok,true);assert.equal(result.ok&&result.amountCents,4200);
  const row=await admin.financialEntry.findUniqueOrThrow({where:{id},include:{settlements:true}});
  assert.equal(row.amountCents,5000);assert.equal(row.status,"PENDING");assert.equal(row.settlements.length,0);
  assert.equal(row.onlineChargeAmountCents,4200);assert.equal(row.onlineChargeDiscountCents,1000);assert.equal(row.onlineChargeInterestCents,200);
  assert.equal((await claim(id,{...quote,now:new Date(at.getTime()+61000)})).ok,true);
  assert.match(denied(await claim(id,{discountCents:900,interestCents:100,quotedAmountCents:4200,now:new Date(at.getTime()+122000)})),/outros valores/);
  const invalid=await create();
  for(const extra of [{discountCents:5001},{discountCents:5000},{discountCents:-1},{interestCents:2147483647},{discountCents:500,quotedAmountCents:4000},{discountCents:4600,method:"BOLETO" as const}])assert.equal((await claim(invalid,extra)).ok,false);
  assert.equal((await admin.financialEntry.findUniqueOrThrow({where:{id:invalid}})).onlinePaymentClaimMethod,"");
 }finally{await admin.financialEntry.deleteMany({where:{id:{in:ids}}});await runtime.$disconnect();await admin.$disconnect();}
});
