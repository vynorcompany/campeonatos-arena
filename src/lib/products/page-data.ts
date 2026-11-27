import 'server-only';
import { productPageDataSchema, type ProductPage } from '@/lib/backend/contracts/product-pages';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
export async function getProductPageData(arenaId: string, page: ProductPage) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  return origin ? readBackendContract(origin, `/api/management/products/pages/${page}`, productPageDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 }) : (await import('@/lib/backend/services/product-pages')).resolveProductPage(arenaId, page);
}
