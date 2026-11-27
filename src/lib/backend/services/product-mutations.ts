import 'server-only';
import { ZodError } from 'zod';
import { ProductOperationError } from '@/lib/backend/product-operation-error';
import * as pos from '@/lib/backend/services/products-pos';
import { updateProductFiscalProfileAction } from '@/lib/backend/services/products-fiscal';
import * as services from '@/lib/backend/services/products-services';
import { updateStandardServicePriceAction } from '@/lib/backend/services/products-standard-service-prices';
import { productOutcomeSchema, type ProductMutationOperation } from '@/lib/backend/contracts/product-mutations';
const handlers = { 'create-product': pos.createProductAction, 'update-product': pos.updateProductAction, 'adjust-stock': pos.adjustStockAction, 'stock-balance': pos.createStockBalanceAction, 'create-sale': pos.createSaleAction, 'create-cart-sale': pos.createCartSaleAction, 'stock-aggregates': pos.updateStockAggregatesAction, 'product-fiscal': updateProductFiscalProfileAction, 'save-service': services.saveServiceAction, 'manage-service': services.manageServiceAction, 'standard-service-price': updateStandardServicePriceAction };
export async function executeProductMutation(operation: ProductMutationOperation, form: FormData) {
  let result;
  try { result = await handlers[operation](form); } catch (error) { if (error instanceof SyntaxError && operation === 'create-cart-sale') throw new ProductOperationError('Revise os itens da venda.'); if (error instanceof ZodError) throw new ProductOperationError(error.issues[0]?.message ?? 'Dados inválidos.'); throw error; }
  return productOutcomeSchema(operation).parse(result ?? {});
}
