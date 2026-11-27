import "server-only";
import * as actions from "./public-court-booking-actions";
import { publicCourtBookingOutcomeSchema, type PublicCourtBookingOperation } from "@/lib/backend/contracts/public-court-booking";
const operations = { create: actions.createPublicCourtBookingAction, cancel: actions.cancelPublicCourtBookingRequestAction, payment: actions.startPublicCourtBookingPaymentAction };
export async function executePublicCourtBookingMutation(operation: PublicCourtBookingOperation, fields: Record<string, string[]>) {
  const form = new FormData();
  for (const [key, values] of Object.entries(fields)) for (const value of values) form.append(key, value);
  return publicCourtBookingOutcomeSchema.parse({ error: null, result: await operations[operation](form) ?? null });
}
