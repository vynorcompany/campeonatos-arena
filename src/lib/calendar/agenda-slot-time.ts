export function agendaSlotTimestamp(date: string, minute: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCMinutes(minute);
  return value.toISOString().slice(0, 19);
}
