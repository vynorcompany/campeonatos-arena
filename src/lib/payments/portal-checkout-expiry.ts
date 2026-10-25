import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { expireMercadoPagoCheckout } from "@/lib/payments/mercado-pago-checkout-expiry";

type Filter = { playerId?: string; entryIds?: string[]; limit?: number };

export async function expirePortalCheckoutsForArena(arenaId: string, filter: Filter = {}, now = new Date()) {
  const reclaimBefore = new Date(now.getTime() - 2 * 60_000);
  const where = {
    arenaId, provider: "MERCADO_PAGO", status: "PENDING", expiresAt: { lte: now },
    ...(filter.playerId ? { playerId: filter.playerId } : {}),
    ...(filter.entryIds ? { items: { some: { financialEntryId: { in: filter.entryIds } } } } : {}),
    OR: [{ expiryCheckClaimedAt: null }, { expiryCheckClaimedAt: { lt: reclaimBefore } }],
  };
  const candidates = await withArenaTransaction(arenaId, tx => tx.onlinePaymentCheckout.findMany({
    where, take: Math.max(1, Math.min(filter.limit ?? 20, 50)), orderBy: [{ expiryCheckClaimedAt: { sort: "asc", nulls: "first" } }, { expiresAt: "asc" }, { id: "asc" }],
    select: { id: true },
  }));
  const totals = { expired: 0, review: 0, failed: 0 };
  for (const candidate of candidates) {
    // A batch may take minutes; each lease starts when this checkout is
    // claimed, rather than inheriting the timestamp of the whole job.
    const claimedAt = new Date(Math.max(now.getTime(), Date.now()));
    const checkout = await withArenaTransaction(arenaId, async tx => {
      const claim = await tx.onlinePaymentCheckout.updateMany({ where: { ...where, id: candidate.id }, data: { expiryCheckClaimedAt: claimedAt } });
      if (claim.count !== 1) return null;
      return tx.onlinePaymentCheckout.findFirst({ where: { id: candidate.id, arenaId, status: "PENDING" }, select: { id: true, mercadoPagoPreferenceId: true, expiresAt: true } });
    });
    if (!checkout?.expiresAt) continue;
    try {
      const result = await expireMercadoPagoCheckout({ arenaId, checkoutId: checkout.id, preferenceId: checkout.mercadoPagoPreferenceId, expiresAt: checkout.expiresAt }, now);
      const changed = await withArenaTransaction(arenaId, async tx => {
        await tx.$queryRaw`SELECT "id" FROM "OnlinePaymentCheckout" WHERE "id" = ${checkout.id} AND "arenaId" = ${arenaId} FOR UPDATE`;
        const update = await tx.onlinePaymentCheckout.updateMany({
          where: { id: checkout.id, arenaId, status: "PENDING", expiryCheckClaimedAt: claimedAt },
          data: { status: result.kind === "expired" ? "EXPIRED" : "REVIEW", ...(result.reviewPaymentIds.length ? { mercadoPagoPaymentId: result.reviewPaymentIds[0] } : {}) },
        });
        if (update.count && result.kind === "review") await tx.arenaNotification.create({ data: {
          arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Pagamento encontrado ao expirar checkout",
          message: `O checkout ${checkout.id} venceu, mas o Mercado Pago informa pagamento aprovado, estornado ou contestado (${result.reviewPaymentIds.join(", ")}). Confira os movimentos antes de liberar outra tentativa.`,
          href: "/relatorios/pagamentos-online",
        } });
        return update.count;
      });
      if (changed) totals[result.kind]++;
    } catch {
      // Keep the claim timestamp as a short backoff. A retry must reconcile
      // the provider again; neither timeout nor HTTP failure releases a debt.
      totals.failed++;
    }
  }
  return totals;
}

export async function expirePortalCheckouts(now = new Date()) {
  const totals = { expired: 0, review: 0, failed: 0 };
  let cursor: string | undefined;
  for (;;) {
    const arenas = await prisma.arena.findMany({ select: { id: true }, orderBy: { id: "asc" }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    for (const arena of arenas) {
      try {
        const result = await expirePortalCheckoutsForArena(arena.id, {}, now);
        for (const key of ["expired", "review", "failed"] as const) totals[key] += result[key];
      } catch { totals.failed++; }
    }
    if (arenas.length < 100) return totals;
    cursor = arenas[arenas.length - 1].id;
  }
}
