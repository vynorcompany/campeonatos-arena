import 'server-only';
import { headers } from 'next/headers';
import { backendOrigin } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { financialMutationFields, financialMutationInputSchema, financialMutationOutcomeSchema, type FinancialMutationOperation } from '@/lib/backend/contracts/financial-mutations';
export async function remoteFinancialMutation(origin: string, operation: FinancialMutationOperation, form: FormData) {
  const fields: Record<string, string[]> = {};
  for (const name of financialMutationFields[operation]) {
    const values = form.getAll(name);
    if (values.some(value => typeof value !== 'string')) throw new Error('Campo financeiro inválido.');
    if (values.length) fields[name] = values as string[];
  }
  const payload = financialMutationInputSchema(operation).parse({ fields });
  const cookie = await managementCookieHeader();
  const browserOrigin = (await headers()).get('origin');
  // A timeout may follow a committed settlement. Never retry a financial write.
  const response = await fetch(new URL(`/api/management/finance/actions/${operation}`, backendOrigin(origin)), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(browserOrigin ? { origin: browserOrigin } : {}) },
    body: JSON.stringify(payload), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(operation === 'settings-send-pending-comanda-whatsapp' ? 450_000 : 90_000),
  });
  const result = financialMutationOutcomeSchema.parse(await response.json());
  if (!response.ok) throw new Error('error' in result ? result.error : 'Não foi possível confirmar a alteração financeira. Confira os lançamentos antes de tentar novamente.');
  return result;
}
