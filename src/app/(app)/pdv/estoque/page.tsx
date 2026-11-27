import { getProductPageData } from "@/lib/products/page-data";
import { StockWorkspace } from "@/components/products/stock-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";
export default async function StockPage({ searchParams }: { searchParams?: Promise<{q?: string; stock?: string}> }) {
  const auth = await requireModuleView("stock");
  const filters = await searchParams;
  const { products, categories } = await getProductPageData(auth.arenaId, "stock");
  return <StockWorkspace products={products} categories={categories} query={filters?.q?.trim()} stock={filters?.stock} canEdit={canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions)} />;
}
