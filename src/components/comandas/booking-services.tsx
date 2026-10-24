import type { BookingService } from "@/lib/comandas/booking-service";
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export function BookingServices({ services, historical = false }: { services: BookingService[]; historical?: boolean }) {
  if (!services.length) return null;
  return <div className="tw:grid tw:min-w-0 tw:gap-2 tw:border-t tw:border-[var(--line)] tw:py-2" aria-label="Serviços da reserva">{services.map(service => <div key={service.id} className="tw:flex tw:min-w-0 tw:items-start tw:justify-between tw:gap-3"><div className="tw:min-w-0 tw:flex-1"><strong className="tw:block tw:break-words tw:text-xs">{service.name}</strong><small className="tw:block tw:text-[10px] tw:text-[var(--muted)]">{service.date} · {service.state}</small></div><strong className="tw:shrink-0 tw:text-xs">{money(historical ? service.chargedAmountCents : service.amountCents)}</strong></div>)}</div>;
}
