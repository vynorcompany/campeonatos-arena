import 'server-only';
import { remoteFinancialMutation } from '@/lib/backend/financial-mutations-client';
import { refreshFinanceRoutes } from '@/lib/finance/revalidation';
import type { FinancialMutationOperation } from '@/lib/backend/contracts/financial-mutations';
export async function runFinancialMutation(operation: FinancialMutationOperation, form: FormData) {
  const result = process.env.VX4_BACKEND_ORIGIN ? await remoteFinancialMutation(process.env.VX4_BACKEND_ORIGIN, operation, form)
    : await (await import('@/lib/backend/services/financial-mutations')).executeFinancialMutation(operation, form);
  if (!('error' in result)) refreshFinanceRoutes();
  return Object.keys(result).length ? result : undefined;
}
