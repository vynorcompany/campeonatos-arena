import 'server-only';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { stockSummaryDataSchema } from '@/lib/backend/contracts/audit-workspace';
export async function getStockSummary(arenaId:string){const origin=process.env.VX4_BACKEND_ORIGIN;return origin?readBackendContract(origin,'/api/management/products/summary',stockSummaryDataSchema,{cookie:(await managementCookieHeader())??''},{timeoutMs:60000}):(await import('@/lib/backend/services/stock-summary')).resolveStockSummary(arenaId);}
