import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { instantToArenaWallClock } from "../src/lib/calendar/arena-wall-clock";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { dateOnly } from "../src/lib/academy/plan-transfer-calculation";
import { planTransferQuote, transferStudentPlan } from "../src/lib/academy/plan-transfer";
import { schedulePlanPriceChange, applyDuePlanPriceChanges } from "../src/lib/academy/plan-price-changes";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const safe = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("transferência proporcional, crédito, confirmação desatualizada, reajuste automático idempotente e isolamento RLS", { skip: !safe }, async () => {
 const db = new PrismaClient({datasources:{db:{url}}});const runtime = new PrismaClient({datasources:{db:{url:url.replace('postgres@','arena_runtime@')}}});let owner='';let arena='';
 try {
  owner=(await db.user.create({data:{name:'QA Planos',email:`plans-${randomUUID()}@example.test`,passwordHash:'disabled'}})).id;
  arena=(await db.arena.create({data:{name:'QA Planos',slug:`plans-${randomUUID()}`,createdById:owner}})).id;
  const teacher=await db.teacher.create({data:{arenaId:arena,name:'Professor QA'}});
  const player=await db.player.create({data:{arenaId:arena,name:'Aluno QA'}});
  const student=await db.student.create({data:{arenaId:arena,name:'Aluno QA',playerId:player.id}});
  await db.teacherStudent.create({data:{arenaId:arena,teacherId:teacher.id,studentId:student.id}});
  const [oldPlan,newPlan]=await Promise.all([19900,21900].map(monthlyPriceCents=>db.plan.create({data:{arenaId:arena,name:`Plano ${monthlyPriceCents}`,monthlyPriceCents,classesPerMonth:4}})));
  for(const p of [oldPlan,newPlan])await db.teacherPlan.create({data:{arenaId:arena,teacherId:teacher.id,planId:p.id,monthlyPriceCents:p.monthlyPriceCents}});
  const subscription=await db.studentSubscription.create({data:{arenaId:arena,studentId:student.id,planId:oldPlan.id,dueDay:1,monthlyPriceCents:19900,startedAt:dateOnly('2026-11-01')}});
  const recurrence=await db.financialRecurrence.create({data:{arenaId:arena,planId:oldPlan.id,teacherId:teacher.id,studentId:student.id,playerId:player.id,type:'REVENUE',category:'Planos de aulas',description:'Plano QA',counterpartyName:student.name,amountCents:19900,frequency:'MONTHLY',startsAt:dateOnly('2026-11-01'),nextDueDate:dateOnly('2027-03-01')}});
  for(const date of ['2026-11-01','2026-12-01','2027-01-01','2027-02-01'])await db.financialEntry.create({data:{arenaId:arena,recurrenceId:recurrence.id,planId:oldPlan.id,teacherId:teacher.id,playerId:player.id,type:'REVENUE',category:'Planos de aulas',description:'Plano QA',amountCents:19900,dueDate:dateOnly(date),status:date==='2026-11-01'?'PAID':'PENDING'}});
  const scoped=<T>(operation:(tx:any)=>Promise<T>)=>runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena}, true)`;return operation(tx);},{timeout:30000});
  const issuedBeforeTransfer = await db.financialEntry.findFirstOrThrow({ where: { recurrenceId: recurrence.id, dueDate: dateOnly('2026-12-01') } });
  await db.financialEntry.update({ where: { id: issuedBeforeTransfer.id }, data: { onlinePaymentId: 'qa-transfer-boleto', onlineProvider: 'MERCADO_PAGO' } });
  const today=dateOnly('2026-11-15');const input={teacherId:teacher.id,subscriptionId:subscription.id,targetPlanId:newPlan.id,newDueDate:'2026-12-06'};
  const {quote}=await scoped(tx=>planTransferQuote(tx,arena,input,today));assert.equal(quote.differenceCents,4717);
  await assert.rejects(scoped(tx=>transferStudentPlan(tx,arena,input,'tampered',today)),/dados mudaram/);
  assert.equal(quote.issuedCharges,1);
  let cancellations=0;
  await assert.rejects(scoped(tx=>transferStudentPlan(tx,arena,input,quote.token,today,async()=>{throw new Error('provider unavailable');})),/provider unavailable/);
  assert.equal((await db.studentSubscription.findUniqueOrThrow({where:{id:subscription.id}})).planId,oldPlan.id);
  await scoped(tx=>transferStudentPlan(tx,arena,input,quote.token,today,async(entry)=>{assert.equal(entry.onlinePaymentId,'qa-transfer-boleto');cancellations++;}));
  assert.equal(cancellations,1);
  assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:issuedBeforeTransfer.id}})).status,'VOIDED');
  assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:issuedBeforeTransfer.id}})).onlinePaymentId,'qa-transfer-boleto');
  assert.equal((await db.studentSubscription.findUniqueOrThrow({where:{id:subscription.id}})).dueDay,6);
  assert.equal(await db.financialEntry.count({where:{arenaId:arena,source:'PLAN_TRANSFER',amountCents:4717}}),1);
  assert.equal((await db.financialEntry.findFirstOrThrow({where:{recurrenceId:recurrence.id,dueDate:dateOnly('2026-12-06')}})).amountCents,21900);
  assert.equal((await db.financialEntry.findFirstOrThrow({where:{recurrenceId:recurrence.id,status:'PAID'}})).amountCents,19900);
  await assert.rejects(scoped(tx=>transferStudentPlan(tx,arena,input,quote.token,today)),/diferente/);
  const reverse={...input,targetPlanId:oldPlan.id,newDueDate:'2026-12-06'};
  const reverseQuote=await scoped(tx=>planTransferQuote(tx,arena,reverse,today));assert.ok(reverseQuote.quote.differenceCents<0);
  await scoped(tx=>transferStudentPlan(tx,arena,reverse,reverseQuote.quote.token,today));assert.equal(await db.clientBalanceMovement.count({where:{arenaId:arena,playerId:player.id,kind:'MONEY'}}),1);
  await scoped(tx=>schedulePlanPriceChange(tx,{arenaId:arena,teacherId:teacher.id,planId:oldPlan.id,amountCents:23900,effectiveDate:dateOnly('2027-01-01'),userId:owner},today));
  assert.equal(await db.playerNotification.count({where:{playerId:player.id,type:'PLAN_PRICE_CHANGE'}}),1);
  assert.equal(await scoped(tx=>applyDuePlanPriceChanges(tx,arena,dateOnly('2026-12-31'))),0);
  const jan=await db.financialEntry.findFirstOrThrow({where:{recurrenceId:recurrence.id,dueDate:dateOnly('2027-01-06')}});
  await db.financialEntry.update({where:{id:jan.id},data:{onlinePaymentId:'qa-issued-boleto'}});
  assert.equal((await Promise.all([scoped(tx=>applyDuePlanPriceChanges(tx,arena,dateOnly('2027-01-01'))),scoped(tx=>applyDuePlanPriceChanges(tx,arena,dateOnly('2027-01-01')))])).reduce((a,b)=>a+b,0),1);
  assert.equal(await scoped(tx=>applyDuePlanPriceChanges(tx,arena,dateOnly('2027-01-01'))),0);
  assert.equal((await db.plan.findUniqueOrThrow({where:{id:oldPlan.id}})).monthlyPriceCents,23900);
  assert.equal((await db.teacherPlan.findUniqueOrThrow({where:{teacherId_planId:{teacherId:teacher.id,planId:oldPlan.id}}})).monthlyPriceCents,23900);
  assert.equal((await db.studentSubscription.findUniqueOrThrow({where:{id:subscription.id}})).monthlyPriceCents,23900);
  assert.equal(await db.planPriceChange.count({where:{arenaId:arena,status:'APPLIED'}}),1);
  assert.equal((await db.financialRecurrence.findUniqueOrThrow({where:{id:recurrence.id}})).amountCents,23900);
  assert.equal((await db.financialEntry.findUniqueOrThrow({where:{id:jan.id}})).amountCents,19900);
  assert.equal(await db.financialEntry.count({where:{arenaId:arena,source:'PLAN_PRICE_CHANGE',amountCents:4000}}),1);
  assert.equal((await db.financialEntry.findFirstOrThrow({where:{recurrenceId:recurrence.id,dueDate:dateOnly('2027-02-06')}})).amountCents,23900);
  await scoped(tx=>schedulePlanPriceChange(tx,{arenaId:arena,teacherId:teacher.id,planId:oldPlan.id,amountCents:24900,effectiveDate:dateOnly('2027-02-01'),userId:owner},dateOnly('2027-01-01')));
  const source=readFileSync(new URL('../src/lib/academy/plan-price-worker.ts',import.meta.url),'utf8');
  const worker: Record<string,Function>={};
  const mocks: Record<string,unknown>={
    '@/lib/prisma':{prisma:{arena:{findMany:async()=>[{id:arena}]}}},
    '@/lib/rls':{withArenaTransaction:(_arena:string,run:(tx:any)=>Promise<any>)=>scoped(run)},
    '@/lib/calendar/arena-wall-clock':{instantToArenaWallClock},
    './plan-transfer-calculation':{dateOnly},
    './plan-price-changes':{applyDuePlanPriceChanges},
  };
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:worker,require:(name:string)=>mocks[name],Date,console});
  assert.equal((await worker.processPlanPriceChanges(new Date('2027-02-01T02:59:00Z'))).applied,0);
  assert.equal((await worker.processPlanPriceChanges(new Date('2027-02-01T03:00:00Z'))).applied,1);
  assert.equal((await worker.processPlanPriceChanges(new Date('2027-02-01T03:01:00Z'))).applied,0);
  assert.equal((await db.studentSubscription.findUniqueOrThrow({where:{id:subscription.id}})).monthlyPriceCents,24900);
  await runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id', ${'other-arena'}, true)`;assert.equal(await tx.planPriceChange.count({where:{arenaId:arena}}),0);});
 } finally {if(arena)await db.arena.delete({where:{id:arena}});if(owner)await db.user.delete({where:{id:owner}});await runtime.$disconnect();await db.$disconnect();}
});
