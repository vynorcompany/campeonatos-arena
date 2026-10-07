import { StandardServicePriceSettings } from "@/components/products/standard-service-prices";
import { requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { standardServicePrices } from "@/lib/calendar/standard-services";
export default async function ServicesPage() {
  const auth = await requireModuleView("stock");
  const rows = await withArenaTransaction(auth.arenaId, tx => tx.arenaServicePrice.findMany({ where: { arenaId: auth.arenaId }, select: { serviceCode: true, priceCents: true } }));
  return <div className="tw:grid tw:min-w-0 tw:gap-4"><h1 className="tw:sr-only">Serviços</h1><StandardServicePriceSettings prices={standardServicePrices(rows)} /></div>;
}
