import 'server-only';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { regulationHistoryDataSchema,regulationPublicDataSchema } from '@/lib/backend/contracts/regulation';
export async function getRegulationHistory(arenaId:string){const origin=process.env.VX4_BACKEND_ORIGIN;const data=origin?await readBackendContract(origin,'/api/management/settings/regulation',regulationHistoryDataSchema,{cookie:(await managementCookieHeader())??''},{timeoutMs:60000}):await(await import('@/lib/backend/services/regulation-data')).resolveRegulationHistory(arenaId);return{documents:data.documents.map(row=>({...row,createdAt:new Date(row.createdAt)}))};}
export async function getPublicRegulation(slug:string){if(!slug||slug.length>200)return null;const origin=process.env.VX4_BACKEND_ORIGIN;return origin?readBackendContract(origin,`/api/public/regulation/${encodeURIComponent(slug)}`,regulationPublicDataSchema,{cookie:''}, {timeoutMs:60000}):(await import('@/lib/backend/services/regulation-data')).resolvePublicRegulation(slug);}
