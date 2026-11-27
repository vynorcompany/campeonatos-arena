import 'server-only';
import { remoteFinancialMutation } from '@/lib/backend/financial-mutations-client';
import { revalidatePath } from 'next/cache';
import { refreshFinancialSettings, refreshFinanceRoutes } from '@/lib/finance/revalidation';
import type { FinancialMutationOperation } from '@/lib/backend/contracts/financial-mutations';
export async function runFinancialMutation(operation: FinancialMutationOperation, form: FormData) {
  const result = process.env.VX4_BACKEND_ORIGIN ? await remoteFinancialMutation(process.env.VX4_BACKEND_ORIGIN, operation, form)
    : await (await import('@/lib/backend/services/financial-mutations')).executeFinancialMutation(operation, form);
  if (!('error' in result)) {
    if (operation === 'payroll-create-teacher-monthly-payable') { refreshFinanceRoutes(); revalidatePath(`/professores/${String(form.get('teacherId') ?? '')}`); }
    else if (operation === 'settings-connect-payment-provider') revalidatePath('/financeiro/configuracoes/pagamentos-online');
    else if (['settings-save-financial-operations','settings-save-portal-payment','settings-save-comanda-whatsapp','settings-send-pending-comanda-whatsapp'].includes(operation)) {
      revalidatePath('/financeiro/configuracoes');
      if (operation === 'settings-save-financial-operations') { revalidatePath('/comandas'); revalidatePath('/configuracoes'); }
      if (operation === 'settings-save-portal-payment') { revalidatePath('/home'); revalidatePath('/classificacao', 'layout'); }
    }
    else if (operation.startsWith('settings-')) {
      refreshFinancialSettings();
      if (operation === 'settings-reconcile-bank-account-balance') refreshFinanceRoutes();
      if (operation === 'settings-update-fiscal-settings') revalidatePath('/pdv', 'layout');
    } else refreshFinanceRoutes();
  }
  return Object.keys(result).length ? result : undefined;
}
