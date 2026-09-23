/** Booking types that create a recurring series instead of one occurrence. */
export function isFixedBookingType(bookingTypeName: string) {
  return ["aula fixa", "reserva fixa"].includes(bookingTypeName.trim().toLowerCase());
}
