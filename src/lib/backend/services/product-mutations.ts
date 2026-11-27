import 'server-only';
import { ZodError } from 'zod';
import { ProductOperationError } from '@/lib/backend/product-operation-error';
import * as services from '@/lib/backend/services/products-services';
import { updateStandardServicePriceAction } from '@/lib/backend/services/products-standard-service-prices';
import { productMutationOutcomeSchema, type ProductMutationOperation } from '@/lib/backend/contracts/product-mutations';
const handlers = { 'save-service': services.saveServiceAction, 'manage-service': services.manageServiceAction, 'standard-service-price': updateStandardServicePriceAction };
export async function executeProductMutation(operation: ProductMutationOperation, form: FormData) {
  let result;
  try { result = await handlers[operation](form); } catch (error) { if (error instanceof ZodError) throw new ProductOperationError(error.issues[0]?.message ?? 'Dados inválidos.'); throw error; }
  return productMutationOutcomeSchema.parse(result ?? {});
}
