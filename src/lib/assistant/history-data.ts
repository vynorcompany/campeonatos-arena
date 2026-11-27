import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { assistantHistorySchema } from "@/lib/backend/contracts/assistant";
export async function getAssistantHistory(arenaId:string,userId:string) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  return origin ? readBackendContract(origin,"/api/management/assistant",assistantHistorySchema,{cookie:(await managementCookieHeader())??""},{timeoutMs:60000}) : (await import("@/lib/backend/services/assistant-history")).resolveAssistantHistory(arenaId,userId);
}
