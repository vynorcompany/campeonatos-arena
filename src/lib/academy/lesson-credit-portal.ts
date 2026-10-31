import type { Prisma } from "@prisma/client";
import { lessonCreditState } from "./lesson-credits";
export async function playerLessonCredits(tx: Prisma.TransactionClient, arenaId: string, playerId: string, arenaSlug: string, now=new Date()) {
  const student=await tx.student.findFirst({where:{arenaId,playerId,active:true},select:{id:true}});
  if(!student)return null;
  const state=await lessonCreditState(tx,arenaId,student.id,now);
  const settings=await tx.arenaOperationalSettings.findUnique({where:{arenaId}});
  const noticeDays=settings?.lessonCreditNoticeDays ?? 7;
  const near=state.batches.filter(b=>b.expiresAt && b.expiresAt.getTime()<=now.getTime()+noticeDays*86400000);
  const ids:string[]=[];
  const saved=await tx.playerNotification.findMany({where:{playerId,type:"LESSON_CREDIT_EXPIRY"},select:{id:true,message:true}});
  for(const b of near) {
    const id=`lesson-credit-expiry:${b.id}:${b.expiresAt!.getTime()}`;ids.push(id);
    const message=`${b.remaining} crédito(s) expiram em ${b.expiresAt!.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})}.`;
    const previous=saved.find(n=>n.id===id);
    if(!previous)await tx.playerNotification.create({data:{id,playerId,type:"LESSON_CREDIT_EXPIRY",title:"Créditos de aulas próximos de expirar",message,href:`/home?arena=${encodeURIComponent(arenaSlug)}&section=lessons#credito-${b.id}`}});
    else if(previous.message!==message)await tx.playerNotification.update({where:{id},data:{message}});
  }
  await tx.playerNotification.updateMany({where:{playerId,type:"LESSON_CREDIT_EXPIRY",readAt:null,...(ids.length?{id:{notIn:ids}}:{})},data:{readAt:now}});
  return {available:state.available,batches:state.batches.map(b=>({id:b.id,remaining:b.remaining,expiresAt:b.expiresAt?.toISOString()??null,near:near.some(n=>n.id===b.id),requestStatus:b.request?.status??null})),makeupEnabled:settings?.lessonMakeupEnabled??true,makeupPolicy:settings?.lessonMakeupPolicy??"",noticeDays};
}
