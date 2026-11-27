import "server-only";
import { refreshCalendarRoutes } from "@/lib/calendar/revalidation";
import { refreshFinanceRoutes } from "@/lib/finance/revalidation";
import { courtBookingFormFields, remoteCourtBookingMutation } from "@/lib/backend/court-booking-client";
import type { CourtBookingOperation } from "@/lib/backend/contracts/court-booking";
export async function runCourtBookingMutation(operation: CourtBookingOperation, form: FormData) {
  let result;
  try {
    const origin = process.env.VX4_BACKEND_ORIGIN;
    result = origin ? await remoteCourtBookingMutation(origin, operation, form)
      : await (await import("@/lib/backend/services/court-booking-mutations")).executeCourtBookingMutation(operation, courtBookingFormFields(operation, form));
  } catch { return { error: "Não foi possível confirmar a alteração. Confira a grade antes de tentar novamente." }; }
  if (!result.error) {
    refreshCalendarRoutes();
    if (operation === "save" || operation === "cancel" && form.get("cancelOpenCharges") === "yes") refreshFinanceRoutes();
  }
  return result;
}
