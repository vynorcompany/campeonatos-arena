import "server-only";
import { cookies, headers } from "next/headers";
import { managementCookieHeader } from "./management-context-client";
import { backendOrigin } from "./http-client";
import { comandaFields, comandaInputSchema, comandaOutcomeSchema, portalComandaOperations, type ComandaOperation } from "./contracts/comanda";
export function comandaFormFields(operation: ComandaOperation, form: FormData) {
  const fields: Record<string, string[]> = {};
  for (const key of comandaFields[operation]) {
    const values = form.getAll(key);
    if (values.some(value => typeof value !== "string")) throw new Error("Campo inválido.");
    if (values.length) fields[key] = values as string[];
  }
  return comandaInputSchema(operation).parse({ fields }).fields;
}
export async function remoteComandaMutation(origin: string, operation: ComandaOperation, fields: Record<string, string[]>) {
  const portal = portalComandaOperations.includes(operation);
  const token = portal ? (await cookies()).get("arena_player_session")?.value : null;
  const cookie = portal ? token ? `arena_player_session=${encodeURIComponent(token)}` : "" : await managementCookieHeader();
  const browserOrigin = (await headers()).get("origin");
  const response = await fetch(new URL(`/api/${portal ? "portal" : "management"}/comandas/actions/${operation}`, backendOrigin(origin)), {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...(browserOrigin ? { origin: browserOrigin } : {}) },
    body: JSON.stringify({ fields }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60000),
  });
  const result = comandaOutcomeSchema.parse(await response.json());
  return response.ok ? result : { error: result.error ?? "Não foi possível confirmar a operação." };
}
