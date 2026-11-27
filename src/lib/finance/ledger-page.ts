import 'server-only';
import { financeLedgerQuerySchema, financeLedgerPageSchema, type FinanceLedgerType } from '@/lib/backend/contracts/finance-ledger';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { readBackendContract } from '@/lib/backend/http-client';
export async function getFinanceLedgerPage(arenaId: string, type: FinanceLedgerType, input: Record<string, unknown>) {
  const selected = Object.fromEntries(Object.keys(financeLedgerQuerySchema.shape).filter(key => input[key] !== undefined).map(key => [key, input[key]]));
  const query = financeLedgerQuerySchema.parse(selected);
  if (process.env.VX4_BACKEND_ORIGIN) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, value);
    const cookie = await managementCookieHeader();
    return readBackendContract(process.env.VX4_BACKEND_ORIGIN, `/api/management/finance/ledger/${type === 'REVENUE' ? 'receivable' : 'payable'}?${params}`, financeLedgerPageSchema, cookie ? { cookie } : undefined, { timeoutMs: 60_000 });
  }
  const local = await import('@/lib/backend/services/finance-ledger');
  return local.resolveFinanceLedgerPage(arenaId, type, query);
}
