export type RecurringChargeCandidate = { id: string; arenaId: string; dueDate: Date | null };

/** Scans every arena with bounded concurrency, then applies the global issuance limit. */
export async function collectRecurringChargeCandidates(
  arenaIds: string[],
  loadForArena: (arenaId: string) => Promise<RecurringChargeCandidate[]>,
  limit = 250
) {
  const candidates: RecurringChargeCandidate[] = [];
  for (let index = 0; index < arenaIds.length; index += 8) {
    const batch = await Promise.all(arenaIds.slice(index, index + 8).map(loadForArena));
    candidates.push(...batch.flat());
  }
  return candidates.sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)).slice(0, limit);
}
