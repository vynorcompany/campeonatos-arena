export type AuditRequestContext = {
  arenaIds: Set<string>;
  requestId?: string;
  actorId?: string;
  actorName?: string;
  arenaId?: string | null;
};

/** Shared with the production HTTP boundary across Next's server bundles. */
export function getAuditRequestContext(): AuditRequestContext | undefined {
  const contexts = globalThis as unknown as Record<symbol, { getStore(): AuditRequestContext | undefined } | undefined>;
  return contexts[Symbol.for("arena.http-audit.context")]?.getStore();
}
export function noteAuditArena(arenaId: string) {
  getAuditRequestContext()?.arenaIds.add(arenaId);
}
