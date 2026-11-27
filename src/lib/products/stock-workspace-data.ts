import 'server-only';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { stockWorkspaceDataSchema, type StockWorkspace, type StockWorkspaceQuery } from '@/lib/backend/contracts/stock-workspaces';
export async function getStockWorkspaceData(arenaId: string, workspace: StockWorkspace, query: StockWorkspaceQuery, canEdit: boolean) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/products/workspaces/${workspace}?${new URLSearchParams(query)}`, stockWorkspaceDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 }) : await (await import('@/lib/backend/services/stock-workspaces')).resolveStockWorkspace(arenaId, workspace, query, canEdit);
  return { ...data, movements: data.movements.map(row => ({ ...row, createdAt: new Date(row.createdAt) })), balances: data.balances.map(row => ({ ...row, createdAt: new Date(row.createdAt) })) };
}
