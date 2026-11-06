"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { cancelMercadoPagoPayment } from "@/lib/payments/mercado-pago";
export async function cancelQueuedBoletoAction(form:FormData) {
 const auth=await requirePermission("finance:receivable:edit");
 const id=String(form.get("entryId")||"");
 try {
  const paymentId=await withArenaTransaction(auth.arenaId,async tx=>{
   await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${id} AND "arenaId"=${auth.arenaId} FOR UPDATE`;
   const entry=await tx.financialEntry.findFirst({where:{id,arenaId:auth.arenaId,type:"REVENUE"},include:{recurrence:{select:{onlinePaymentMethod:true}}}});
   if(!entry||!(entry.automaticBoleto||entry.onlinePaymentClaimMethod==="BOLETO"||entry.recurrence?.onlinePaymentMethod==="BOLETO")) throw new Error("Boleto não encontrado nesta arena.");
   if(entry.status==="VOIDED") throw new Error("Lançamento cancelado. Atualize a fila.");
   if(entry.onlinePaymentCanceledAt) return "";
   if(entry.onlinePaymentClaimedAt || (entry.onlinePaymentClaimMethod && !entry.onlinePaymentId)) throw new Error("Emissão em andamento ou sem confirmação. Concilie a cobrança antes de cancelar.");
   await tx.financialEntry.update({where:{id},data:{boletoQueueCanceledAt:new Date()}});
   if(!entry.boletoQueueCanceledAt) await tx.auditEvent.create({data:{arenaId:auth.arenaId,actorId:auth.userId,actorName:auth.userName,action:"BOLETO_QUEUE_CANCELED",entityId:id,details:{issued:Boolean(entry.onlinePaymentId)}}});
   return entry.onlinePaymentId;
  });
  // The queue marker is durable before the external call. Failures remain visible
  // for retry and never pretend the provider has canceled an issued payment.
  if(paymentId) {
   await cancelMercadoPagoPayment(auth.arenaId,paymentId);
   await withArenaTransaction(auth.arenaId,async tx=>{
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${id} AND "arenaId"=${auth.arenaId} FOR UPDATE`;
    const entry=await tx.financialEntry.findFirst({where:{id,arenaId:auth.arenaId,onlinePaymentId:paymentId}});
    if(!entry) throw new Error("Lançamento alterado durante a conferência. Atualize o financeiro.");
    await tx.financialEntry.update({where:{id},data:{onlinePaymentCanceledAt:new Date(),onlinePaymentUrl:"",onlinePaymentQrCode:""}});
    await tx.auditEvent.create({data:{arenaId:auth.arenaId,actorId:auth.userId,actorName:auth.userName,action:"BOLETO_PROVIDER_CANCELED",entityId:id,details:{paymentId}}});
   });
  }
 } catch(error) { return {error:error instanceof Error&&!error.name.startsWith("Prisma")?error.message:"Não foi possível cancelar. Confira a cobrança antes de tentar novamente."}; }
 revalidatePath("/financeiro/fila-de-boletos");revalidatePath("/financeiro/contas-a-receber");return {success:true};
}

export async function cancelQueuedBoletosAction(form:FormData) {
 await requirePermission("finance:receivable:edit");
 const ids=[...new Set(form.getAll("entryId").map(String).filter(Boolean))];
 if(!ids.length||ids.length>100)return{error:"Selecione entre 1 e 100 boletos.",failedIds:ids};
 const failedIds:string[]=[],messages:string[]=[];
 let next=0;
 await Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{while(next<ids.length){const id=ids[next++];const item=new FormData();item.set("entryId",id);const result=await cancelQueuedBoletoAction(item);if(result.error){failedIds.push(id);messages.push(result.error);}}}));
 return failedIds.length?{error:`${ids.length-failedIds.length} cancelado(s); ${failedIds.length} pendente(s). ${[...new Set(messages)].join(" ")}`,failedIds}:{success:true,failedIds:[]};
}
export async function reconcileReceivedBoletosAction() {
 const auth=await requirePermission("finance:receivable:edit");
 const {reconcileSettledBoletosForArena}=await import("@/lib/payments/settled-boleto-reconciliation");
 const result=await reconcileSettledBoletosForArena(auth.arenaId);
 if(result.retired){revalidatePath("/financeiro/fila-de-boletos");revalidatePath("/financeiro/contas-a-receber");}
 return result;
}

export async function generateQueuedBoletoNowAction(form:FormData) {
 const auth=await requirePermission("finance:receivable:settle");
 const id=String(form.get("entryId")||"");
 if(!id)return{error:"Selecione um boleto da fila."};
 try {
  const {issueRecurringOnlineChargeForEntry}=await import("@/lib/payments/recurring-online-charges");
  const result=await issueRecurringOnlineChargeForEntry(auth.arenaId,id,new Date(),true);
  revalidatePath("/financeiro/fila-de-boletos");revalidatePath("/financeiro/contas-a-receber");
  return result.created?{success:true}:{error:result.reason??"Boleto não emitido. Confira saldo, dados do cliente, conta bancária e a conexão do emissor; se a emissão já começou, aguarde a confirmação."};
 }catch{return{error:"Não foi possível emitir agora. Confira o cadastro do cliente e a conexão do emissor."};}
}
