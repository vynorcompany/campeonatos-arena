import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoPayment } from "@/lib/payments/mercado-pago";
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

    const payment = await getMercadoPagoPayment(paymentId);
    const externalReference = String(payment.external_reference ?? "");

    if (!externalReference) {
      return NextResponse.json({ ok: true, ignored: "missing_external_reference" });
    }

    const approved = payment.status === "approved";
    await prisma.$transaction(async (tx) => {
      const registration = await tx.publicTournamentRegistration.findUnique({
        where: { id: externalReference },
        include: {
          tournament: {
            select: {
              id: true,
              arenaId: true
            }
          }
        }
      });

      if (!registration) {
        return;
      }

      await tx.publicTournamentRegistration.update({
        where: { id: externalReference },
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
