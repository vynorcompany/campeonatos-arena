import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { arenaWallClockToInstant, instantToArenaWallClock } from "../calendar/arena-wall-clock";
import { creditExpiration, expiryPolicySchema } from "./credit-expiry-policy";
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
/** One account lock covers grants, migration of the existing balance and consumption. */
export async function lessonCreditState(tx: Prisma.TransactionClient, arenaId: string, studentId: string, now = new Date()) {
  await tx.$queryRaw`SELECT id FROM "Student" WHERE id=${studentId} AND "arenaId"=${arenaId} FOR UPDATE`;
  const student = await tx.student.findFirst({ where: { id: studentId, arenaId }, include: { subscriptions: { where: { status: "ACTIVE", startedAt: { lte: now } }, orderBy: { startedAt: "desc" }, take: 1, include: { plan: true } } } });
  if (!student) throw new Error("Aluno não encontrado nesta arena.");
  const sub = student.subscriptions[0]; const local = instantToArenaWallClock(now); const month = monthKey(local);
  const policy = expiryPolicySchema.parse(sub?.plan ?? {});
  const initialized = await tx.lessonCreditBatch.findUnique({ where: { studentId_sourceKey: { studentId, sourceKey: "INITIAL" } } });
  if (!initialized) {
    const old = await tx.studentMonthlyBalance.findUnique({ where: { studentId_referenceMonth: { studentId, referenceMonth: month } } });
    let initial = Math.max(0, old?.remainingClasses ?? (student.remainingClasses>0?student.remainingClasses:sub?.classesPerMonth??0));
    const newEnrollment = Boolean(sub?.plan.creditPolicyConfiguredAt && sub.createdAt >= sub.plan.creditPolicyConfiguredAt);
    if (newEnrollment) initial=0;
    await tx.lessonCreditBatch.create({ data: { arenaId, studentId, sourceKey: "INITIAL", granted: initial, remaining: initial, grantedAt: now, expiresAt: sub && !sub.plan.creditPolicyConfiguredAt ? creditExpiration(arenaWallClockToInstant(new Date(local.getFullYear(),local.getMonth(),1)),policy) : null } });
    if (sub && !newEnrollment) await tx.lessonCreditBatch.create({ data: { arenaId, studentId, sourceKey: `MONTH:${sub.id}:${month}`, granted: 0, remaining: 0, grantedAt: now } });
  }
  if (sub && sub.classesPerMonth > 0) {
    const latest = await tx.lessonCreditBatch.findFirst({ where: { arenaId, studentId, sourceKey: { startsWith: `MONTH:${sub.id}:` } }, orderBy: { sourceKey: "desc" } });
    const key = latest?.sourceKey.slice(-7).split("-").map(Number);
    const cursor = key ? new Date(key[0], key[1]-1, 1) : new Date(instantToArenaWallClock(sub.startedAt));
    cursor.setDate(1); if (latest) cursor.setMonth(cursor.getMonth()+1);
    // Each monthly allowance keeps its own deadline, so quarterly/annual credits carry over.
    for (let i=0; monthKey(cursor)<=month && i<1200; i++,cursor.setMonth(cursor.getMonth()+1)) {
      const monthStart = arenaWallClockToInstant(new Date(cursor.getFullYear(),cursor.getMonth(),1));
      const grantedAt = sub.startedAt>monthStart ? sub.startedAt : monthStart;
      await tx.lessonCreditBatch.upsert({ where: { studentId_sourceKey: { studentId, sourceKey: `MONTH:${sub.id}:${monthKey(cursor)}` } }, create: { arenaId, studentId, sourceKey: `MONTH:${sub.id}:${monthKey(cursor)}`, granted: sub.classesPerMonth, remaining: sub.classesPerMonth, grantedAt, expiresAt: creditExpiration(grantedAt, policy) }, update: {} });
    }
  }
  const batches = await tx.lessonCreditBatch.findMany({ where: { arenaId, studentId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, include: { request: true }, orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { grantedAt: "asc" }, { id: "asc" }] });
  const available = batches.reduce((n,b)=>n+b.remaining,0);
  if (!Number.isSafeInteger(available) || available>2147483647) throw new Error("O saldo de créditos ultrapassa o limite permitido.");
  if (student.remainingClasses !== available) { await tx.student.update({ where: { id: studentId }, data: { remainingClasses: available } }); await syncMonthlyCreditBalance(tx,arenaId,studentId,available,now); }
  return { student, batches, available, policy };
}
export async function changeLessonCredits(tx: Prisma.TransactionClient, arenaId: string, studentId: string, delta: number, now = new Date()) {
  if (!Number.isSafeInteger(delta)) throw new Error("Quantidade de créditos inválida.");
  const state=await lessonCreditState(tx,arenaId,studentId,now);
  if (state.available+delta<0) throw new Error("Não há créditos de aulas disponíveis.");
  if (delta>0) await tx.lessonCreditBatch.create({ data:{arenaId,studentId,sourceKey:`MANUAL:${randomUUID()}`,granted:delta,remaining:delta,grantedAt:now,expiresAt:creditExpiration(now,state.policy)} });
  let left=-delta;
  for (const batch of state.batches) { if(left<=0)break; const amount=Math.min(batch.remaining,left);await tx.lessonCreditBatch.update({where:{id:batch.id},data:{remaining:{decrement:amount}}}); left-=amount; }
  const remaining=state.available+delta;
  await tx.student.update({where:{id:studentId},data:{remainingClasses:remaining,...(delta>0?{totalClasses:{increment:delta}}:{})}});
  await syncMonthlyCreditBalance(tx,arenaId,studentId,remaining,now,state.available+Math.max(0,delta));
  return remaining;
}
export async function consumeLessonCredit(tx: Prisma.TransactionClient, arenaId:string,studentId:string,attendanceId:string,now=new Date()) {
  const state=await lessonCreditState(tx,arenaId,studentId,now);
  const attendance=await tx.lessonAttendance.findFirst({where:{id:attendanceId,studentId,lesson:{arenaId}},select:{id:true,creditBatchId:true}});
  if (!attendance)throw new Error("Aula não encontrada para este aluno.");
  if (attendance.creditBatchId)return state.available;
  const batch=state.batches[0];if(!batch)throw new Error("Não há créditos de aulas disponíveis.");
  await tx.lessonCreditBatch.update({where:{id:batch.id},data:{remaining:{decrement:1}}});
  await tx.lessonAttendance.update({where:{id:attendance.id},data:{creditBatchId:batch.id}});
  await tx.student.update({where:{id:studentId},data:{remainingClasses:state.available-1}});
  await syncMonthlyCreditBalance(tx,arenaId,studentId,state.available-1,now,state.available);
  return state.available-1;
}

