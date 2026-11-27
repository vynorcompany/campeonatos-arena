import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { readStockAggregates } from '@/lib/products/stock-recipe';
import { readStockChoices } from '@/lib/products/composition-schema';
import { readProductFiscalProfile } from '@/lib/fiscal/product-profile';
import { productDetailDataSchema } from '@/lib/backend/contracts/product-detail';
export async function resolveProductDetail(arenaId: string, productId: string) {
  return withArenaTransaction(arenaId, async tx => {
    const product = await tx.product.findFirst({ where: { id: productId, arenaId }, select: { id: true, name: true, sku: true, notes: true, priceCents: true, costCents: true, stockQuantity: true, minStock: true, categoryId: true, isService: true, updatedAt: true, stockAggregates: true, stockChoices: true, fiscalProfile: true, stockMovements: { select: { id: true, type: true, quantity: true, reason: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 8 } } });
    if (!product) return null;
    const [categories, aggregateProducts, issuer] = await Promise.all([
      tx.productCategory.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      tx.product.findMany({ where: { arenaId, isService: false, active: true, id: { not: productId } }, select: { id: true, name: true, stockAggregates: true, stockChoices: true }, orderBy: { name: 'asc' } }),
      tx.fiscalSettings.findUnique({ where: { arenaId }, select: { crt: true, issuerState: true } }),
    ]);
    return productDetailDataSchema.parse({ product: { ...product, updatedAt: product.updatedAt.toISOString(), stockAggregates: readStockAggregates(product.stockAggregates), stockChoices: readStockChoices(product.stockChoices), fiscalProfile: readProductFiscalProfile(product.fiscalProfile), stockMovements: product.stockMovements.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })) }, categories, aggregateProducts: aggregateProducts.map(row => ({ ...row, stockAggregates: readStockAggregates(row.stockAggregates), stockChoices: readStockChoices(row.stockChoices) })), issuer });
  });
}
