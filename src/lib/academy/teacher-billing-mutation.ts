import 'server-only';
import { revalidatePath } from 'next/cache';
import { refreshAcademyRoutes } from '@/lib/academy/revalidation';
import { remoteTeacherBilling } from '@/lib/backend/teacher-billing-client';
import type { TeacherBillingOperation } from '@/lib/backend/contracts/teacher-plan-billing';
export async function runTeacherBilling(operation: TeacherBillingOperation, form: FormData) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const result = origin ? await remoteTeacherBilling(origin, operation, form).catch(() => ({ error: 'Não foi possível confirmar a operação. Confira o plano e as cobranças antes de tentar novamente.' })) : await (await import('@/lib/backend/services/teacher-billing-mutations')).executeTeacherBilling(operation, form);
  if (!('error' in result) && operation !== 'preview') {
    refreshAcademyRoutes();
    if (operation === 'transfer' || operation === 'schedule') revalidatePath(`/professores/${String(form.get('teacherId') ?? '')}`);
    if (operation === 'transfer') { revalidatePath('/financeiro'); revalidatePath('/home'); }
  }
  return result;
}
