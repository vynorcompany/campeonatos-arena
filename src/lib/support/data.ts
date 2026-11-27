import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { supportWorkspaceSchema, agencySupportWorkspaceSchema } from "@/lib/backend/contracts/support";
export async function getSupportWorkspace(arenaId:string) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin,"/api/management/support",supportWorkspaceSchema,{cookie:(await managementCookieHeader())??""},{timeoutMs:60000}) : await (await import("@/lib/backend/services/support-workspace")).resolveSupportWorkspace(arenaId);
  return {tickets:data.tickets.map(ticket=>({...ticket,updatedAt:new Date(ticket.updatedAt)}))};
}

export async function getAgencySupportWorkspace() {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  return origin ? readBackendContract(origin,"/api/management/support/agency",agencySupportWorkspaceSchema,{cookie:(await managementCookieHeader())??""},{timeoutMs:60000}) : (await import("@/lib/backend/services/support-workspace")).resolveAgencySupportWorkspace();
}
