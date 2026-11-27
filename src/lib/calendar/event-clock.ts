/** Calendar display uses the server's existing wall-clock convention, not a new storage timezone. */
export function calendarClockDate(value: { day: string; minute: number; second: number; millisecond: number }) {
  const [year, month, date] = value.day.split("-").map(Number);
  const result = new Date(0);
  result.setFullYear(year, month - 1, date);
  result.setHours(Math.floor(value.minute / 60), value.minute % 60, value.second, value.millisecond);
  return result;
}
