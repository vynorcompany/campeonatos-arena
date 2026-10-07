import { arenaDatabase } from "@/lib/arena-database";
import { StockWorkspace } from "@/components/products/stock-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
export default async function StockPage({ searchParams }: { searchParams?: Promise<{q?: string; stock?: string}> }) {
  const auth = await requireModuleView("stock");
  const prisma = arenaDatabase(auth.arenaId);
  const filters = await searchParams;
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { arenaId: auth.arenaId }, include: { category: { select: { name: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.productCategory.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  return <StockWorkspace products={products} categories={categories} query={filters?.q?.trim()} stock={filters?.stock} />;
}
