import 'server-only';
import { clientDirectorySchema, clientDirectoryQuerySchema, type ClientDirectoryQuery } from '@/lib/backend/contracts/client-directory';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { readBackendContract } from '@/lib/backend/http-client';
export async function getClientDirectory(arenaId: string, input: ClientDirectoryQuery) {
  const query = clientDirectoryQuerySchema.parse(input);
  if (process.env.VX4_BACKEND_ORIGIN) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, value);
    const cookie = await managementCookieHeader();
    return readBackendContract(process.env.VX4_BACKEND_ORIGIN, `/api/management/clients?${params}`, clientDirectorySchema, cookie ? { cookie } : undefined, { timeoutMs: 60_000 });
  }
  const local = await import('@/lib/backend/services/client-directory');
  return local.resolveClientDirectory(arenaId, query);
}
