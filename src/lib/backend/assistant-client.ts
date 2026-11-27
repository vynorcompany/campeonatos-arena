import "server-only";
import { headers } from "next/headers";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { backendOrigin } from "@/lib/backend/http-client";
import { assistantCommandInputSchema,assistantOutcomeSchema,assistantFailureSchema } from "@/lib/backend/contracts/assistant";
export async function remoteAssistantCommand(origin:string,input:string) {
  const payload = assistantCommandInputSchema.parse({input});
  const cookie = await managementCookieHeader();
  const requestOrigin = (await headers()).get("origin");
  const response = await fetch(new URL("/api/management/assistant/command",backendOrigin(origin)),{
    method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},
    body:JSON.stringify(payload),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(assistantFailureSchema.parse(result).error);
  return assistantOutcomeSchema.parse(result);
}
