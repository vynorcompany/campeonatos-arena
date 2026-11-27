import "server-only";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementUtilitySchemas, accessUnavailableSchema, printerTestSchema, type ManagementUtilityView } from "@/lib/backend/contracts/management-utilities";
async function readUtility(view: ManagementUtilityView) {
  try {
    const origin = process.env.VX4_BACKEND_ORIGIN;
    if (origin) return await readBackendContract<unknown>(origin, `/api/management/utilities/${view}`, managementUtilitySchemas[view], { cookie: await managementCookieHeader() ?? "" });
    const local = await import("@/lib/backend/services/management-utilities");
    return await (view === "access" ? local.resolveAccessUnavailable() : local.resolvePrinterTest());
  } catch { throw new Error("Não foi possível consultar as informações da arena."); }
}
export async function getAccessUnavailable() { return accessUnavailableSchema.parse(await readUtility("access")); }
export async function getPrinterTest() { return printerTestSchema.parse(await readUtility("printer")); }
