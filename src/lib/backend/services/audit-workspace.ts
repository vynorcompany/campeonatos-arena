import 'server-only';
import type { Prisma } from '@prisma/client';
import { withArenaTransaction } from '@/lib/rls';
import { auditSnapshotRows } from '@/lib/audit/presentation';
import { actionLabel } from '@/lib/audit/event-label';
import { auditWorkspaceDataSchema,type AuditWorkspaceQuery } from '@/lib/backend/contracts/audit-workspace';
export async function resolveAuditWorkspace(arenaId:string,global:boolean,filters:AuditWorkspaceQuery){
 const page=filters.page,q=filters.q;
 const where:Prisma.AuditEventWhereInput={arenaId:global?null:arenaId};
 if(q)where.OR=[{actorName:{contains:q,mode:'insensitive'}},{action:{contains:q,mode:'insensitive'}},{details:{path:['path'],string_contains:q}},{entityId:{contains:q}}];
  const businessModels = ["Comanda", "ComandaItem", "ScheduleOccurrence", "ScheduleBookingSeries", "Product", "Player", "Teacher", "Court", "FinancialEntry", "Supplier", "ProductCategory", "FinancialCategory", "PaymentMethodSetting", "ArenaServicePrice", "CashRegister", "CashMovement", "Tournament", "Coupon", "PermissionProfile", "FinancialSettlement", "Sale", "SalePayment", "ClientBalanceMovement", "ScheduleServiceReservation"];
  where.action = { in: businessModels.flatMap(model => ["CREATE", "UPDATE", "DELETE"].map(operation => `DB:${operation}:${model}`)) };
  const since = /^\d{4}-\d{2}-\d{2}$/.test(filters.from ?? "") ? new Date(`${filters.from}T00:00:00-03:00`) : null;
  const until = /^\d{4}-\d{2}-\d{2}$/.test(filters.until ?? "") ? new Date(new Date(`${filters.until}T00:00:00-03:00`).getTime() + 86400000) : null;
  if (since || until) where.createdAt = { ...(since && !Number.isNaN(since.getTime()) ? { gte: since } : {}), ...(until && !Number.isNaN(until.getTime()) ? { lt: until } : {}) };
  const [events, total] = await withArenaTransaction(arenaId, async tx => {
    if (global) await tx.$executeRaw`SELECT set_config('app.audit_agency', 'true', true)`;
    return Promise.all([tx.auditEvent.findMany({ select: { id: true, entityId: true, action: true, createdAt: true, actorName: true, details: true }, where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 50, take: 50 }), tx.auditEvent.count({ where })]);
  });
 return auditWorkspaceDataSchema.parse({page,global,total,events:events.map(event=>{
  const details=event.details&&typeof event.details==='object'&&!Array.isArray(event.details)?event.details:{};
  const snapshot=details.after&&typeof details.after==='object'&&!Array.isArray(details.after)?details.after:details.before&&typeof details.before==='object'&&!Array.isArray(details.before)?details.before:{};
  return{id:event.id,entityId:event.entityId,action:event.action,createdAt:event.createdAt.toISOString(),actorName:event.actorName,label:actionLabel(event.action,details),recordName:String(snapshot.name??snapshot.label??snapshot.title??details.code??details.name??details.description??''),statusText:typeof details.statusCode==='number'?`HTTP ${details.statusCode}${details.stage==='INTERRUPTED'?' · conexão interrompida':''}`:details.stage==='REQUESTED'?'Solicitação registrada':null,affectedArenaCount:global&&typeof details.affectedArenaCount==='number'&&details.affectedArenaCount>1?details.affectedArenaCount:null,totalCents:typeof details.totalCents==='number'?details.totalCents:null,agent:details.source==='AGENT_API'||details.actorType==='AGENT',changes:auditSnapshotRows(details)};
 })});
}
