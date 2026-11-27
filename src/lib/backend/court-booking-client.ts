import "server-only";
import { headers } from "next/headers";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { backendOrigin } from "@/lib/backend/http-client";
import { courtBookingFields, courtBookingInputSchema, courtBookingOutcomeSchema, type CourtBookingOperation } from "@/lib/backend/contracts/court-booking";
export function courtBookingFormFields(operation: CourtBookingOperation, form: FormData) {
  const fields: Record<string, string[]> = {};
  for (const key of courtBookingFields[operation]) {
    const values = form.getAll(key);
    if (values.some(value => typeof value !== "string")) throw new Error("Campo inválido.");
    if (values.length) fields[key] = values as string[];
  }
  return courtBookingInputSchema(operation).parse({ fields }).fields;
}
export async function remoteCourtBookingMutation(origin: string, operation: CourtBookingOperation, form: FormData) {
  const fields = courtBookingFormFields(operation, form);
  const cookie = await managementCookieHeader();
  const requestOrigin = (await headers()).get("origin");
  const response = await fetch(new URL(`/api/management/court-bookings/actions/${operation}`, backendOrigin(origin)), {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...(cookie ? { cookie } : {}), ...(requestOrigin ? { origin: requestOrigin } : {}) },
    body: JSON.stringify({ fields }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60000),
  });
  const result = courtBookingOutcomeSchema.parse(await response.json());
  return response.ok ? result : { error: result.error ?? "Não foi possível confirmar a alteração." };
}
