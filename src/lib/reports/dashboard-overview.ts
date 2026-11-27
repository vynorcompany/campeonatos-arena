import "server-only";
import { dashboardOverviewSchema, dashboardQuerySchema, type DashboardQuery } from "@/lib/backend/contracts/dashboard";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";

export async function getDashboardOverview(arenaId: string, input: DashboardQuery) {
  const query = dashboardQuerySchema.parse(input);
  if (process.env.VX4_BACKEND_ORIGIN) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, value);
    const cookie = await managementCookieHeader();
    return readBackendContract(process.env.VX4_BACKEND_ORIGIN, `/api/management/dashboard?${params}`, dashboardOverviewSchema, cookie ? { cookie } : undefined, { timeoutMs: 45_000 });
  }
  const local = await import('@/lib/backend/services/dashboard');
  return local.resolveDashboardOverview(arenaId, query);
}
