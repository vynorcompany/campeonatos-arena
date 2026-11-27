import { durationMinutesForBookingStart } from "./booking-availability";
export type RetainedBookingTime = { startMinute: number; durationMinutes: number };
/** A saved interval remains selectable when availability rules change. It is not offered to new bookings. */
export function bookingStartOptions(availableMinutes: number[], retained?: RetainedBookingTime) {
  return [...new Set([...availableMinutes, ...(retained ? [retained.startMinute] : [])])].sort((a,b) => a-b);
}
export function bookingDurationOptions(input: { startMinute: number; slotMinutes: number; availableMinutes: number[]; retained?: RetainedBookingTime }) {
  const available = durationMinutesForBookingStart(input);
  return [...new Set([...available, ...(input.retained?.startMinute === input.startMinute ? [input.retained.durationMinutes] : [])])].sort((a,b) => a-b);
}
