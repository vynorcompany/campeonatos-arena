import { createBoletoPayment } from "@/lib/payments/mercado-pago";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

const daysFromNow = 3;

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
    include: { player: { select: { name: true, email: true, cpf: true } } },
    orderBy: { dueDate: "asc" },
    take: 250
  });

  let created = 0;
  let skipped = 0;
  for (const entry of entries) {
    const player = entry.player;
    if (!player?.email || !/^\d{11}$/.test(player.cpf)) { skipped += 1; continue; }
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
    if (updated.count) created += 1;
  }
  return { scanned: entries.length, created, skipped };
}
