import { NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/payments/mercado-pago";
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
    if (!registration) return NextResponse.json({ ok: true, ignored: "unknown_payment" });

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
