import { paidLessonCreditCycle } from "./paid-lesson-credit-cycle";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { arenaWallClockToInstant, instantToArenaWallClock } from "../calendar/arena-wall-clock";
import { creditExpiration, expiryPolicySchema } from "./credit-expiry-policy";
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
/** One account lock covers grants, migration of the existing balance and consumption. */
export async function lessonCreditState(tx: Prisma.TransactionClient, arenaId: string, studentId: string, now = new Date()) {
  const local = instantToArenaWallClock(now);
  const activationEnd = new Date(local.getFullYear(), local.getMonth(), local.getDate() + 1);
  await tx.$queryRaw`SELECT id FROM "Student" WHERE id=${studentId} AND "arenaId"=${arenaId} FOR UPDATE`;
  const student = await tx.student.findFirst({ where: { id: studentId, arenaId }, include: { subscriptions: { where: { status: "ACTIVE", startedAt: { lt: activationEnd } }, orderBy: { startedAt: "desc" }, include: { plan: true } } } });
  if (!student) throw new Error("Aluno não encontrado nesta arena.");
  const sub = student.subscriptions[0]; const month = monthKey(local);
  const policy = expiryPolicySchema.parse(sub?.plan ?? {});
  const initialized = await tx.lessonCreditBatch.findUnique({ where: { studentId_sourceKey: { studentId, sourceKey: "INITIAL" } } });
  if (!initialized) {
    const old = await tx.studentMonthlyBalance.findUnique({ where: { studentId_referenceMonth: { studentId, referenceMonth: month } } });
    let initial = Math.max(0, old?.remainingClasses ?? student.remainingClasses);
    const newEnrollment = Boolean(sub?.plan.creditPolicyConfiguredAt && sub.createdAt >= sub.plan.creditPolicyConfiguredAt);
    if (newEnrollment) initial=0;
    await tx.lessonCreditBatch.create({ data: { arenaId, studentId, sourceKey: "INITIAL", granted: initial, remaining: initial, grantedAt: now, expiresAt: sub && !sub.plan.creditPolicyConfiguredAt ? creditExpiration(arenaWallClockToInstant(new Date(local.getFullYear(),local.getMonth(),1)),policy) : null } });
    if (sub && !newEnrollment && initial > 0) await tx.lessonCreditBatch.create({ data: { arenaId, studentId, sourceKey: `MONTH:${sub.id}:${month}`, granted: 0, remaining: 0, grantedAt: now } });
  }
  if (student.subscriptions.length) {
    const paid = await tx.financialEntry.findMany({
      where: { arenaId, status: "PAID", type: { in: ["REVENUE", "INCOME"] }, planId: { in: student.subscriptions.map(subscription => subscription.planId) }, OR: [ ...(student.playerId ? [{ playerId: student.playerId }] : []), { recurrence: { studentId } } ] },
      select: { planId: true, dueDate: true, createdAt: true, paidAt: true, status: true },
    });
    for (const subscription of student.subscriptions) {
      if (subscription.classesPerMonth <= 0) continue;
      const subscriptionPolicy = expiryPolicySchema.parse(subscription.plan);
      const cycles = new Map(paid.map(entry => paidLessonCreditCycle(subscription, entry, now)).filter(cycle => cycle !== null).map(cycle => [cycle.sourceKey, cycle]));
      for (const cycle of cycles.values()) {
        const monthStart = arenaWallClockToInstant(new Date(cycle.year, cycle.month, 1));
        const grantedAt = subscription.startedAt > monthStart ? subscription.startedAt : monthStart;
        await tx.lessonCreditBatch.upsert({ where: { studentId_sourceKey: { studentId, sourceKey: cycle.sourceKey } }, create: { arenaId, studentId, sourceKey: cycle.sourceKey, granted: subscription.classesPerMonth, remaining: subscription.classesPerMonth, grantedAt, expiresAt: creditExpiration(grantedAt, subscriptionPolicy) }, update: {} });
      }
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
 const local=instantToArenaWallClock(now);
 const activationEnd=new Date(local.getFullYear(),local.getMonth(),local.getDate()+1);
 const students=await tx.student.findMany({where:{arenaId,id:{in:studentIds},active:true},select:{id:true,playerId:true,subscriptions:{where:{status:"ACTIVE",startedAt:{lt:activationEnd}},select:{id:true,planId:true,startedAt:true,createdAt:true}}}});
 const marks=await tx.lessonCreditBatch.findMany({where:{arenaId,studentId:{in:studentIds},OR:[{sourceKey:"INITIAL"},{sourceKey:{startsWith:"MONTH:"}}]},select:{studentId:true,sourceKey:true}});
 const paid=await tx.financialEntry.findMany({where:{arenaId,status:"PAID",type:{in:["REVENUE","INCOME"]},planId:{in:[...new Set(students.flatMap(student=>student.subscriptions.map(sub=>sub.planId)))]},OR:[{playerId:{in:students.flatMap(student=>student.playerId?[student.playerId]:[])}},{recurrence:{studentId:{in:studentIds}}}]},select:{playerId:true,planId:true,dueDate:true,createdAt:true,paidAt:true,status:true,recurrence:{select:{studentId:true}}}});
 const keys=new Set(marks.map(mark=>`${mark.studentId}|${mark.sourceKey}`));
 for(const student of students.sort((a,b)=>a.id.localeCompare(b.id))){
   const payments=paid.filter(entry=>(student.playerId && entry.playerId===student.playerId)||entry.recurrence?.studentId===student.id);
   const missing=student.subscriptions.some(sub=>payments.some(entry=>{const cycle=paidLessonCreditCycle(sub,entry,now);return cycle && !keys.has(`${student.id}|${cycle.sourceKey}`);}));
   if(!keys.has(`${student.id}|INITIAL`) || missing)await lessonCreditState(tx,arenaId,student.id,now);
 }
 const sums=await tx.lessonCreditBatch.groupBy({by:["studentId"],where:{arenaId,studentId:{in:studentIds},OR:[{expiresAt:null},{expiresAt:{gt:now}}]},_sum:{remaining:true}});
 return new Map(sums.map(s=>[s.studentId,s._sum.remaining??0]));
}
