import type { Prisma } from "@prisma/client";
import { cardInstallmentSchedule } from "./card-installments";
export async function createCardInstallmentEntries(tx:Prisma.TransactionClient, data:Prisma.FinancialEntryUncheckedCreateInput, count:number, requestId:string) {
 if(!/^[a-f\d-]{36}$/i.test(requestId))throw new Error("Reabra o lançamento e tente novamente.");
 if(data.status==="PAID")throw new Error("O parcelamento gera lançamentos em aberto. Registre cada pagamento no seu vencimento.");
 const start=data.dueDate instanceof Date?data.dueDate:null;if(!start)throw new Error("Informe o vencimento da primeira parcela.");
 const rows=cardInstallmentSchedule(data.amountCents,count,start),reference=`card-installments:${requestId}`;
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${data.arenaId}:${reference}`},0))`;
 const existing=await tx.financialEntry.findFirst({where:{arenaId:data.arenaId,externalReference:`${reference}:1`}});if(existing)return existing;
 const recurrence=await tx.financialRecurrence.create({data:{arenaId:data.arenaId,type:data.type,counterpartyName:data.counterpartyName??"",category:data.category,description:data.description,amountCents:rows[0].amountCents,frequency:"MONTHLY",startsAt:start,endsAt:rows.at(-1)!.dueDate,nextDueDate:rows.at(-1)!.dueDate,active:false,bankAccountId:data.bankAccountId,supplierId:data.supplierId,payeeEmployeeId:data.payeeEmployeeId,payeeTeacherId:data.payeeTeacherId,playerId:data.playerId,notes:`Cartão de crédito · ${count} parcelas · Total ${(data.amountCents/100).toFixed(2)}. Todas as parcelas já foram geradas.`}});
 let first=null;
 for(const row of rows){const entry=await tx.financialEntry.create({data:{...data,amountCents:row.amountCents,status:"PENDING",paidAt:null,dueDate:row.dueDate,paymentMethod:"Cartão de crédito",recurrenceId:recurrence.id,externalReference:`${reference}:${row.number}`,description:`${data.description} · Parcela ${row.number}/${count}`}});first??=entry;}
 return first!;
}
