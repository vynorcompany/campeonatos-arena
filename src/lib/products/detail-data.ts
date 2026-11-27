import 'server-only';
import { productDetailDataSchema } from '@/lib/backend/contracts/product-detail';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
export async function getProductDetailData(arenaId: string, productId: string) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/products/detail/${encodeURIComponent(productId)}`, productDetailDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 }) : await (await import('@/lib/backend/services/product-detail')).resolveProductDetail(arenaId, productId);
  return data ? { ...data, product: { ...data.product, updatedAt: new Date(data.product.updatedAt), stockMovements: data.product.stockMovements.map(row => ({ ...row, createdAt: new Date(row.createdAt) })) } } : null;
}
