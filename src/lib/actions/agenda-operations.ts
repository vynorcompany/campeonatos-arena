"use server";
import { runCourtBookingMutation } from "@/lib/calendar/booking-mutation";
export async function manualBookingCheckinAction(form: FormData) {
  const result = await runCourtBookingMutation("checkin", form);
  return { error: result.error ?? undefined, checkedInAt: result.checkedInAt, charges: result.charges };
}
export async function addBookingServiceAction(form: FormData) {
  const result = await runCourtBookingMutation("service-add", form);
  return { error: result.error ?? undefined, checkedInAt: result.checkedInAt, charges: result.charges };
}
export async function removeBookingServiceAction(form: FormData) {
  const result = await runCourtBookingMutation("service-remove", form);
  return { error: result.error ?? undefined, checkedInAt: result.checkedInAt, charges: result.charges };
}
export async function blockAgendaSlotsAction(form: FormData) {
  const result = await runCourtBookingMutation("block-slots", form);
  return { error: result.error ?? undefined, checkedInAt: result.checkedInAt, charges: result.charges };
}
export async function moveBookingCourtAction(form: FormData) {
  const result = await runCourtBookingMutation("move", form);
  return { error: result.error ?? undefined, checkedInAt: result.checkedInAt, charges: result.charges };
}
export async function releaseBlockedAgendaSlotAction(form: FormData) {
  const result = await runCourtBookingMutation("release-block", form);
  return { error: result.error ?? undefined, checkedInAt: result.checkedInAt, charges: result.charges };
}
export async function openAgendaDateSlotAction(form: FormData) {
  const result = await runCourtBookingMutation("open-slot", form);
  return { error: result.error ?? undefined, checkedInAt: result.checkedInAt, charges: result.charges };
}
