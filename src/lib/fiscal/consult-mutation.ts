import 'server-only';
import { revalidatePath } from 'next/cache';
import { remoteFiscalConsult } from '@/lib/backend/fiscal-consult-client';
export async function runFiscalConsult(form: FormData) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const result = origin ? await remoteFiscalConsult(origin, form).catch(() => ({ error: 'Não foi possível confirmar a operação fiscal. Confira a nota antes de tentar novamente.' })) : await (await import('@/lib/backend/services/focus-fiscal-actions')).consultFocusDocumentAction(form) ?? {};
  if ('error' in result) return result;
  revalidatePath('/financeiro/notas-fiscais');
}
