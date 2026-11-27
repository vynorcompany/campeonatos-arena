import "server-only";
import { headers } from "next/headers";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { backendOrigin } from "@/lib/backend/http-client";
import { supportFields, supportInputSchema, supportOutcomeSchema, type SupportOperation } from "@/lib/backend/contracts/support";

export async function remoteSupportMutation(origin:string, operation:SupportOperation, form:FormData) {
  const fields:Record<string,string> = {};
  for (const key of supportFields[operation]) {
    const values = form.getAll(key);
    if (values.length > 1 || values.some(value=>typeof value !== "string")) throw new Error("Campo inválido.");
    if (values.length) fields[key] = values[0] as string;
  }
  const payload = supportInputSchema(operation).parse(fields);
  const cookie = await managementCookieHeader();
  const requestOrigin = (await headers()).get("origin");
  const response = await fetch(new URL(`/api/management/support/actions/${operation}`,backendOrigin(origin)),{
    method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},
    body:JSON.stringify(payload),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60000)
  });
  const result = supportOutcomeSchema.parse(await response.json());
  if (!response.ok || result.error) throw new Error(result.error ?? "Não foi possível confirmar a alteração.");
}
