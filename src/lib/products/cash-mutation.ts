import 'server-only';
import { revalidatePath } from 'next/cache';
import { remoteCashMutation } from '@/lib/backend/cash-mutations-client';
import type { CashMutation } from '@/lib/backend/contracts/cash-register';
export async function runCashMutation(operation: CashMutation, form: FormData) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const result = origin ? await remoteCashMutation(origin, operation, form).catch(() => ({ error: 'Não foi possível confirmar a operação. Confira o caixa antes de tentar novamente.' })) : await (await import('@/lib/backend/services/cash-mutations')).executeCashMutation(operation, form);
  if ('error' in result) return result;
  for (const path of ['/pdv/caixa','/relatorios/caixa','/painel']) revalidatePath(path);
}
