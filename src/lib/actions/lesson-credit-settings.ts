"use server";
import { lessonCreditState, preservePlanCreditBatches } from "@/lib/academy/lesson-credits";
import { arenaWallClockToInstant, instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import { z } from "zod";
import { requireModuleEdit, requirePermission } from "@/lib/auth/guards";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { withArenaTransaction } from "@/lib/rls";
import { refreshAcademyRoutes } from "@/lib/academy/revalidation";
import { readExpiryPolicy } from "@/lib/academy/credit-expiry-policy";
import { playerLessonCredits } from "@/lib/academy/lesson-credit-portal";
import { revalidatePath } from "next/cache";
const refresh = () => {refreshAcademyRoutes();revalidatePath("/home");revalidatePath("/financeiro/planos");};
export async function saveLessonPlanExpiryAction(form:FormData) {
  const auth=await requirePermission("finance:settings:manage"); const planId=String(form.get("planId")??"");
  const policy=readExpiryPolicy(form);
  await withArenaTransaction(auth.arenaId,async tx=>{
    await preservePlanCreditBatches(tx,auth.arenaId,planId);
    const result=await tx.plan.updateMany({where:{id:planId,arenaId:auth.arenaId},data:{...policy,creditPolicyConfiguredAt:new Date(),updatedByUserId:auth.userId}});
    if(!result.count)throw new Error("Plano não encontrado nesta arena.");
  });refresh();
}
export async function saveLessonMakeupPolicyAction(form:FormData) {
  const auth=await requireModuleEdit("teachers");
  const data=z.object({lessonMakeupEnabled:z.boolean(),lessonMakeupLeadHours:z.coerce.number().int().min(0).max(720),lessonMakeupValidityDays:z.coerce.number().int().min(1).max(3650),lessonMakeupMonthEnd:z.boolean(),lessonMakeupPolicy:z.string().trim().max(4000),lessonCreditNoticeDays:z.coerce.number().int().min(1).max(365)}).parse({lessonMakeupEnabled:form.get("lessonMakeupEnabled")==="on",lessonMakeupLeadHours:form.get("lessonMakeupLeadHours"),lessonMakeupValidityDays:form.get("lessonMakeupValidityDays"),lessonMakeupMonthEnd:form.get("lessonMakeupMonthEnd")==="on",lessonMakeupPolicy:form.get("lessonMakeupPolicy")??"",lessonCreditNoticeDays:form.get("lessonCreditNoticeDays")});
  await withArenaTransaction(auth.arenaId,tx=>tx.arenaOperationalSettings.upsert({where:{arenaId:auth.arenaId},create:{arenaId:auth.arenaId,...data},update:data}));refresh();
}
export async function requestLessonCreditRescheduleAction(form:FormData) {
  const arenaSlug=String(form.get("arenaSlug")??"");const batchId=String(form.get("batchId")??"");
  const message=z.string().trim().max(1000).parse(form.get("message")??"");
  const auth=await requirePublicPlayerAuth(arenaSlug);
  await withArenaTransaction(auth.arenaId,async tx=>{
    const state=await playerLessonCredits(tx,auth.arenaId,auth.playerId,arenaSlug);
    if(!state?.makeupEnabled)throw new Error("Esta arena não permite solicitações de reagendamento pelo Portal.");
    const batch=state.batches.find(b=>b.id===batchId && b.near);
    if(!batch)throw new Error("Estes créditos não estão disponíveis para solicitar reagendamento.");
    if(batch.requestStatus)throw new Error("Já existe uma solicitação para estes créditos.");
    await tx.lessonCreditRequest.create({data:{arenaId:auth.arenaId,batchId,message}});
    const source=await tx.lessonCreditBatch.findFirstOrThrow({where:{id:batchId,arenaId:auth.arenaId},include:{student:{include:{teacherAssignments:{where:{active:true,teacher:{active:true}},select:{teacher:{select:{id:true,name:true,playerId:true}}}}}}}});
    const title="Reagendamento de créditos solicitado";
    const text=`${source.student.name} solicitou reagendamento de ${source.remaining} crédito(s).${message?` Preferências: ${message}`:""}`;
    await tx.arenaNotification.create({data:{arenaId:auth.arenaId,type:"LESSON_CREDIT_REQUEST",title,message:text,href:"/aulas#reagendamentos-creditos"}});
    const teacherPlayers=[...new Set(source.student.teacherAssignments.flatMap(a=>a.teacher.playerId?[a.teacher.playerId]:[]))];
    if(teacherPlayers.length)await tx.playerNotification.createMany({data:teacherPlayers.map(playerId=>({playerId,type:"LESSON_CREDIT_REQUEST",title,message:text,href:`/home?arena=${encodeURIComponent(arenaSlug)}&section=teacher#reagendamentos-creditos`}))});
  });refresh();
}
async function resolveRequest(form:FormData, arenaId:string, teacherId?:string) {
  const id=String(form.get("requestId")??"");const status=z.enum(["APPROVED","REJECTED"]).parse(form.get("status"));
  const response=z.string().trim().max(1000).parse(form.get("response")??"");
  await withArenaTransaction(arenaId,async tx=>{
    const request=await tx.lessonCreditRequest.findFirst({where:{id,arenaId,status:"PENDING",...(teacherId?{batch:{student:{teacherAssignments:{some:{arenaId,teacherId,active:true}}}}}:{})},include:{batch:{include:{student:{select:{id:true,playerId:true}}}}}});
    if(!request)throw new Error("Solicitação não encontrada ou já respondida.");
    await tx.$queryRaw`SELECT id FROM "Student" WHERE id=${request.batch.studentId} AND "arenaId"=${arenaId} FOR UPDATE`;
    const claim=await tx.lessonCreditRequest.updateMany({where:{id,arenaId,status:"PENDING"},data:{status,response,resolvedAt:new Date()}});
    if(!claim.count)throw new Error("Esta solicitação já foi respondida.");
    if(status==="APPROVED") {
      const value=String(form.get("expiresAt")??"");
      if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error("Informe a nova data de validade.");
      const expiry=new Date(`${value}T23:59:59.999-03:00`);
      const policy=await tx.arenaOperationalSettings.findUnique({where:{arenaId}});
      const batch=await tx.lessonCreditBatch.findFirstOrThrow({where:{id:request.batchId,arenaId}});
      const original=batch.expiresAt;
      if(!original || batch.remaining<=0 || Number.isNaN(expiry.getTime()))throw new Error("Estes créditos não podem receber uma nova validade.");
      const maximum=instantToArenaWallClock(original);maximum.setDate(maximum.getDate()+(policy?.lessonMakeupValidityDays??30));maximum.setHours(23,59,59,999);
      const wall=instantToArenaWallClock(expiry);const selected=`${wall.getFullYear()}-${String(wall.getMonth()+1).padStart(2,"0")}-${String(wall.getDate()).padStart(2,"0")}`;
      if(selected!==value || expiry<=new Date() || expiry<=original || expiry>arenaWallClockToInstant(maximum))throw new Error("A nova validade deve respeitar o prazo de reposição configurado pela arena.");
      await tx.lessonCreditBatch.update({where:{id:request.batchId},data:{expiresAt:expiry}});
      await lessonCreditState(tx,arenaId,request.batch.studentId);
    }
    const playerId=request.batch.student.playerId;
    if(playerId){const arena=await tx.arena.findUniqueOrThrow({where:{id:arenaId},select:{slug:true}});await tx.playerNotification.create({data:{playerId,type:"LESSON_CREDIT_RESPONSE",title:status==="APPROVED"?"Reagendamento de créditos aprovado":"Solicitação de reagendamento respondida",message:response|| (status==="APPROVED"?"A arena ampliou a validade dos créditos. Combine o horário da aula com seu professor.":"A solicitação não foi aprovada. Consulte as regras de reposição da arena."),href:`/home?arena=${encodeURIComponent(arena.slug)}&section=lessons`}});}
  });refresh();
}
export async function resolveLessonCreditRequestAction(form:FormData){const auth=await requireModuleEdit("students");await resolveRequest(form,auth.arenaId);}
export async function resolveTeacherLessonCreditRequestAction(form:FormData){const slug=String(form.get("arenaSlug")??"");const auth=await requirePublicPlayerAuth(slug);const teacher=await withArenaTransaction(auth.arenaId,tx=>tx.teacher.findFirst({where:{arenaId:auth.arenaId,playerId:auth.playerId,active:true},select:{id:true}}));if(!teacher)throw new Error("Acesso permitido somente ao professor responsável.");await resolveRequest(form,auth.arenaId,teacher.id);}
