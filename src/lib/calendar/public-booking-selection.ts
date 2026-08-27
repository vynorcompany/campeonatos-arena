type PublicBookingSelectionInput = {
  startsAtMinute: number;
  durationMinutes: number;
  slotMinutes: number;
  availableMinutes: number[];
  blockedMinutes: number[];
};

export function resolvePublicBookingSelection({
  startsAtMinute,
  durationMinutes,
  slotMinutes,
  availableMinutes,
  blockedMinutes
}: PublicBookingSelectionInput) {
  const requestedMinutes = Array.from(
    { length: Math.ceil(durationMinutes / slotMinutes) },
    (_, index) => startsAtMinute + index * slotMinutes
  );
  const available = new Set(availableMinutes);
  const blocked = new Set(blockedMinutes);
  const conflictingMinutes = requestedMinutes.filter((minute) => blocked.has(minute) || !available.has(minute));

  return {
    selectedMinutes: requestedMinutes.filter((minute) => !conflictingMinutes.includes(minute)),
    conflictingMinutes,
    hasConflict: conflictingMinutes.length > 0
  };
}
