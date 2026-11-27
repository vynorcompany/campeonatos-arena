import 'server-only';
import { revalidatePath } from 'next/cache';
import { refreshAcademyRoutes } from '@/lib/academy/revalidation';
import { remoteAcademyMutation } from '@/lib/backend/academy-mutations-client';
import { classGroupOperations, lessonCreditSettingsOperations, type AcademyMutationOperation } from '@/lib/backend/contracts/academy-mutations';
export async function runAcademyMutation(operation: AcademyMutationOperation, form: FormData) {
  const result = process.env.VX4_BACKEND_ORIGIN ? await remoteAcademyMutation(process.env.VX4_BACKEND_ORIGIN, operation, form)
    : await (await import('@/lib/backend/services/academy-mutations')).executeAcademyMutation(operation, form);
  if (!('error' in result)) {
    if (classGroupOperations.includes(operation)) refreshClassGroupRoutes(operation, form);
    else refreshAcademyRoutes();
    if (lessonCreditSettingsOperations.includes(operation)) { revalidatePath('/home'); revalidatePath('/financeiro/planos'); }
    if (operation === 'create-teacher-plan-with-price') { revalidatePath(`/professores/${String(form.get('teacherId') ?? '')}`); revalidatePath('/financeiro/planos'); }
    if (operation === 'assign-teacher-plan-student') revalidatePath(`/professores/${String(form.get('teacherId') ?? '')}`);
  }
  return operation === 'create-teacher-plan-with-price' || 'error' in result ? result : undefined;
}

function refreshClassGroupRoutes(operation: AcademyMutationOperation, form: FormData) {
  const slug = String(form.get('arenaSlug') ?? '').trim();
  if (operation === 'approve-class-group-request') { revalidatePath('/aulas'); revalidatePath('/financeiro'); return; }
  revalidatePath(`/classificacao/${slug}`);
  if (operation === 'check-in-portal-lesson') { revalidatePath('/home'); revalidatePath(`/checkin/${slug}`); }
  if (['check-in-portal-lesson', 'request-portal-lesson-makeup', 'request-class-group', 'move-class-group-student', 'update-teacher-portal-class-group-capacity', 'schedule-teacher-makeup'].includes(operation)) revalidatePath('/aulas');
  if (['update-teacher-portal-class-group-capacity', 'schedule-teacher-makeup'].includes(operation)) revalidatePath('/professores');
}
