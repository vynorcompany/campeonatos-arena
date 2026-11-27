import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { productPageDataSchema, type ProductPage } from '@/lib/backend/contracts/product-pages';
export async function resolveProductPage(arenaId: string, page: ProductPage) {
  return withArenaTransaction(arenaId, async tx => {
    const result = productPageDataSchema.parse({ products: [], categories: [], courts: [], prices: [], services: [] });
    if (page === 'stock') {
      const [products, categories] = await Promise.all([
        tx.product.findMany({ where: { arenaId, isService: false }, select: { id: true, name: true, sku: true, priceCents: true, stockQuantity: true, minStock: true, active: true, category: { select: { name: true } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
        tx.productCategory.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      ]); result.products = products; result.categories = categories;
    } else {
      const [prices, services, courts] = await Promise.all([
        tx.arenaServicePrice.findMany({ where: { arenaId }, select: { serviceCode: true, priceCents: true } }),
        tx.product.findMany({ where: { arenaId, isService: true, serviceDeletedAt: null }, select: { id: true, name: true, sku: true, active: true, priceCents: true, serviceHourly: true, showOnAgenda: true, showOnComandas: true, showOnPortalBooking: true, bookingConcurrentLimit: true, bookingRules: true }, orderBy: { name: 'asc' } }),
        tx.court.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      ]); result.prices = prices; result.services = services.map(row => productPageDataSchema.shape.services.element.parse(row)); result.courts = courts;
    }
    return productPageDataSchema.parse(result);
  });
}
