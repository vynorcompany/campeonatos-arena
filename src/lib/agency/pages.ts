import "server-only";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { readBackendContract } from "@/lib/backend/http-client";
import { agencyMetricsSchema, agencyRecentTicketsSchema, agencyTicketHistorySchema, agencyPlansPageSchema, agencyConnectionsPageSchema, agencyPageSchemas, type AgencyPageView, type AgencyPlansPage } from "@/lib/backend/contracts/agency-pages";

async function readAgencyPage(view: AgencyPageView) {
  try {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (origin) return await readBackendContract<unknown>(origin, `/api/management/agency/workspaces/${view}`, agencyPageSchemas[view], { cookie: await managementCookieHeader() ?? "" }, { timeoutMs: 60000 });
  const local = await import("@/lib/backend/services/agency-pages");
  return await ({ metrics: local.resolveAgencyMetrics, tickets: local.resolveAgencyRecentTickets, history: local.resolveAgencyTicketHistory, plans: local.resolveAgencyPlansPage, connections: local.resolveAgencyConnectionsPage })[view]();
  } catch { throw new Error("Não foi possível consultar a agência."); }
}
export async function getAgencyMetricsPage() { return agencyMetricsSchema.parse(await readAgencyPage("metrics")); }
export async function getAgencyRecentTickets() { return agencyRecentTicketsSchema.parse(await readAgencyPage("tickets")); }
export async function getAgencyTicketHistory() {
  const data = agencyTicketHistorySchema.parse(await readAgencyPage("history"));
  return { tickets: data.tickets.map(row => ({ ...row, updatedAt: new Date(row.updatedAt) })) };
}
export async function getAgencyPlansPage(): Promise<AgencyPlansPage> {
  const data = agencyPlansPageSchema.parse(await readAgencyPage("plans"));
  return { ...data, subscriptions: data.subscriptions.map(row => ({ ...row, trialEndsAt: row.trialEndsAt ? new Date(row.trialEndsAt) : null })), invoices: data.invoices.map(row => ({ ...row, dueAt: new Date(row.dueAt) })) };
}
export async function getAgencyConnectionsPage() {
  const data = agencyConnectionsPageSchema.parse(await readAgencyPage("connections"));
  return { arenas: data.arenas.map(arena => ({ ...arena, whatsappConnection: arena.whatsappConnection ? { ...arena.whatsappConnection, lastConnectedAt: arena.whatsappConnection.lastConnectedAt ? new Date(arena.whatsappConnection.lastConnectedAt) : null } : null })) };
}
