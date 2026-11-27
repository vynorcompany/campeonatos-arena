import 'server-only';
import { headers } from 'next/headers';
import { backendOrigin } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { teacherBillingFields, teacherBillingInputSchema, teacherBillingOutcomeSchema, type TeacherBillingOperation } from '@/lib/backend/contracts/teacher-plan-billing';
export async function remoteTeacherBilling(origin: string, operation: TeacherBillingOperation, form: FormData) {
  const fields: Record<string, string> = {};
  for (const key of teacherBillingFields[operation]) {
    const values = form.getAll(key); if (values.length > 1 || values.some(value => typeof value !== 'string')) throw new Error('Campo de plano inválido.');
    if (values.length) fields[key] = values[0] as string;
  }
  const payload = teacherBillingInputSchema(operation).parse({ fields });
  const cookie = await managementCookieHeader(); const originHeader = (await headers()).get('origin');
  // A provider cancellation or a transfer may commit before the response arrives. Never retry.
  const response = await fetch(new URL(`/api/management/academy/teacher-billing/${operation}`, backendOrigin(origin)), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(originHeader ? { origin: originHeader } : {}) }, body: JSON.stringify(payload), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(150_000) });
  const result = teacherBillingOutcomeSchema(operation).parse(await response.json());
  if (!response.ok) return { error: 'error' in result ? result.error : 'Não foi possível confirmar a operação. Confira o plano antes de tentar novamente.' };
  return result;
}
