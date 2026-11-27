import 'server-only';
import { clientLoyaltyQuerySchema, clientLoyaltySchema } from '@/lib/backend/contracts/client-loyalty';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { readBackendContract } from '@/lib/backend/http-client';
export async function getClientLoyalty(playerId: string) {
  const query = clientLoyaltyQuerySchema.parse({ playerId });
  if (process.env.VX4_BACKEND_ORIGIN) {
    const cookie = await managementCookieHeader();
    return readBackendContract(process.env.VX4_BACKEND_ORIGIN, `/api/management/clients/loyalty?playerId=${encodeURIComponent(query.playerId)}`, clientLoyaltySchema, cookie ? { cookie } : undefined, { timeoutMs: 60_000 });
  }
  const local = await import('@/lib/backend/services/client-loyalty');
  return clientLoyaltySchema.parse(await local.getClientLoyaltyAction(query.playerId));
}
