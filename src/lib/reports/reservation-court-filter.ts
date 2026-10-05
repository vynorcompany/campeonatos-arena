export function reservationCourtIds(requested: string | string[] | undefined, available: readonly string[], explicit = false) {
  if (requested === undefined && !explicit) return [...available];
  const selected = new Set(Array.isArray(requested) ? requested : requested ? [requested] : []);
  return available.filter(id => selected.has(id));
}
