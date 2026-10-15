import type { PrismaClient } from "@prisma/client";

/** Resolve only products owned by the active arena; legacy foreign references get a neutral label. */
export async function loadVisibleProductNames(
  db: Pick<PrismaClient, "product">,
  arenaId: string,
  productIds: string[]
) {
  const ids = [...new Set(productIds)];
  if (!ids.length) return new Map<string, string>();
  const products = await db.product.findMany({
    where: { arenaId, id: { in: ids } },
    select: { id: true, name: true }
  });
  return new Map(products.map((product) => [product.id, product.name]));
}

export function visibleProductName(names: Map<string, string>, productId: string) {
  return names.get(productId) ?? "Produto indisponível";
}
