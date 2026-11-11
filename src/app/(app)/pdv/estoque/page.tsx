import type { Prisma } from "@prisma/client";
import { paginationInput, paginationRange } from "@/lib/pagination";
import { arenaDatabase } from "@/lib/arena-database";
import { StockWorkspace } from "@/components/products/stock-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";
export default async function StockPage({ searchParams }: { searchParams?: Promise<{q?: string; stock?: string; page?: string; pageSize?: string}> }) {
  const auth = await requireModuleView("stock"), prisma = arenaDatabase(auth.arenaId), filters = await searchParams;
  const paging = paginationInput(filters), query = filters?.q?.trim() ?? "";
  const base = { arenaId: auth.arenaId, isService: false };
  const low = { stockQuantity: { lte: prisma.product.fields.minStock } };
  const where: Prisma.ProductWhereInput = { ...base, ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { sku: { contains: query, mode: "insensitive" } }] } : {}), ...(filters?.stock === "LOW" ? low : {}) };
  const [total, allCount, lowCount] = await Promise.all([prisma.product.count({where}), prisma.product.count({where:base}), prisma.product.count({where:{...base,...low}})]);
  const range = paginationRange(total, paging.page, paging.pageSize);
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where, skip: (range.page - 1) * paging.pageSize, take: paging.pageSize, include: { category: { select: { name: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }, {id:"asc"}] }),
    prisma.productCategory.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  return <StockWorkspace products={products} categories={categories} query={query} stock={filters?.stock} pagination={{total,allCount,lowCount,page:range.page,pageSize:paging.pageSize}} canEdit={canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions)} />;
}
