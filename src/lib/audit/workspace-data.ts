import 'server-only';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { auditWorkspaceDataSchema,type AuditWorkspaceQuery } from '@/lib/backend/contracts/audit-workspace';
export async function getAuditWorkspace(arenaId:string,filters:AuditWorkspaceQuery,global:boolean){const origin=process.env.VX4_BACKEND_ORIGIN;const params=new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==undefined).map(([key,value])=>[key,String(value)]));const data=origin?await readBackendContract(origin,`/api/management/audit?${params}`,auditWorkspaceDataSchema,{cookie:(await managementCookieHeader())??''},{timeoutMs:60000}):await(await import('@/lib/backend/services/audit-workspace')).resolveAuditWorkspace(arenaId,global,filters);return{...data,events:data.events.map(event=>({...event,createdAt:new Date(event.createdAt)}))};}
