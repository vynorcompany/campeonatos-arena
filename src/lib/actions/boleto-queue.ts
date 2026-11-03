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
   if(!entry||!(entry.onlinePaymentClaimMethod==="BOLETO"||entry.recurrence?.onlinePaymentMethod==="BOLETO")) throw new Error("Boleto não encontrado nesta arena.");
   if(["PAID","VOIDED"].includes(entry.status)) throw new Error("Lançamento já quitado ou cancelado. Atualize a fila.");
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
    if(!entry||entry.status==="PAID") throw new Error("Pagamento recebido durante a conferência. Atualize o financeiro.");
    await tx.financialEntry.update({where:{id},data:{onlinePaymentCanceledAt:new Date(),onlinePaymentUrl:"",onlinePaymentQrCode:""}});
    await tx.auditEvent.create({data:{arenaId:auth.arenaId,actorId:auth.userId,actorName:auth.userName,action:"BOLETO_PROVIDER_CANCELED",entityId:id,details:{paymentId}}});
   });
  }
 } catch(error) { return {error:error instanceof Error&&!error.name.startsWith("Prisma")?error.message:"Não foi possível cancelar. Confira a cobrança antes de tentar novamente."}; }
 revalidatePath("/financeiro/fila-de-boletos");revalidatePath("/financeiro/contas-a-receber");return {success:true};
}
