import { withArenaTransaction } from "@/lib/rls";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { getMercadoPagoPayment, cancelMercadoPagoPayment } from "@/lib/payments/mercado-pago";
import { boletoCancellationDisposition } from "@/lib/payments/boleto-cancellation";
/** Financial receipts remain intact. Provider calls never hold database locks. */
export async function reconcileSettledBoletosForArena(arenaId:string) {
 const entries=await withArenaTransaction(arenaId,async tx=>{
  const ids=await tx.$queryRaw<{id:string}[]>`SELECT e.id FROM "FinancialEntry" e
    WHERE e."arenaId"=${arenaId} AND e.type='REVENUE' AND e."boletoReconciledAt" IS NULL
      AND e.status IN ('PAID','PENDING','PARTIAL','OVERDUE')
      AND (e."onlinePaymentClaimMethod"='BOLETO' OR EXISTS (SELECT 1 FROM "FinancialRecurrence" r WHERE r.id=e."recurrenceId" AND r."arenaId"=${arenaId} AND r."onlinePaymentMethod"='BOLETO'))
      AND (e.status='PAID' OR e."amountCents" <= COALESCE((SELECT sum(s."amountCents"+s."discountCents"-s."interestCents") FROM "FinancialSettlement" s WHERE s."financialEntryId"=e.id AND s."arenaId"=${arenaId}),0))
    ORDER BY e."updatedAt",e.id LIMIT 100`;
  return tx.financialEntry.findMany({where:{arenaId,id:{in:ids.map(e=>e.id)}},include:{settlements:{select:{amountCents:true,interestCents:true,discountCents:true}}}});
 });
 let retired=0,failed=0;
 let next=0;
 await Promise.all(Array.from({length:Math.min(4,entries.length)},async()=>{while(next<entries.length){
  const entry=entries[next++];
  if(!getFinancialEntryBalance(entry.amountCents,entry.settlements,entry.status).settled) continue;
  try {
   if(entry.onlinePaymentClaimedAt || (entry.onlinePaymentClaimMethod && !entry.onlinePaymentId)) throw new Error("Emissão sem confirmação.");
   let canceled=Boolean(entry.onlinePaymentCanceledAt),alreadyPaid=false;
   if(entry.onlinePaymentId&&!canceled) {
    const payment=await getMercadoPagoPayment(arenaId,entry.onlinePaymentId);
    const disposition=boletoCancellationDisposition(String(payment.status??""));
    if(disposition==="unsupported") throw new Error("Situação do boleto requer conferência.");
    alreadyPaid=disposition==="preserve";
    if(disposition==="cancel") await cancelMercadoPagoPayment(arenaId,entry.onlinePaymentId);
    canceled=!alreadyPaid;
   }
   await withArenaTransaction(arenaId,async tx=>{
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${entry.id} AND "arenaId"=${arenaId} FOR UPDATE`;
    const current=await tx.financialEntry.findFirst({where:{id:entry.id,arenaId},include:{settlements:{select:{amountCents:true,interestCents:true,discountCents:true}}}});
    if(!current||current.boletoReconciledAt||current.onlinePaymentId!==entry.onlinePaymentId||!getFinancialEntryBalance(current.amountCents,current.settlements,current.status).settled) return;
    await tx.financialEntry.update({where:{id:entry.id},data:{boletoReconciledAt:new Date(),boletoQueueCanceledAt:current.boletoQueueCanceledAt??new Date(),...(canceled?{onlinePaymentCanceledAt:current.onlinePaymentCanceledAt??new Date(),onlinePaymentUrl:"",onlinePaymentQrCode:""}:{})}});
    await tx.auditEvent.create({data:{arenaId,actorId:"SYSTEM",actorName:"Sistema",action:canceled?"BOLETO_PAID_ENTRY_CANCELED":"BOLETO_PAID_ENTRY_RECONCILED",entityId:entry.id,details:{paymentId:entry.onlinePaymentId,alreadyPaid}}});
    if(alreadyPaid&&current.paymentMethod.toUpperCase()!=="BOLETO") await tx.arenaNotification.create({data:{arenaId,type:"ONLINE_CHARGE_PAYMENT_REVIEW",title:"Conferir recebimento do boleto",message:"O lançamento consta recebido e o emissor também registra pagamento do boleto. Confira se houve recebimento duplicado.",href:`/financeiro/contas-a-receber?entryId=${entry.id}`}});
    retired++;
   });
  } catch {
   failed++;
   await withArenaTransaction(arenaId,async tx=>{
    await tx.financialEntry.updateMany({where:{id:entry.id,arenaId,boletoReconciledAt:null},data:{updatedAt:new Date()}});
    const href=`/financeiro/contas-a-receber?entryId=${entry.id}`;
    if(!await tx.arenaNotification.findFirst({where:{arenaId,type:"BOLETO_CANCEL_REVIEW",href,readAt:null},select:{id:true}})) await tx.arenaNotification.create({data:{arenaId,type:"BOLETO_CANCEL_REVIEW",title:"Cancelamento de boleto pendente",message:"O lançamento já foi recebido, mas o cancelamento do boleto ainda precisa de confirmação. A conferência automática tentará novamente.",href}});
   });
  }
 }}));
 return {retired,failed};
}
