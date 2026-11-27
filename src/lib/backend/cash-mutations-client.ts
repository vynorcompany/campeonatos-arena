import 'server-only';
import { headers } from 'next/headers';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { backendOrigin } from '@/lib/backend/http-client';
import { cashMutationFields, cashMutationInputSchema, cashMutationOutcomeSchema, type CashMutation } from '@/lib/backend/contracts/cash-register';
export async function remoteCashMutation(origin: string, operation: CashMutation, form: FormData) {
  const fields: Record<string, string> = {};
  for (const key of cashMutationFields[operation]) { const values = form.getAll(key); if (values.length > 1 || values.some(value => typeof value !== 'string')) throw new Error('Campo inválido.'); if (values.length) fields[key] = values[0] as string; }
  const input = cashMutationInputSchema(operation).parse({ fields }); const cookie = await managementCookieHeader(); const originHeader = (await headers()).get('origin');
  // A timeout can follow a committed cash operation. Never replay it automatically.
  const response = await fetch(new URL(`/api/management/pos/cash/${operation}`, backendOrigin(origin)), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(originHeader ? { origin: originHeader } : {}) }, body: JSON.stringify(input), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(60000) });
  const result = cashMutationOutcomeSchema.parse(await response.json());
  return response.ok ? result : { error: 'error' in result ? result.error : 'Não foi possível confirmar a operação.' };
}
