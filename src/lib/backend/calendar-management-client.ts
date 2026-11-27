import "server-only";
import { headers } from "next/headers";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { backendOrigin } from "@/lib/backend/http-client";
import { calendarManagementFields, calendarManagementInputSchema, calendarManagementOutcomeSchema, type CalendarManagementOperation } from "@/lib/backend/contracts/calendar-management";
export function calendarManagementFormFields(operation: CalendarManagementOperation, form: FormData) {
  const fields: Record<string, string[]> = {};
  for (const key of calendarManagementFields[operation]) {
    const values = form.getAll(key);
    if (values.some(value => typeof value !== "string")) throw new Error("Campo inválido.");
    if (values.length) fields[key] = values as string[];
  }
  return calendarManagementInputSchema(operation).parse({ fields }).fields;
}
export async function remoteCalendarManagementMutation(origin: string, operation: CalendarManagementOperation, form: FormData) {
  const fields = calendarManagementFormFields(operation, form);
  const cookie = await managementCookieHeader();
  const requestOrigin = (await headers()).get("origin");
  const response = await fetch(new URL(`/api/management/calendar/actions/${operation}`, backendOrigin(origin)), {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...(cookie ? { cookie } : {}), ...(requestOrigin ? { origin: requestOrigin } : {}) },
    body: JSON.stringify({ fields }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60000),
  });
  const result = calendarManagementOutcomeSchema.parse(await response.json());
  return response.ok ? result : { error: result.error ?? "Não foi possível confirmar a alteração." };
}
