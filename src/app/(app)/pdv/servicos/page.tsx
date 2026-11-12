
import Link from "next/link";
import { ServiceDialog } from "@/components/products/service-dialog";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { StandardServicePriceSettings } from "@/components/products/standard-service-prices";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";
import { withArenaTransaction } from "@/lib/rls";
import { standardServicePrices } from "@/lib/calendar/standard-services";
export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim().slice(0, 120) ?? "";
  const auth = await requireModuleView("stock");
  const [rows, services, courts] = await withArenaTransaction(auth.arenaId, tx => Promise.all([tx.arenaServicePrice.findMany({ where: { arenaId: auth.arenaId }, select: { serviceCode: true, priceCents: true } }), tx.product.findMany({ where: { arenaId: auth.arenaId, isService: true, serviceDeletedAt: null }, orderBy: { name: "asc" } }), tx.court.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })]));
  const canEdit = canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <div className="tw:grid tw:min-w-0 tw:gap-4"><div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:justify-between tw:gap-2"><form className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2" role="search"><label className={`${ui.field} tw:min-w-0 tw:flex-1 tw:max-w-sm`}>Pesquisar serviços<input type="search" name="q" defaultValue={query} placeholder="Nome do serviço" maxLength={120}/></label><button className={ui.secondary} type="submit">Buscar</button>{query ? <Link className={ui.secondary} href="/pdv/servicos">Limpar</Link> : null}</form>{canEdit ? <ServiceDialog courts={courts} /> : null}</div><StandardServicePriceSettings query={query} prices={standardServicePrices(rows)} services={services} courts={courts} canEdit={canEdit}/></div>;
}
