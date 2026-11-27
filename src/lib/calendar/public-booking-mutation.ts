import "server-only";
import { revalidatePath } from "next/cache";
import { refreshCalendarRoutes } from "./revalidation";
import { arenaBookingPath } from "@/lib/arena-booking-path";
import { publicCourtBookingFormFields, remotePublicCourtBookingMutation } from "@/lib/backend/public-court-booking-client";
import type { PublicCourtBookingOperation, PublicCourtBookingOutcome } from "@/lib/backend/contracts/public-court-booking";
export async function runPublicCourtBookingMutation(operation: PublicCourtBookingOperation, form: FormData): Promise<PublicCourtBookingOutcome> {
  let outcome: PublicCourtBookingOutcome;
  try {
    const fields = publicCourtBookingFormFields(operation, form);
    const origin = process.env.VX4_BACKEND_ORIGIN;
    outcome = origin ? await remotePublicCourtBookingMutation(origin, operation, fields)
      : await (await import("@/lib/backend/services/public-court-booking-mutations")).executePublicCourtBookingMutation(operation, fields);
  } catch { return { error: "Não foi possível confirmar a operação. Confira suas reservas antes de tentar novamente.", result: null }; }
  if (!outcome.error && !(outcome.result && "ok" in outcome.result && !outcome.result.ok)) {
    const slug = String(form.get("arenaSlug") ?? "");
    refreshCalendarRoutes();
    revalidatePath(`/reservar/${slug}`);
    revalidatePath(`/classificacao/${slug}`);
    revalidatePath(arenaBookingPath(slug));
  }
  return outcome;
}
