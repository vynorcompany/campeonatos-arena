import "server-only";
import { cookies, headers } from "next/headers";
import { backendOrigin } from "./http-client";
import { publicCourtBookingFields, publicCourtBookingInputSchema, publicCourtBookingOutcomeSchema, type PublicCourtBookingOperation } from "./contracts/public-court-booking";
export function publicCourtBookingFormFields(operation: PublicCourtBookingOperation, form: FormData) {
  const fields: Record<string, string[]> = {};
  for (const key of publicCourtBookingFields[operation]) {
    const values = form.getAll(key);
    if (values.some(value => typeof value !== "string")) throw new Error("Campo inválido.");
    if (values.length) fields[key] = values as string[];
  }
  return publicCourtBookingInputSchema(operation).parse({ fields }).fields;
}
export async function remotePublicCourtBookingMutation(origin: string, operation: PublicCourtBookingOperation, fields: Record<string, string[]>) {
  const token = (await cookies()).get("arena_player_session")?.value;
  const browserOrigin = (await headers()).get("origin");
  const response = await fetch(new URL(`/api/portal/bookings/actions/${operation}`, backendOrigin(origin)), {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { cookie: `arena_player_session=${encodeURIComponent(token)}` } : {}), ...(browserOrigin ? { origin: browserOrigin } : {}) },
    body: JSON.stringify({ fields }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60000),
  });
  const outcome = publicCourtBookingOutcomeSchema.parse(await response.json());
  return response.ok ? outcome : { error: outcome.error ?? "Não foi possível confirmar a operação.", result: null };
}
