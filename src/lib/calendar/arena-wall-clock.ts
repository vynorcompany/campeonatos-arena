// ScheduleOccurrence keeps the arena's wall-clock time in the server-local Date
// representation. Convert only when comparing it with a real instant or
// exporting it to an external calendar; changing the stored value would shift
// existing bookings.
const ARENA_TIME_ZONE = "America/Sao_Paulo";
const zonedParts = new Intl.DateTimeFormat("en-US", {
  timeZone: ARENA_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23",
});

function offsetMilliseconds(instant: Date) {
  const parts = Object.fromEntries(zonedParts.formatToParts(instant).map(({ type, value }) => [type, value]));
  const zonedAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second), instant.getUTCMilliseconds(),
  );
  return zonedAsUtc - instant.getTime();
}

export function arenaWallClockToInstant(value: Date) {
  const wallAsUtc = Date.UTC(
    value.getFullYear(), value.getMonth(), value.getDate(),
    value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds(),
  );
  let instant = new Date(wallAsUtc - offsetMilliseconds(new Date(wallAsUtc)));
  instant = new Date(wallAsUtc - offsetMilliseconds(instant));
  return instant;
}

export function instantToArenaWallClock(value: Date) {
  const parts = Object.fromEntries(zonedParts.formatToParts(value).map(({ type, value: part }) => [type, part]));
  return new Date(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second), value.getUTCMilliseconds(),
  );
}

export function arenaToday(now = new Date()) {
  const wallClock = instantToArenaWallClock(now);
  return new Date(wallClock.getFullYear(), wallClock.getMonth(), wallClock.getDate());
}
