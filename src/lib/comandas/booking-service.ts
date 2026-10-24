import { getOutstandingCents } from "@/lib/finance/settlements";

export type BookingService = { id: string; name: string; date: string; amountCents: number; chargedAmountCents: number; state: string; financialEntryId: string | null };
export const bookingServicesInclude = { include: { participant: { include: { occurrence: { select: { bookingTypeName: true, startsAt: true, status: true } }, financialEntry: { select: { id: true, status: true, amountCents: true, settlements: { select: { amountCents: true } } } } } } } } as const;
type Source = { id: string; participant: { amountCents: number; paymentMethod: string; occurrence: { bookingTypeName: string; startsAt: Date; status: string }; financialEntry: { id: string; amountCents: number; status: string; settlements: { amountCents: number }[] } | null } };
export function bookingServiceRows(rows: Source[]): BookingService[] {
  return rows.map(({ id, participant: p }) => {
    const entry = p.financialEntry;
    const pending = entry && ["PENDING", "OVERDUE", "PARTIAL"].includes(entry.status);
    const balance = pending ? getOutstandingCents(entry.amountCents, entry.settlements) : 0;
    const canceled = entry?.status === "CANCELED" || p.occurrence.status === "CANCELED";
    return { id, name: p.occurrence.bookingTypeName, date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(p.occurrence.startsAt), amountCents: canceled ? 0 : balance, chargedAmountCents: canceled ? 0 : (entry?.amountCents ?? p.amountCents), state: canceled ? "Cancelado" : balance > 0 ? "Da reserva" : p.amountCents > 0 ? (entry?.status === "PAID" || p.paymentMethod ? "Pago" : "Cobrança indisponível") : "Sem cobrança", financialEntryId: entry?.id ?? null };
  });
}
