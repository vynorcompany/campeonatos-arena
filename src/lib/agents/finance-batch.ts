import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AgentAccessError } from "./access-error";
const money=z.number().int().positive().max(2147483647), date=z.string().datetime();
const entry=z.object({description:z.string().trim().min(1).max(200),category:z.string().trim().min(1).max(80),counterpartyName:z.string().trim().min(1).max(160),type:z.enum(["EXPENSE","REVENUE"]),amountCents:money,interestCents:z.number().int().min(0).max(2147483647),competenceDate:date,dueDate:z.union([date,z.literal("")]),status:z.enum(["PAID","PENDING"]),paidAt:z.union([date,z.literal("")]),paymentMethod:z.string().trim().max(80)}).strict();
export const batchSchema=z.object({items:z.array(z.discriminatedUnion("action",[
 z.object({id:z.string().regex(/^[\w-]{1,64}$/),action:z.literal("create"),entry}).strict(),
 z.object({id:z.string().regex(/^[\w-]{1,64}$/),action:z.enum(["settle","update"]),selector:z.object({supplier:z.string().trim().max(160),description:z.string().trim().max(200),dueDate:z.string().max(10)}).strict(),totalCents:money,paidAt:z.union([date,z.literal("")]),paymentMethod:z.string().trim().max(80)}).strict()
])).min(1).max(20)}).strict().superRefine((b,c)=>{
 if(new Set(b.items.map(i=>i.id)).size!==b.items.length)c.addIssue({code:"custom",message:"IDs repetidos"});
 for(const i of b.items){if(i.action==="create"){
  const e=i.entry;
  if(e.status==="PAID"&&(!e.paidAt||!e.paymentMethod)||e.status==="PENDING"&&(e.paidAt||e.interestCents)||e.amountCents+e.interestCents>2147483647)c.addIssue({code:"custom",message:"Dados de pagamento inválidos"});
 }else{
  if(!i.selector.supplier&&!i.selector.description||i.selector.dueDate&&!/^20\d\d-\d\d-\d\d$/.test(i.selector.dueDate)||i.action==="settle"&&(!i.paidAt||!i.paymentMethod)||i.action==="update"&&(i.paidAt||i.paymentMethod))c.addIssue({code:"custom",message:"Identificação ou dados de baixa inválidos"});
 }}
});
export type Batch=z.infer<typeof batchSchema>;
export async function performBatch(tx:Prisma.TransactionClient,key:{id:string,arenaId:string},requestId:string,body:Batch){
 await tx.$queryRaw`SELECT id FROM "AgentApiKey" WHERE id=${key.id} AND "arenaId"=${key.arenaId} FOR UPDATE`;
 const active=await tx.agentApiKey.findFirst({where:{id:key.id,arenaId:key.arenaId,revokedAt:null,expiresAt:{gt:new Date()}}});
 if(!active?.scopes.includes("finance:write"))throw new AgentAccessError("Permissão de escrita revogada.",403);
 if(body.items.some(i=>i.action!=="create"||i.entry.status==="PAID")&&!active.scopes.includes("finance:settle"))throw new AgentAccessError("Permissão de baixa necessária.",403);
 const entityId=`${key.id}:${requestId}`,digest=createHash("sha256").update(JSON.stringify(body)).digest("hex");
 const prior=await tx.auditEvent.findFirst({where:{arenaId:key.arenaId,actorId:key.id,action:"AGENT_FINANCE_BATCH",entityId}});
 if(prior){const d=prior.details as {digest:string,receipt:Prisma.JsonObject};if(d.digest!==digest)throw new AgentAccessError("Chave já usada com outros dados.",409);return d.receipt;}
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key.arenaId+":agent-finance-batch"},0))`;
 const resolved=new Map<string,Awaited<ReturnType<typeof tx.financialEntry.findFirstOrThrow>>>();
 for(const i of body.items){if(i.action==="create")continue;const s=i.selector;
  const rows=await tx.financialEntry.findMany({where:{arenaId:key.arenaId,status:"PENDING",...(s.supplier?{counterpartyName:{equals:s.supplier,mode:"insensitive"}}:{}),...(s.description?{description:{equals:s.description,mode:"insensitive"}}:{}),...(s.dueDate?{dueDate:{gte:new Date(s.dueDate+"T00:00:00-03:00"),lt:new Date(new Date(s.dueDate+"T00:00:00-03:00").getTime()+86400000)}}:{})},take:2});
  if(rows.length!==1)throw new AgentAccessError(`${i.id}: ${rows.length?"Há mais de uma conta; informe vencimento ou descrição.":"Não encontrei uma conta pendente com esses dados."}`,422);
  await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${rows[0].id} AND "arenaId"=${key.arenaId} FOR UPDATE`;
  const row=await tx.financialEntry.findFirstOrThrow({where:{id:rows[0].id,arenaId:key.arenaId}});
  if(row.saleId||row.recurrenceId||row.onlinePaymentId||row.automaticBoleto||row.planId)throw new AgentAccessError(`${i.id}: Conta vinculada a outro fluxo; requer conferência específica.`,422);
  if(row.status!=="PENDING"||await tx.financialSettlement.count({where:{arenaId:key.arenaId,financialEntryId:row.id}}))throw new AgentAccessError(`${i.id}: A conta já possui baixa ou mudou; confira antes de alterar.`,409);
  if([...resolved.values()].some(x=>x.id===row.id))throw new AgentAccessError("Dois itens apontam para a mesma conta.",422);
  if(i.action==="settle"&&i.totalCents<row.amountCents)throw new AgentAccessError(`${i.id}: Total menor que o principal; informe o desconto.`,422);
  resolved.set(i.id,row);
 }
 const items=[];
 for(const i of body.items){let row;let interestCents=0,totalCents=0;
  if(i.action==="create"){
   const e=i.entry;
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key.arenaId+":financial-category:"+e.category.toLocaleLowerCase("pt-BR")},0))`;
   const category=await tx.financialCategory.findFirst({where:{arenaId:key.arenaId,name:{equals:e.category,mode:"insensitive"}}});
   if(category&&(!category.active||!["BOTH",e.type].includes(category.type)))throw new AgentAccessError("Categoria inativa ou incompatível.",422);
   if(!category)await tx.financialCategory.create({data:{arenaId:key.arenaId,name:e.category,type:e.type}});
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key.arenaId+":supplier:"+e.counterpartyName.toLocaleLowerCase("pt-BR")},0))`;
   let supplier=await tx.supplier.findFirst({where:{arenaId:key.arenaId,name:{equals:e.counterpartyName,mode:"insensitive"}}});
   if(supplier&&!supplier.active)throw new AgentAccessError("Fornecedor inativo.",422);
   if(!supplier)supplier=await tx.supplier.create({data:{arenaId:key.arenaId,name:e.counterpartyName}});
   const {interestCents:interest,...fields}=e;interestCents=interest;totalCents=e.amountCents+interest;
   row=await tx.financialEntry.create({data:{...fields,arenaId:key.arenaId,category:category?.name??e.category,counterpartyName:supplier.name,supplierId:supplier.id,dueDate:e.dueDate?new Date(e.dueDate):null,competenceDate:new Date(e.competenceDate),paidAt:e.paidAt?new Date(e.paidAt):null,source:"AGENT_API",externalReference:`${entityId}:${i.id}`}});
  }else{const old=resolved.get(i.id)!;totalCents=i.totalCents;interestCents=i.action==="settle"?totalCents-old.amountCents:0;
   row=await tx.financialEntry.update({where:{id:old.id,arenaId:key.arenaId},data:i.action==="settle"?{status:"PAID",paidAt:new Date(i.paidAt),paymentMethod:i.paymentMethod}:{amountCents:totalCents}});
  }
  if(i.action==="settle"||i.action==="create"&&i.entry.status==="PAID")await tx.financialSettlement.create({data:{arenaId:key.arenaId,financialEntryId:row.id,bankAccountId:row.bankAccountId,amountCents:totalCents,interestCents,paymentMethod:row.paymentMethod,paidAt:row.paidAt!,notes:"Pagamento já realizado informado pelo agente autorizado."}});
  items.push({id:i.id,action:i.action,state:"saved",verified:true,entryId:row.id,description:row.description,supplier:row.counterpartyName,amountCents:row.amountCents,totalCents,interestCents,status:row.status,dueDate:row.dueDate?.toISOString()??null,competenceDate:row.competenceDate?.toISOString()??null,paidAt:row.paidAt?.toISOString()??null});
 }
 const receipt={state:"saved",verified:true,requestId,items};
 await tx.auditEvent.create({data:{arenaId:key.arenaId,actorId:key.id,actorName:active.name,action:"AGENT_FINANCE_BATCH",entityId,details:{digest,receipt}}});
 await tx.agentApiKey.update({where:{id:key.id,arenaId:key.arenaId},data:{lastUsedAt:new Date()}});return receipt;
}
