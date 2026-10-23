/** Shared with the production HTTP boundary across Next's server bundles. */
export function noteAuditArena(arenaId: string) {
  const contexts = globalThis as unknown as Record<symbol, { getStore(): { arenaIds: Set<string> } | undefined } | undefined>;
  contexts[Symbol.for("arena.http-audit.context")]?.getStore()?.arenaIds.add(arenaId);
}
