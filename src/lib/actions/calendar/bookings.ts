"use server";
import { runCourtBookingMutation } from "@/lib/calendar/booking-mutation";
export async function saveCourtBookingAction(form: FormData): Promise<{ error?: string; version?: string }> {
  const result = await runCourtBookingMutation("save", form);
  return result.error ? { error: result.error } : { version: "version" in result ? result.version : undefined };
}
export async function cancelCourtBookingAction(form: FormData) {
  const result = await runCourtBookingMutation("cancel", form);
  return result.error ? { error: result.error } : undefined;
}
export async function confirmOnlineBookingAction(form: FormData) {
  const result = await runCourtBookingMutation("confirm", form);
  if (result.error) throw new Error(result.error);
}
