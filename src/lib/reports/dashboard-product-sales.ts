import type { Prisma, PrismaClient } from "@prisma/client";

type Period = { gte: Date; lte: Date };

/** Aggregate sales without hydrating a required Product relation that RLS may hide for legacy invalid links. */
export async function loadDashboardProductSales(
  db: Pick<PrismaClient, "saleItem" | "product">,
  arenaId: string,
  period: Period
) {
  const where: Prisma.SaleItemWhereInput = { sale: { arenaId, createdAt: period } };
  const groups = await db.saleItem.groupBy({ where, by: ["productId"], _sum: { quantity: true } });
  if (!groups.length) return [];
  const products = await db.product.findMany({
    where: { arenaId, id: { in: groups.map((group) => group.productId) } },
    select: { id: true, name: true }
  });
  const names = new Map(products.map((product) => [product.id, product.name]));
  return groups.flatMap((group) => {
    const name = names.get(group.productId);
    return name ? [{ name, value: group._sum.quantity ?? 0 }] : [];
  });
}
