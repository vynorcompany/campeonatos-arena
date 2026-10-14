export type RecurringChargeCandidate = { id: string; arenaId: string; dueDate: Date | null };
export type RecurringChargeScanFailure = { arenaId: string; reason: unknown };

/** Scans every arena with bounded concurrency, then applies the global issuance limit. */
export async function collectRecurringChargeCandidates(
  arenaIds: string[],
  loadForArena: (arenaId: string) => Promise<RecurringChargeCandidate[]>,
  limit = 250
) {
  const candidates: RecurringChargeCandidate[] = [];
  const failures: RecurringChargeScanFailure[] = [];
  for (let index = 0; index < arenaIds.length; index += 8) {
    const ids = arenaIds.slice(index, index + 8);
    const batch = await Promise.allSettled(ids.map(loadForArena));
    batch.forEach((result, position) => {
      if (result.status === "fulfilled") candidates.push(...result.value);
      else failures.push({ arenaId: ids[position], reason: result.reason });
    });
  }
  return {
    candidates: candidates.sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)).slice(0, limit),
    failures,
  };
}