async function syncMonthlyCreditBalance(tx:Prisma.TransactionClient,arenaId:string,studentId:string,remaining:number,now:Date,total=remaining) {const month=monthKey(instantToArenaWallClock(now));await tx.studentMonthlyBalance.upsert({where:{studentId_referenceMonth:{studentId,referenceMonth:month}},create:{arenaId,studentId,referenceMonth:month,totalClasses:total,remainingClasses:remaining},update:{remainingClasses:remaining}});}

export async function preservePlanCreditBatches(tx:Prisma.TransactionClient,arenaId:string,planId:string){const students=await tx.studentSubscription.findMany({where:{arenaId,planId,status:"ACTIVE"},select:{studentId:true},distinct:["studentId"],orderBy:{studentId:"asc"}});for(const s of students)await lessonCreditState(tx,arenaId,s.studentId);}

/** Batch reads keep a teacher's overview accurate without one full refresh per student. */
export async function lessonCreditBalances(tx:Prisma.TransactionClient,arenaId:string,studentIds:string[],now=new Date()) {
 if(!studentIds.length)return new Map<string,number>();
 const month=monthKey(instantToArenaWallClock(now));
 const students=await tx.student.findMany({where:{arenaId,id:{in:studentIds},active:true},select:{id:true,subscriptions:{where:{status:"ACTIVE",startedAt:{lte:now}},orderBy:{startedAt:"desc"},take:1,select:{id:true}}}});
 const marks=await tx.lessonCreditBatch.findMany({where:{arenaId,studentId:{in:studentIds},OR:[{sourceKey:"INITIAL"},{sourceKey:{endsWith:`:${month}`}}]},select:{studentId:true,sourceKey:true}});
 const keys=new Set(marks.map(m=>`${m.studentId}|${m.sourceKey}`));
 for(const student of students.sort((a,b)=>a.id.localeCompare(b.id))){const sub=student.subscriptions[0];if(!keys.has(`${student.id}|INITIAL`) || (sub && !keys.has(`${student.id}|MONTH:${sub.id}:${month}`)))await lessonCreditState(tx,arenaId,student.id,now);}
 const sums=await tx.lessonCreditBatch.groupBy({by:["studentId"],where:{arenaId,studentId:{in:studentIds},OR:[{expiresAt:null},{expiresAt:{gt:now}}]},_sum:{remaining:true}});
 return new Map(sums.map(s=>[s.studentId,s._sum.remaining??0]));
}
