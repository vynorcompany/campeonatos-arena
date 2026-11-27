import "server-only";
import type { AuthContext } from "@/lib/auth/session";
import { managementShellSchema } from "@/lib/backend/contracts/management-shell";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { readBackendContract } from "@/lib/backend/http-client";

export async function getManagementShell(auth: AuthContext & { arenaId: string }) {
  let data;
  if (process.env.VX4_BACKEND_ORIGIN) {
    const cookie = await managementCookieHeader();
    data = await readBackendContract(process.env.VX4_BACKEND_ORIGIN, '/api/management/shell', managementShellSchema, cookie ? { cookie } : undefined, { timeoutMs: 60_000 });
  } else {
    const local = await import('@/lib/backend/services/management-shell');
    data = await local.resolveManagementShell(auth);
  }
  return {
    ...data, notifications: data.notifications.map(item => ({ ...item, createdAt: new Date(item.createdAt) })),
    billingAlert: data.billingAlert ? { ...data.billingAlert, deadline: new Date(data.billingAlert.deadline) } : null,
  };
}
