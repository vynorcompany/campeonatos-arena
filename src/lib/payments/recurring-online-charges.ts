import { createBoletoPayment } from "@/lib/payments/mercado-pago";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

const daysFromNow = 15;

type ChargeAttempt = { created: boolean; skipped: boolean };

/** Creates the boleto for one recurring entry. The external reference and Mercado Pago idempotency key make retries safe. */
export async function issueRecurringOnlineChargeForEntry(entryId: string): Promise<ChargeAttempt> {
  const entry = await prisma.financialEntry.findFirst({
    where: {
      id: entryId,
      type: "REVENUE",
      status: "PENDING",
      recurrenceId: { not: null },
      playerId: { not: null },
      onlinePaymentId: ""
    },
    include: { player: { select: { name: true, email: true, cpf: true } } }
  });

  if (!entry) return { created: false, skipped: false };
  const player = entry.player;
  if (!player?.email || !/^\d{11}$/.test(player.cpf)) return { created: false, skipped: true };

  const charge = await createBoletoPayment({
    arenaId: entry.arenaId,
    amountCents: entry.amountCents,
    description: entry.description,
    payerEmail: player.email,
    payerCpf: player.cpf,
    payerName: player.name,
    externalReference: entry.id,
    expiresAt: entry.dueDate ?? undefined
  });
  const updated = await withArenaTransaction(entry.arenaId, (tx) => tx.financialEntry.updateMany({
    where: { id: entry.id, arenaId: entry.arenaId, status: "PENDING", onlinePaymentId: "" },
    data: {
      onlineProvider: "MERCADO_PAGO",
      onlinePaymentId: charge.paymentId,
      onlinePaymentUrl: charge.checkoutUrl,
      onlinePaymentQrCode: charge.qrCode,
      onlinePaymentExpiresAt: charge.expiresAt
    }
  }));
  return { created: Boolean(updated.count), skipped: false };
}

/** Issues only the next due boleto for recurring receivables. It is safe to run more than once. */
export async function issueRecurringOnlineCharges(now = new Date()) {
  const limit = new Date(now);
  limit.setDate(limit.getDate() + daysFromNow);
  const entries = await prisma.financialEntry.findMany({
    where: {
      type: "REVENUE",
      status: "PENDING",
      recurrenceId: { not: null },
      playerId: { not: null },
      onlinePaymentId: "",
      dueDate: { lte: limit }
    },
    orderBy: { dueDate: "asc" },
    take: 250
  });

  let created = 0;
  let skipped = 0;
  for (const entry of entries) {
    const result = await issueRecurringOnlineChargeForEntry(entry.id);
    if (result.created) created += 1;
    if (result.skipped) skipped += 1;
  }
  return { scanned: entries.length, created, skipped };
}
