import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient, type Prisma } from "@prisma/client";
import { lessonCreditState, lessonCreditBalances } from "../src/lib/academy/lesson-credits";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const safe = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("mensalidades pendentes e parciais não liberam créditos; quitação tardia e concorrente libera cada mês uma vez", { skip: !safe }, async () => {
 const db = new PrismaClient({datasources:{db:{url}}});
 const runtime = new PrismaClient({datasources:{db:{url:url.replace("postgres@","arena_runtime@")}}});
 let arenaId="",ownerId="";
 const scope=<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>)=>runtime.$transaction(async tx=>{await tx.$executeRaw`SELECT set_config('app.arena_id',${arenaId},true)`;return fn(tx);},{timeout:30000});
 try {
  const owner=await db.user.create({data:{name:"Créditos pagos QA",email:`paid-credits-${randomUUID()}@example.test`,passwordHash:"disabled"}});ownerId=owner.id;
  const arena=await db.arena.create({data:{name:"Créditos pagos QA",slug:`paid-credits-${randomUUID()}`,createdById:owner.id}});arenaId=arena.id;
  const player=await db.player.create({data:{arenaId,name:"Aluno pagamentos QA"}});
  const plan=await db.plan.create({data:{arenaId,name:"Plano pagamentos QA",classesPerMonth:4,creditExpiryCycle:"NONE",creditPolicyConfiguredAt:new Date("2037-12-01T12:00:00Z")}});
  const student=await db.student.create({data:{arenaId,playerId:player.id,name:player.name}});
  const sub=await db.studentSubscription.create({data:{arenaId,studentId:student.id,planId:plan.id,classesPerMonth:4,startedAt:new Date("2038-01-01T12:00:00Z"),createdAt:new Date("2038-01-01T12:00:00Z")}});
  const invoice=async(month:number,status="PENDING")=>db.financialEntry.create({data:{arenaId,playerId:player.id,planId:plan.id,type:"REVENUE",category:"Planos de aulas",description:"Mensalidade QA",amountCents:10000,status,dueDate:new Date(Date.UTC(2038,month,10,12)),createdAt:new Date("2038-01-01T12:00:01Z")}});
  const jan=await invoice(0);const feb=await invoice(1);const mar=await invoice(2,"PAID");await invoice(3,"PAID");
  const janNow=new Date("2038-01-10T15:00:00Z");
  assert.equal((await scope(tx=>lessonCreditState(tx,arenaId,student.id,janNow))).available,0);
  await db.financialEntry.update({where:{id:jan.id},data:{status:"PARTIAL"}});
  assert.equal((await scope(tx=>lessonCreditState(tx,arenaId,student.id,janNow))).available,0);
  await db.financialEntry.update({where:{id:jan.id},data:{status:"PAID",paidAt:janNow}});
  const simultaneous=await Promise.all([scope(tx=>lessonCreditState(tx,arenaId,student.id,janNow)),scope(tx=>lessonCreditState(tx,arenaId,student.id,janNow))]);
  assert(simultaneous.every(state=>state.available===4));
  assert.equal(await db.lessonCreditBatch.count({where:{studentId:student.id,sourceKey:`MONTH:${sub.id}:2038-01`}}),1);
  const marchNow=new Date("2038-03-10T15:00:00Z");
  assert.equal((await scope(tx=>lessonCreditState(tx,arenaId,student.id,marchNow))).available,8);
  await db.financialEntry.update({where:{id:feb.id},data:{status:"PAID",paidAt:marchNow}});
  // February still grants after March has already been granted: no cursor skips it.
  assert.equal((await scope(tx=>lessonCreditBalances(tx,arenaId,[student.id],marchNow))).get(student.id),12);
  assert.equal((await scope(tx=>lessonCreditState(tx,arenaId,student.id,marchNow))).available,12);
  assert.equal(await db.lessonCreditBatch.count({where:{studentId:student.id,sourceKey:`MONTH:${sub.id}:2038-04`}}),0);
  // Duplicate billing records cannot duplicate the monthly allowance.
  await invoice(2,"PAID");
  assert.equal((await scope(tx=>lessonCreditState(tx,arenaId,student.id,marchNow))).available,12);
  assert.equal((await db.student.findUniqueOrThrow({where:{id:student.id}})).remainingClasses,12);
  assert.ok(mar.id);
 } finally {if(arenaId)await db.arena.delete({where:{id:arenaId}});if(ownerId)await db.user.delete({where:{id:ownerId}});await runtime.$disconnect();await db.$disconnect();}
});
