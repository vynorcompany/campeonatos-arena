import 'server-only';
import { headers } from 'next/headers';
import { backendOrigin } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { productMutationFields, productMutationInputSchema, productMutationOutcomeSchema, type ProductMutationOperation } from '@/lib/backend/contracts/product-mutations';
export async function remoteProductMutation(origin: string, operation: ProductMutationOperation, form: FormData) {
  const fields: Record<string, string> = {};
  for (const key of productMutationFields[operation]) { const values = form.getAll(key); if (values.length > 1 || values.some(value => typeof value !== 'string')) throw new Error('Campo de produto inválido.'); if (values.length) fields[key] = values[0] as string; }
  const payload = productMutationInputSchema(operation).parse({ fields }); const cookie = await managementCookieHeader(); const originHeader = (await headers()).get('origin');
  // Mutations may commit before a deadline; never repeat a write automatically.
  const response = await fetch(new URL(`/api/management/products/actions/${operation}`, backendOrigin(origin)), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(originHeader ? { origin: originHeader } : {}) }, body: JSON.stringify(payload), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(60_000) });
  const result = productMutationOutcomeSchema.parse(await response.json());
  return !response.ok ? { error: 'error' in result ? result.error : 'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.' } : result;
}
