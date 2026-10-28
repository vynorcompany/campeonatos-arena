import { ServiceDialog } from "@/components/products/service-dialog";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { StandardServicePriceSettings } from "@/components/products/standard-service-prices";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";
import { withArenaTransaction } from "@/lib/rls";
import { standardServicePrices } from "@/lib/calendar/standard-services";
export default async function ServicesPage() {
  const auth = await requireModuleView("stock");
  const [rows, services] = await withArenaTransaction(auth.arenaId, tx => Promise.all([tx.arenaServicePrice.findMany({ where: { arenaId: auth.arenaId }, select: { serviceCode: true, priceCents: true } }), tx.product.findMany({ where: { arenaId: auth.arenaId, isService: true }, orderBy: { name: "asc" } })]));
  const canEdit = canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <div className="tw:grid tw:min-w-0 tw:gap-4"><StandardServicePriceSettings prices={standardServicePrices(rows)} services={services} canEdit={canEdit}>{canEdit ? <ServiceDialog /> : null}</StandardServicePriceSettings><div className={ui.list}>{services.filter(service => !service.sku.startsWith("ARENA-SERVICE:")).map(service => <article key={service.id} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_auto]`}><div><strong>{service.name}{!service.active ? " · Inativo" : ""}</strong><small>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.priceCents / 100)}{service.serviceHourly ? "/h" : ""} · {service.showOnAgenda ? "Grade" : "Fora da grade"} · {service.showOnComandas ? "Comandas" : "Fora das comandas"}{service.showOnPortalBooking ? ` · Portal: até ${service.bookingConcurrentLimit} reserva(s) simultânea(s)` : ""}</small></div>{canEdit ? <ServiceDialog service={service} /> : null}</article>)}</div></div>;
}
