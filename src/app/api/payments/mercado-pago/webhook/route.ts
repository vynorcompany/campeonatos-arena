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
        select: { id: true, arenaId: true, externalReference: true }
      });
      if (!entry) {
        const arenaId = new URL(request.url).searchParams.get("arenaId");
        if (!arenaId) return NextResponse.json({ ok: true, ignored: "unknown_payment" });
        const payment = await getMercadoPagoPayment(arenaId, paymentId);
        const reference = String(payment.external_reference ?? "");
        const occurrenceId = reference.startsWith("online_booking:") ? reference.slice("online_booking:".length) : "";
        if (!occurrenceId || payment.status !== "approved") return NextResponse.json({ ok: true, ignored: occurrenceId ? "booking_not_approved" : "unknown_payment" });

        await withArenaTransaction(arenaId, async (tx) => {
          const occurrence = await tx.scheduleOccurrence.findFirst({
            where: { id: occurrenceId, arenaId, sourceType: "ONLINE_BOOKING", status: "PENDING_PAYMENT" },
            include: { occurrenceCourts: { include: { court: { select: { name: true } } } }, participants: { include: { player: { select: { id: true, name: true } } } } }
          });
          const participant = occurrence?.participants[0];
          if (!occurrence || !participant || participant.financialEntryId) return;
          const courtName = occurrence.occurrenceCourts[0]?.court.name ?? "Quadra";
          const paidAt = new Date();
          const financialEntry = await tx.financialEntry.create({
            data: {
              arenaId,
              type: "REVENUE",
              category: "Reserva",
              description: `Reserva online · ${courtName}`,
              counterpartyName: participant.player.name,
              playerId: participant.player.id,
              amountCents: participant.amountCents,
              dueDate: occurrence.startsAt,
              status: "PAID",
              paidAt,
              paymentMethod: "Mercado Pago online",
              source: "ONLINE_BOOKING",
              externalReference: occurrence.id,
              onlineProvider: "MERCADO_PAGO",
              onlinePaymentId: String(payment.id ?? paymentId),
              notes: `Reserva online paga via Mercado Pago (${String(payment.id ?? paymentId)}).`
            }
          });
          await tx.financialSettlement.create({ data: { arenaId, financialEntryId: financialEntry.id, amountCents: participant.amountCents, paymentMethod: "Mercado Pago online", paidAt, notes: `Pagamento online Mercado Pago confirmado (${String(payment.id ?? paymentId)}).` } });
          await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { financialEntryId: financialEntry.id, paymentMethod: "Mercado Pago online" } });
          await tx.scheduleOccurrence.update({ where: { id: occurrence.id }, data: { status: "SCHEDULED" } });
        });
        return NextResponse.json({ ok: true });
      }

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
          data: { status: "PAID", paidAt: new Date(), paymentMethod: "Mercado Pago online", onlinePaymentId: String(payment.id ?? paymentId) }
        });
        if (current.source === "ONLINE_BOOKING" && current.externalReference) {
          await tx.scheduleOccurrence.updateMany({ where: { id: current.externalReference, arenaId: entry.arenaId, sourceType: "ONLINE_BOOKING", status: "PENDING_PAYMENT" }, data: { status: "SCHEDULED" } });
        }
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
