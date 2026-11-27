import 'server-only';
import { financeWorkspacePageSchema, financeWorkspaceQuerySchema, type FinanceWorkspace } from '@/lib/backend/contracts/finance-workspaces';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
export async function getFinanceWorkspace(arenaId: string, workspace: FinanceWorkspace, month?: string) {
  const query = financeWorkspaceQuerySchema.parse({ mes: month });
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/finance/workspaces/${workspace}${query.mes ? '?mes=' + encodeURIComponent(query.mes) : ''}`, financeWorkspacePageSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 })
    : await (await import('@/lib/backend/services/finance-workspaces')).resolveFinanceWorkspace(arenaId, workspace, query.mes);
  return { ...data, subscriptions: data.subscriptions.map(row => ({ ...row, startedAt: new Date(row.startedAt) })) };
}
