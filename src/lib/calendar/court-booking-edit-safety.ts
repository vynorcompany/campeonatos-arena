import type { ArenaTransaction } from "@/lib/rls";
import { isAgendaManagedBooking } from "./agenda-managed-booking";

export async function assertCourtBookingMayBeEdited(tx: ArenaTransaction, arenaId: string, occurrenceId: string) {
  const [booking] = await tx.$queryRaw<{ status: string; sourceType: string; bookingTypeName: string }[]>`
    SELECT "status", "sourceType", "bookingTypeName" FROM "ScheduleOccurrence"
    WHERE "id" = ${occurrenceId} AND "arenaId" = ${arenaId}
    FOR UPDATE
  `;
  if (!booking) throw new Error("Reserva não encontrada nesta arena.");
  if (booking.bookingTypeName === "Bloqueio") throw new Error("Horário bloqueado. Libere o horário antes de reservar.");
  if (!isAgendaManagedBooking(booking.sourceType)) throw new Error("Este horário é gerenciado pela origem e não pode ser editado pela agenda.");
  if (booking.status === "PENDING_PAYMENT") throw new Error("Esta reserva aguarda pagamento e não pode ser editada agora.");

  const linkedEntries = await tx.scheduleParticipant.findMany({
    where: { occurrenceId },
    select: { financialEntryId: true },
  });
  for (const entryId of [...new Set(linkedEntries.map((item) => item.financialEntryId).filter((id): id is string => Boolean(id)))].sort()) {
    await tx.$queryRaw`SELECT "id" FROM "FinancialEntry" WHERE "id" = ${entryId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  }

  const committedCharge = await tx.scheduleParticipant.findFirst({
    where: {
      occurrenceId,
      financialEntry: {
        is: {
          OR: [
            { status: { in: ["PAID", "PARTIAL"] } },
            { settlements: { some: {} } },
            { onlineProvider: { not: "" } },
            { onlinePaymentId: { not: "" } },
            { onlinePaymentUrl: { not: "" } },
          ],
        },
      },
    },
    select: { id: true },
  });
  if (committedCharge) throw new Error("Esta reserva já tem pagamento ou cobrança online vinculada. Faça o ajuste financeiro antes de editá-la.");
}
