import 'server-only';
import { cashWorkspaceDataSchema, salesWorkspaceDataSchema } from '@/lib/backend/contracts/cash-register';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
export async function getCashWorkspaceData(arenaId: string) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, '/api/management/pos/workspaces/cash', cashWorkspaceDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 }) : await (await import('@/lib/backend/services/pos-workspaces')).resolveCashWorkspace(arenaId);
  return { ...data, referenceDate: new Date(data.referenceDate) };
}
export async function getSalesWorkspaceData(arenaId: string) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, '/api/management/pos/workspaces/sales', salesWorkspaceDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 }) : await (await import('@/lib/backend/services/pos-workspaces')).resolveSalesWorkspace(arenaId);
  return { ...data, sales: data.sales.map(row => ({ ...row, createdAt: new Date(row.createdAt) })), stockMovements: data.stockMovements.map(row => ({ ...row, createdAt: new Date(row.createdAt) })) };
}
