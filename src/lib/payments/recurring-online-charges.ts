import { createBoletoPayment, getMissingBoletoPayerFields } from "@/lib/payments/mercado-pago";
import { sendEvolutionTextMessage } from "@/lib/integrations/evolution/client";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { withArenaTransaction } from "@/lib/rls";
import { collectRecurringChargeCandidates } from "@/lib/payments/recurring-charge-selection";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { claimFinancialOnlineCharge } from "@/lib/payments/financial-online-charge-claim";
import { recurringBoletoEntryWhere } from "@/lib/payments/recurring-charge-eligibility";

const daysFromNow = 15;

type ChargeAttempt = { created: boolean; skipped: boolean };

/** Creates the boleto for one recurring entry. The external reference and Mercado Pago idempotency key make retries safe. */
export async function issueRecurringOnlineChargeForEntry(arenaId: string, entryId: string): Promise<ChargeAttempt> {
  const entry = await arenaDatabase(arenaId).financialEntry.findFirst({
    where: { id: entryId, ...recurringBoletoEntryWhere(arenaId) },
    include: { player: { select: { name: true, phone: true, email: true, cpf: true, addressZipCode: true, addressStreet: true, addressNumber: true, addressNeighborhood: true, addressCity: true, addressState: true } }, settlements: { select: { amountCents: true, interestCents: true } } }
  });

  if (!entry) return { created: false, skipped: false };
  const player = entry.player;
  if (!player || getMissingBoletoPayerFields(player).length) return { created: false, skipped: true };
  const amountCents = getFinancialEntryBalance(entry.amountCents, entry.settlements).outstandingCents;
  if (amountCents < 500) return { created: false, skipped: true };
  const claim = await withArenaTransaction(arenaId, (tx) => claimFinancialOnlineCharge(tx, { arenaId, entryId: entry.id, method: "BOLETO", expectedAmountCents: amountCents }));
  if (!claim.ok) return { created: false, skipped: false };

  let charge;
  try {
    charge = await createBoletoPayment({
      arenaId: entry.arenaId,
      amountCents,
      description: entry.description,
      payerEmail: player.email,
      payerCpf: player.cpf,
      payerName: player.name,
      payerAddress: player,
      externalReference: entry.id,
      expiresAt: entry.dueDate ?? undefined
    });
    if (!charge.paymentId || !charge.checkoutUrl) throw new Error("O Mercado Pago não retornou um boleto utilizável.");
  } catch (error) {
    await withArenaTransaction(arenaId, (tx) => tx.financialEntry.updateMany({
      where: { id: entry.id, arenaId, status: "PENDING", onlinePaymentId: "", onlinePaymentUrl: "", onlinePaymentClaimMethod: "BOLETO", onlinePaymentClaimedAt: claim.claimedAt },
      data: { onlinePaymentClaimedAt: null },
    })).catch((releaseError) => console.error("Could not release recurring boleto claim", releaseError));
    throw error;
  }
  const updated = await withArenaTransaction(arenaId, (tx) => tx.financialEntry.updateMany({
    where: { id: entry.id, arenaId, status: "PENDING", onlinePaymentId: { in: ["", charge.paymentId] }, onlinePaymentUrl: "", onlinePaymentClaimMethod: "BOLETO", onlinePaymentClaimedAt: claim.claimedAt, recurrence: { active: true, onlinePaymentMethod: "BOLETO" } },
    data: {
      onlineProvider: "MERCADO_PAGO",
      onlinePaymentId: charge.paymentId,
      onlinePaymentUrl: charge.checkoutUrl,
      onlinePaymentQrCode: charge.qrCode,
      onlinePaymentExpiresAt: charge.expiresAt,
      onlinePaymentPublishedAt: new Date(),
      onlinePaymentClaimedAt: null,
    }
  }));
  if (!updated.count) {
    await withArenaTransaction(arenaId, async (tx) => {
      const current = await tx.financialEntry.findFirst({ where: { id: entry.id, arenaId }, select: { status: true, onlinePaymentId: true } });
      if (current?.status === "PAID" && current.onlinePaymentId === charge.paymentId) return;
      await tx.arenaNotification.create({ data: { arenaId, type: "ONLINE_CHARGE_PAYMENT_REVIEW", title: "Boleto recorrente requer conferência", message: "O Mercado Pago criou um boleto, mas o lançamento mudou antes de registrá-lo. Confira a cobrança antes de tentar novamente.", href: "/financeiro/contas-a-receber" } });
    });
  }
  // A emissão não depende do canal de WhatsApp. Quando a arena estiver
  // conectada, o mesmo boleto é comunicado ao cliente imediatamente.
  if (updated.count && player.phone) {
    const dueDate = entry.dueDate ? new Intl.DateTimeFormat("pt-BR").format(entry.dueDate) : "a data de vencimento informada";
    await sendEvolutionTextMessage(player.phone, `Olá, ${player.name}. Seu boleto de ${entry.description} já foi emitido, com vencimento em ${dueDate}. Pague por aqui: ${charge.checkoutUrl}`, entry.arenaId).catch(() => undefined);
  }
  return { created: Boolean(updated.count), skipped: false };
}

/** Issues only the next due boleto for recurring receivables. It is safe to run more than once. */
export async function recurringOnlineChargeCandidates(now = new Date()) {
  const limit = new Date(now);
  limit.setDate(limit.getDate() + daysFromNow);
  const arenas = await prisma.arena.findMany({ select: { id: true } });
  return collectRecurringChargeCandidates(arenas.map((arena) => arena.id), (arenaId) =>
    arenaDatabase(arenaId).financialEntry.findMany({
      where: recurringBoletoEntryWhere(arenaId, limit),
      select: { id: true, arenaId: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 250
    })
  );
}

export async function issueRecurringOnlineCharges(now = new Date()) {
  const entries = await recurringOnlineChargeCandidates(now);

  let created = 0;
  let skipped = 0;
  for (const entry of entries) {
    const result = await issueRecurringOnlineChargeForEntry(entry.arenaId, entry.id);
    if (result.created) created += 1;
    if (result.skipped) skipped += 1;
  }
  return { scanned: entries.length, created, skipped };
}
