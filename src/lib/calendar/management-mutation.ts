import "server-only";
import { refreshCalendarRoutes } from "@/lib/calendar/revalidation";
import { calendarManagementFormFields, remoteCalendarManagementMutation } from "@/lib/backend/calendar-management-client";
import type { CalendarManagementOperation } from "@/lib/backend/contracts/calendar-management";
type ClientResult = { error: string; id?: never; name?: never } | { id: string; name: string; error?: never };
export function runCalendarManagementMutation(operation: "client-create", form: FormData): Promise<ClientResult>;
export function runCalendarManagementMutation(operation: Exclude<CalendarManagementOperation, "client-create">, form: FormData): Promise<{ error: string } | undefined>;
export async function runCalendarManagementMutation(operation: CalendarManagementOperation, form: FormData) {
  let result;
  try {
    const origin = process.env.VX4_BACKEND_ORIGIN;
    result = origin ? await remoteCalendarManagementMutation(origin, operation, form)
      : await (await import("@/lib/backend/services/calendar-management-mutations")).executeCalendarManagementMutation(operation, calendarManagementFormFields(operation, form));
  } catch { return { error: "Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente." }; }
  if (result.error) return { error: result.error };
  if (operation === "client-create") {
    if (!("id" in result) || !result.id || !result.name) return { error: "Não foi possível confirmar o cadastro do cliente." };
    refreshCalendarRoutes();
    return { id: result.id, name: result.name };
  }
  refreshCalendarRoutes();
  return undefined;
}
