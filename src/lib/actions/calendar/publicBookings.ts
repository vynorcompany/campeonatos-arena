"use server";
import { runPublicCourtBookingMutation } from "@/lib/calendar/public-booking-mutation";
import type { PublicCourtBookingActionResult } from "@/lib/actions/calendar/shared";
export async function createPublicCourtBookingAction(form: FormData): Promise<PublicCourtBookingActionResult> {
  const outcome = await runPublicCourtBookingMutation("create", form);
  if (outcome.error) return { ok: false, error: outcome.error };
  if (!outcome.result || !("ok" in outcome.result)) return { ok: false, error: "Não foi possível confirmar a reserva. Confira suas reservas antes de tentar novamente." };
  return outcome.result;
}
export async function cancelPublicCourtBookingRequestAction(form: FormData) {
  const outcome = await runPublicCourtBookingMutation("cancel", form);
  if (outcome.error) throw new Error(outcome.error);
}
export async function startPublicCourtBookingPaymentAction(form: FormData) {
  const outcome = await runPublicCourtBookingMutation("payment", form);
  if (outcome.error) throw new Error(outcome.error);
  if (!outcome.result || !("checkoutUrl" in outcome.result)) throw new Error("Não foi possível abrir o pagamento escolhido.");
  return { checkoutUrl: outcome.result.checkoutUrl };
}
