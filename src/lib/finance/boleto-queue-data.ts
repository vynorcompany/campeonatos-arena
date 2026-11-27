import 'server-only';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { boletoQueueDataSchema } from '@/lib/backend/contracts/boleto-queue';
export async function getBoletoQueue(arenaId: string, status: 'queue'|'issued'|'canceled', q: string) {
 const origin = process.env.VX4_BACKEND_ORIGIN;
 return origin ? readBackendContract(origin, `/api/management/finance/boleto-queue?${new URLSearchParams({status,q})}`, boletoQueueDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 }) : (await import('@/lib/backend/services/boleto-queue')).resolveBoletoQueue(arenaId,status,q);
}
