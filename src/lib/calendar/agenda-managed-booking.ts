export function isAgendaManagedBooking(sourceType: string) {
  return sourceType === "BOOKING" || sourceType === "COURT_BOOKING" || sourceType === "ONLINE_BOOKING";
}
