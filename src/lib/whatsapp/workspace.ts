import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { whatsappWorkspaceSchema } from "@/lib/backend/contracts/whatsapp-workspace";
export async function getWhatsAppWorkspace(conversa: string) {
 try {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return await (await import("@/lib/backend/services/whatsapp-workspace")).resolveWhatsAppWorkspace(conversa);
  const query = new URLSearchParams({ conversa });
  return await readBackendContract(origin, `/api/management/whatsapp/workspace?${query}`, whatsappWorkspaceSchema, { cookie: await managementCookieHeader() ?? "" });
 } catch { throw Error("Não foi possível consultar as conversas do WhatsApp."); }
}
