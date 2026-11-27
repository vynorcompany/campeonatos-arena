import "server-only";
import * as actions from "./court-booking-actions";
import { courtBookingOutcomeSchema, type CourtBookingOperation } from "@/lib/backend/contracts/court-booking";
const operations = { save: actions.saveCourtBookingAction, cancel: actions.cancelCourtBookingAction, confirm: actions.confirmOnlineBookingAction };
export async function executeCourtBookingMutation(operation: CourtBookingOperation, fields: Record<string, string[]>) {
  const form = new FormData();
  for (const [key, values] of Object.entries(fields)) for (const value of values) form.append(key, value);
  const result = await operations[operation](form) as { error?: string; version?: string } | void;
  return courtBookingOutcomeSchema.parse({ error: result?.error ?? null, ...(result?.version ? { version: result.version } : {}) });
}
