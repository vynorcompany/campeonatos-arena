import { getOutstandingCents } from "@/lib/finance/settlements";

export type BookingService = { id: string; name: string; date: string; amountCents: number; chargedAmountCents: number; state: string; financialEntryId: string | null };
export const bookingServicesInclude = { include: { participant: { include: { occurrence: { select: { bookingTypeName: true, startsAt: true, status: true, serviceReservations: { select: { serviceName: true, priceCents: true } } } }, financialEntry: { select: { id: true, status: true, amountCents: true, settlements: { select: { amountCents: true, interestCents: true } } } } } } } } as const;
type Source = { id: string; participant: { amountCents: number; paymentMethod: string; occurrence: { bookingTypeName: string; startsAt: Date; status: string; serviceReservations?: { serviceName: string; priceCents: number }[] }; financialEntry: { id: string; amountCents: number; status: string; settlements: { amountCents: number; interestCents?: number }[] } | null } };
export function bookingServiceRows(rows: Source[]): BookingService[] {
  return rows.map(({ id, participant: p }) => {
    const entry = p.financialEntry;
    const pending = entry && ["PENDING", "OVERDUE", "PARTIAL"].includes(entry.status);
    const balance = pending ? getOutstandingCents(entry.amountCents, entry.settlements) : 0;
    const canceled = ["VOIDED", "CANCELED"].includes(entry?.status ?? "") || (!entry && p.occurrence.status === "CANCELED");
    return { id, name: [p.occurrence.bookingTypeName, ...(p.occurrence.serviceReservations ?? []).map(service => service.serviceName)].join(" · "), date: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(p.occurrence.startsAt), amountCents: canceled ? 0 : balance, chargedAmountCents: canceled ? 0 : (entry?.amountCents ?? p.amountCents), state: canceled ? "Cancelado" : balance > 0 ? (p.occurrence.status === "CANCELED" ? "Cobrança mantida" : "Da reserva") : p.amountCents > 0 ? (entry?.status === "PAID" || p.paymentMethod ? "Pago" : "Cobrança indisponível") : "Sem cobrança", financialEntryId: entry?.id ?? null };
  });
}
