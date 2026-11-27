import "server-only";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { backendOrigin } from "@/lib/backend/http-client";
import { agencyBillingPayload, agencyBillingOutcomeSchema, type AgencyBillingOperation } from "@/lib/backend/contracts/agency-billing";
const uncertain = "Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.";
export async function runAgencyBillingMutation(operation: AgencyBillingOperation, form: FormData) {
  let result;
  try {
    const input = agencyBillingPayload(operation, form), origin = process.env.VX4_BACKEND_ORIGIN;
    if (!origin) result = await (await import("@/lib/backend/services/agency-billing-mutations")).executeAgencyBillingMutation(operation, input);
    else {
      const cookie = await managementCookieHeader(), requestOrigin = (await headers()).get("origin");
      const response = await fetch(new URL(`/api/management/agency/billing/${operation}`, backendOrigin(origin)), {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...(cookie ? { cookie } : {}), ...(requestOrigin ? { origin: requestOrigin } : {}) },
        body: JSON.stringify(input), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(90000),
      });
      result = agencyBillingOutcomeSchema.parse(await response.json());
      if (!response.ok && !result.error) throw new Error(uncertain);
    }
  } catch { return { error: uncertain }; }
  if (result.changed) {
    revalidatePath("/agencia/planos");
    if (!["checkout", "grace"].includes(operation)) { revalidatePath("/agencia/financeiro"); revalidatePath("/agencia"); }
  }
  if (result.error) return { error: result.error };
}
