export type RecurringChargeCandidate = { id: string; arenaId: string; dueDate: Date | null };
export type RecurringChargeScanFailure = { arenaId: string; reason: unknown };
export const recurringChargeBatchLimit = 250;

/** Scans every arena with bounded concurrency, then shares the issuance limit across arenas. */
export async function collectRecurringChargeCandidates(
  arenaIds: string[],
  loadForArena: (arenaId: string) => Promise<RecurringChargeCandidate[]>,
  limit = recurringChargeBatchLimit
) {
  const perArena: RecurringChargeCandidate[][] = [];
  const failures: RecurringChargeScanFailure[] = [];
  for (let index = 0; index < arenaIds.length; index += 8) {
    const ids = arenaIds.slice(index, index + 8);
    const batch = await Promise.allSettled(ids.map(loadForArena));
    batch.forEach((result, position) => {
      if (result.status === "fulfilled") {
        if (result.value.length) perArena.push(result.value.sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)));
      } else failures.push({ arenaId: ids[position], reason: result.reason });
    });
  }
  perArena.sort((a, b) => (a[0].dueDate?.getTime() ?? 0) - (b[0].dueDate?.getTime() ?? 0));
  const candidates: RecurringChargeCandidate[] = [];
  for (let round = 0; candidates.length < limit; round += 1) {
    let added = false;
    for (const entries of perArena) {
      if (entries[round]) {
        candidates.push(entries[round]);
        added = true;
        if (candidates.length === limit) break;
      }
    }
    if (!added) break;
  }
  return {
    candidates,
    failures,
  };
}
