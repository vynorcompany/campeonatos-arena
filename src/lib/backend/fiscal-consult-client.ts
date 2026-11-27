import 'server-only';
import { headers } from 'next/headers';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { backendOrigin } from '@/lib/backend/http-client';
import { fiscalConsultInputSchema, fiscalConsultOutcomeSchema } from '@/lib/backend/contracts/fiscal-invoices';
export async function remoteFiscalConsult(origin: string, form: FormData) {
  const fields: Record<string,string> = {};
  for (const key of ['documentId','cancelReason']) { const values = form.getAll(key); if (values.length > 1 || values.some(value => typeof value !== 'string')) throw new Error('Campo fiscal inválido.'); if (values.length) fields[key] = values[0] as string; }
  const payload = fiscalConsultInputSchema.parse({ fields }); const cookie = await managementCookieHeader(); const originHeader = (await headers()).get('origin');
  // The provider can accept a request before the response fails. Never replay it automatically.
  const response = await fetch(new URL('/api/management/finance/invoices/consult', backendOrigin(origin)), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(originHeader ? { origin: originHeader } : {}) }, body: JSON.stringify(payload), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(150000) });
  const result = fiscalConsultOutcomeSchema.parse(await response.json());
  return response.ok ? result : { error: 'error' in result ? result.error : 'Não foi possível confirmar a operação fiscal.' };
}
