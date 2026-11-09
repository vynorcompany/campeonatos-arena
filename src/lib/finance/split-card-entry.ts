import type { Prisma } from "@prisma/client";
import { createCardInstallmentEntries } from "./card-installment-service";
import { assertRecordVersion, recordVersion } from "../record-version";
export async function splitCardEntry(tx:Prisma.TransactionClient,arenaId:string,input:{entryId:string;expectedUpdatedAt:string;count:number;firstDueDate:Date;requestId:string}) {
 await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${input.entryId} AND "arenaId"=${arenaId} FOR UPDATE`;
 const original=await tx.financialEntry.findFirst({where:{id:input.entryId,arenaId},include:{settlements:true,scheduleParticipant:{select:{id:true}},fiscalDocument:{select:{id:true}}}});
 if(!original)throw new Error("Lançamento não encontrado.");
 const duplicate=await tx.financialEntry.findFirst({where:{arenaId,externalReference:`card-installments:${input.requestId}:1`}});if(duplicate)return;
 assertRecordVersion(recordVersion(original.updatedAt),input.expectedUpdatedAt);
 if(original.source!=="MANUAL"||original.status!=="PENDING"||original.settlements.length||original.recurrenceId||original.saleId||original.scheduleParticipant||original.fiscalDocument||original.onlinePaymentId||original.onlinePaymentUrl||original.planId)throw new Error("Somente lançamentos avulsos em aberto, sem baixas ou cobranças emitidas, podem ser reorganizados em parcelas.");
 await createCardInstallmentEntries(tx,{arenaId,type:original.type,source:"MANUAL",category:original.category,description:original.description,counterpartyName:original.counterpartyName,amountCents:original.amountCents,dueDate:input.firstDueDate,status:"PENDING",bankAccountId:original.bankAccountId,supplierId:original.supplierId,payeeEmployeeId:original.payeeEmployeeId,payeeTeacherId:original.payeeTeacherId,playerId:original.playerId,billingPlayerId:original.billingPlayerId,teacherId:original.teacherId,competenceDate:original.competenceDate,productId:original.productId,notes:original.notes},input.count,input.requestId);
 await tx.financialEntry.update({where:{id:original.id},data:{status:"VOIDED",voidedAt:new Date(),voidReason:`Reorganizado em ${input.count} parcelas no cartão de crédito.`}});
}
