import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createCardInstallmentEntries } from "../src/lib/finance/card-installment-service";
import { splitCardEntry } from "../src/lib/finance/split-card-entry";
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL??"";const local=/^postgres(?:ql)?:\/\/[^/]+@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("cartão parcelado cria uma série sem dupla contagem, preserva vínculos e substitui somente contas abertas",{skip:!local},async()=>{
 const db=new PrismaClient({datasources:{db:{url}}}),rollback=new Error("rollback QA parcelas");
 try{await assert.rejects(db.$transaction(async tx=>{
  const arena=await tx.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}});
  await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");await tx.$executeRaw`SELECT set_config('app.arena_id',${arena.id},true)`;
  for(const type of ["REVENUE","EXPENSE"]){
   const requestId=randomUUID(),data={arenaId:arena.id,type,category:"QA",description:"Cartão QA",counterpartyName:"Favorecido QA",amountCents:10000,dueDate:new Date("2028-01-31T12:00:00Z"),status:"PENDING"};
   const first=await createCardInstallmentEntries(tx,data,3,requestId),again=await createCardInstallmentEntries(tx,data,3,requestId);assert.equal(first.id,again.id);
   const rows=await tx.financialEntry.findMany({where:{arenaId:arena.id,recurrenceId:first.recurrenceId}});assert.equal(rows.length,3);assert.equal(rows.reduce((n,r)=>n+r.amountCents,0),10000);assert.ok(rows.every(r=>r.status==="PENDING"&&r.paidAt===null&&r.paymentMethod==="Cartão de crédito"));
   assert.equal((await tx.financialRecurrence.findUniqueOrThrow({where:{id:first.recurrenceId!}})).active,false);
  }
  const custom=[{dueDate:"2028-01-05",amountCents:5000},{dueDate:"2028-02-20",amountCents:2000},{dueDate:"2028-04-12",amountCents:3000}];
  for(const type of ["REVENUE","EXPENSE"]){
   const first=await createCardInstallmentEntries(tx,{arenaId:arena.id,type,category:"QA",description:"Personalizadas QA",amountCents:10000,dueDate:new Date("2028-01-31T12:00:00Z"),status:"PENDING"},3,randomUUID(),custom);
   const rows=await tx.financialEntry.findMany({where:{recurrenceId:first.recurrenceId},orderBy:{dueDate:"asc"}});
   assert.deepEqual(rows.map(row=>({dueDate:row.dueDate!.toISOString().slice(0,10),amountCents:row.amountCents})),custom);
   assert.equal((await tx.financialRecurrence.findUniqueOrThrow({where:{id:first.recurrenceId!}})).startsAt.toISOString().slice(0,10),"2028-01-05");
  }
  const original=await tx.financialEntry.create({data:{arenaId:arena.id,type:"EXPENSE",source:"MANUAL",category:"QA",description:"Original QA",amountCents:9000,playerId:"goal-athlete-a",billingPlayerId:"goal-athlete-a",competenceDate:new Date("2028-02-01T12:00:00Z")}});
  const requestId=randomUUID(),input={entryId:original.id,expectedUpdatedAt:original.updatedAt.toISOString(),count:3,firstDueDate:new Date("2028-02-10T12:00:00Z"),requestId};
  await splitCardEntry(tx,arena.id,input);await splitCardEntry(tx,arena.id,input);
  const split=await tx.financialEntry.findFirstOrThrow({where:{arenaId:arena.id,externalReference:`card-installments:${requestId}:1`}});assert.equal(split.billingPlayerId,original.billingPlayerId);assert.equal(split.playerId,original.playerId);assert.equal(split.competenceDate?.toISOString(),original.competenceDate?.toISOString());
  assert.equal((await tx.financialEntry.findUniqueOrThrow({where:{id:original.id}})).status,"VOIDED");assert.equal(await tx.financialEntry.count({where:{arenaId:arena.id,externalReference:{startsWith:`card-installments:${requestId}:`}}}),3);
  const paid=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Quitado QA",source:"MANUAL",amountCents:9000,status:"PAID",paidAt:new Date()}});
  await assert.rejects(splitCardEntry(tx,arena.id,{...input,entryId:paid.id,expectedUpdatedAt:paid.updatedAt.toISOString(),requestId:randomUUID()}),/avulsos em aberto/);
  await assert.rejects(splitCardEntry(tx,"other-arena",{...input,requestId:randomUUID()}),/não encontrado/);
  throw rollback;
 },{timeout:20000}),error=>error===rollback);}finally{await db.$disconnect();}
});
