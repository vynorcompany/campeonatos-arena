import Link from "next/link";
import { serviceMatchesSearch } from "@/lib/calendar/service-search";
import { ServiceDialog } from "@/components/products/service-dialog";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { StandardServicePriceSettings } from "@/components/products/standard-service-prices";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";
import { withArenaTransaction } from "@/lib/rls";
import { STANDARD_SERVICES, standardServicePrices } from "@/lib/calendar/standard-services";
export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim().slice(0, 120) ?? "";
  const auth = await requireModuleView("stock");
  const [rows, services, courts] = await withArenaTransaction(auth.arenaId, tx => Promise.all([tx.arenaServicePrice.findMany({ where: { arenaId: auth.arenaId }, select: { serviceCode: true, priceCents: true } }), tx.product.findMany({ where: { arenaId: auth.arenaId, isService: true, serviceDeletedAt: null }, orderBy: { name: "asc" } }), tx.court.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })]));
  const canEdit = canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <div className="tw:grid tw:min-w-0 tw:gap-4"><form className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2" role="search"><label className={`${ui.field} tw:min-w-0 tw:flex-1 tw:max-w-sm`}>Pesquisar serviços<input type="search" name="q" defaultValue={query} placeholder="Nome do serviço" maxLength={120}/></label><button className={ui.secondary} type="submit">Buscar</button>{query ? <Link className={ui.secondary} href="/pdv/servicos">Limpar</Link> : null}</form><StandardServicePriceSettings query={query} prices={standardServicePrices(rows)} services={services} courts={courts} canEdit={canEdit}>{canEdit ? <ServiceDialog courts={courts} /> : null}</StandardServicePriceSettings><div className={ui.list}>{query && !services.some(service => serviceMatchesSearch(service.name, query)) && !STANDARD_SERVICES.some(service => serviceMatchesSearch(service.name, query)) ? <p className="tw:p-4 tw:text-sm tw:text-[var(--muted)]">Nenhum serviço encontrado.</p> : null}{services.filter(service => !service.sku.startsWith("ARENA-SERVICE:") && serviceMatchesSearch(service.name, query)).map(service => <article key={service.id} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_auto]`}><div><strong>{service.name}{!service.active ? " · Inativo" : ""}</strong><small>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.priceCents / 100)}{service.serviceHourly ? "/h" : ""} · {service.showOnAgenda ? "Grade" : "Fora da grade"} · {service.showOnComandas ? "Comandas" : "Fora das comandas"}{service.showOnPortalBooking ? ` · Portal: até ${service.bookingConcurrentLimit} reserva(s) simultânea(s)` : ""}</small></div>{canEdit ? <ServiceDialog service={service} courts={courts} /> : null}</article>)}</div></div>;
}
