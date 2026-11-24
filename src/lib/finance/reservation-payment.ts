/** The court's charge is paid only after every part assigned to other clients is paid. */
export function isReservationChargePaid(entry: { status: string; reservationSplitParts: readonly { status: string }[] } | null | undefined) {
  return entry?.status === "PAID" && entry.reservationSplitParts.every(part => part.status === "PAID");
}
