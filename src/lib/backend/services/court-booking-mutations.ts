import "server-only";
import * as actions from "./court-booking-actions";
import * as agenda from "./agenda-operations-actions";
import { courtBookingOutcomeSchema, type CourtBookingOutcome, type CourtBookingOperation } from "@/lib/backend/contracts/court-booking";
const operations = { save: actions.saveCourtBookingAction, cancel: actions.cancelCourtBookingAction, confirm: actions.confirmOnlineBookingAction,
  checkin: agenda.manualBookingCheckinAction, "service-add": agenda.addBookingServiceAction, "service-remove": agenda.removeBookingServiceAction,
  "block-slots": agenda.blockAgendaSlotsAction, move: agenda.moveBookingCourtAction, "release-block": agenda.releaseBlockedAgendaSlotAction, "open-slot": agenda.openAgendaDateSlotAction };
export async function executeCourtBookingMutation(operation: CourtBookingOperation, fields: Record<string, string[]>) {
  const form = new FormData();
  for (const [key, values] of Object.entries(fields)) for (const value of values) form.append(key, value);
  const result = await operations[operation](form) as Partial<Omit<CourtBookingOutcome, "error">> & { error?: string } | void;
  return courtBookingOutcomeSchema.parse({ ...result, error: result?.error ?? null });
}
