import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/payments/mercado-pago";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { ensureTournamentPairFromRegistration } from "@/lib/services/registration-pair";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const paymentId =
      String(body?.data?.id ?? "") ||
      new URL(request.url).searchParams.get("data.id") ||
      new URL(request.url).searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: "missing_payment_id" });
    }

    const registration = await prisma.publicTournamentRegistration.findFirst({
      where: { mercadoPagoPaymentId: paymentId },
      include: { tournament: { select: { id: true, arenaId: true } } }
    });
    if (!registration) {
      const entry = await prisma.financialEntry.findFirst({
        where: { onlineProvider: "MERCADO_PAGO", onlinePaymentId: paymentId, type: "REVENUE" },
        select: { id: true, arenaId: true }
      });
      if (!entry) return NextResponse.json({ ok: true, ignored: "unknown_payment" });

      const payment = await getMercadoPagoPayment(entry.arenaId, paymentId);
      const approved = payment.status === "approved";
      await withArenaTransaction(entry.arenaId, async (tx) => {
        const current = await tx.financialEntry.findFirst({
          where: { id: entry.id, arenaId: entry.arenaId },
          include: { settlements: { select: { amountCents: true, interestCents: true } } }
        });
        if (!current || current.status !== "PENDING") return;
        if (!approved) {
          await tx.financialEntry.update({ where: { id: current.id }, data: { onlinePaymentId: String(payment.id ?? paymentId) } });
          return;
        }
        const balance = getFinancialEntryBalance(current.amountCents, current.settlements, current.status);
        if (!balance.outstandingCents) return;
        await tx.financialSettlement.create({
          data: {
            arenaId: entry.arenaId,
            financialEntryId: current.id,
            amountCents: balance.outstandingCents,
            paymentMethod: current.onlinePaymentUrl ? "Mercado Pago online" : "Mercado Pago",
            paidAt: new Date(),
            notes: `Pagamento online Mercado Pago confirmado (${String(payment.id ?? paymentId)}).`
          }
        });
        await tx.financialEntry.update({
          where: { id: current.id },
          data: { status: "PAID", paidAt: new Date(), onlinePaymentId: String(payment.id ?? paymentId) }
        });
      });
      return NextResponse.json({ ok: true });
    }

    const payment = await getMercadoPagoPayment(registration.tournament.arenaId, paymentId);
    const approved = payment.status === "approved";
    await withArenaTransaction(registration.tournament.arenaId, async (tx) => {

      await tx.publicTournamentRegistration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: approved ? "PAID" : String(payment.status ?? "PENDING"),
          status: approved ? "CONFIRMED" : "PENDING_PAYMENT",
          mercadoPagoPaymentId: String(payment.id ?? paymentId),
          paymentReference: String(payment.id ?? paymentId)
        }
      });

      if (approved) {
        await ensureTournamentPairFromRegistration(tx, {
          arenaId: registration.tournament.arenaId,
          tournamentId: registration.tournament.id,
          leadName: registration.leadName,
          partnerName: registration.partnerName
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Webhook error" },
      { status: 500 }
    );
  }
}
