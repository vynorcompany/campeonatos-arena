import type { ArenaTransaction } from "@/lib/rls";
import { onlineBookingHoldCutoff } from "@/lib/calendar/online-booking-hold";
import { getMissingBoletoPayerFields } from "@/lib/payments/boleto-payer";

export type BookingPaymentMethod = "PIX" | "CARD" | "BOLETO";

const pendingMethodPrefix = "MERCADO_PAGO_PENDING:";

export function isConfirmedSchedulePaymentMethod(paymentMethod: string) {
  return Boolean(paymentMethod) && !paymentMethod.startsWith(pendingMethodPrefix);
}

export async function claimOnlineBookingPaymentMethod(
  tx: ArenaTransaction,
  input: { arenaId: string; occurrenceId: string; playerId: string; method: BookingPaymentMethod },
) {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "ScheduleOccurrence"
    WHERE "id" = ${input.occurrenceId} AND "arenaId" = ${input.arenaId}
    FOR UPDATE
  `;
  if (!locked.length) return null;

  const booking = await tx.scheduleOccurrence.findFirst({
    where: {
      id: input.occurrenceId,
      arenaId: input.arenaId,
      sourceType: "ONLINE_BOOKING",
      status: "PENDING_PAYMENT",
      createdAt: { gt: onlineBookingHoldCutoff() },
      participants: { some: { playerId: input.playerId } },
    },
    include: {
      occurrenceCourts: { include: { court: { select: { name: true } } } },
      participants: {
        where: { playerId: input.playerId },
        include: { player: { select: { id: true, name: true, email: true, cpf: true, addressZipCode: true, addressStreet: true, addressNumber: true, addressNeighborhood: true, addressCity: true, addressState: true } } },
      },
    },
  });
  const participant = booking?.participants[0];
  if (!booking || !participant) return null;
  if (!participant.player.email) throw new Error("Informe seu e-mail no perfil para continuar com o pagamento online.");
  if (input.method === "BOLETO") {
    const missing = getMissingBoletoPayerFields(participant.player);
    if (missing.length) throw new Error(`Para emitir boleto, complete no perfil: ${missing.join(", ")}.`);
  }

  const chosenMethod = `${pendingMethodPrefix}${input.method}`;
  if (participant.paymentMethod && participant.paymentMethod !== chosenMethod) {
    throw new Error("Já existe uma cobrança iniciada para esta reserva. Continue com a forma de pagamento escolhida ou aguarde o prazo de 15 minutos para fazer uma nova reserva.");
  }
  if (!participant.paymentMethod) {
    await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { paymentMethod: chosenMethod } });
  }
  return booking;
}
