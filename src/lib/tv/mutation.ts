import"server-only";
import{revalidatePath}from"next/cache";
import{upcomingPayload,remoteUpcomingMutation}from"@/lib/backend/upcoming-client";
import{publicUpcomingError}from"@/lib/backend/upcoming-operation-error";
import type{UpcomingOperation}from"@/lib/backend/contracts/upcoming";
export async function runUpcomingMutation(operation:UpcomingOperation,form:FormData){
 let result;try{const input=await upcomingPayload(operation,form),origin=process.env.VX4_BACKEND_ORIGIN;result=origin?await remoteUpcomingMutation(origin,operation,input):await(await import("@/lib/backend/services/upcoming-mutations")).executeUpcomingMutation(operation,input);}catch(error){return{error:publicUpcomingError(error)??"Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente."};}
 if(!result.error){
  if(operation.startsWith("fixed-")){
   if(operation!=="fixed-options"){revalidatePath("/agenda");revalidatePath("/financeiro/contas-a-receber");}
   if(operation==="fixed-enroll")revalidatePath("/financeiro/fila-de-boletos");
   if(operation==="fixed-options"||operation==="fixed-end")revalidatePath("/proximos-jogos/patrocinios");
   if(operation!=="fixed-end")revalidatePath(`/proximos-jogos/patrocinios/${String(form.get("planId")??"")}`);
  }else{revalidatePath("/proximos-jogos/apresentacao");revalidatePath("/proximos-jogos/tv");if(operation==="plan-insert-sponsor"){revalidatePath("/financeiro/fila-de-boletos");revalidatePath(`/proximos-jogos/patrocinios/${String(form.get("sponsorshipPlanId")??"")}`);}}
 }
 return result;
}
