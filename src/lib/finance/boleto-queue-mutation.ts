import 'server-only';
import { revalidatePath } from 'next/cache';
import { remoteBoletoQueueMutation } from '@/lib/backend/boleto-queue-client';
import { boletoQueueOutcomeSchema, type BoletoQueueOperation, type BoletoQueueOutcome } from '@/lib/backend/contracts/boleto-queue';
export async function runBoletoQueueMutation(operation: BoletoQueueOperation, form = new FormData()): Promise<BoletoQueueOutcome> {
 const origin = process.env.VX4_BACKEND_ORIGIN; let result: BoletoQueueOutcome;
 if (origin) result = await remoteBoletoQueueMutation(origin,operation,form).catch(() => ({ error: 'Não foi possível confirmar a operação. Confira a fila antes de tentar novamente.' }));
 else { const core = await import('@/lib/backend/services/boleto-queue-actions'); result = boletoQueueOutcomeSchema.parse(operation === 'generate' ? await core.generateQueuedBoletoNowAction(form) : operation === 'cancel' ? await core.cancelQueuedBoletoAction(form) : operation === 'cancel-batch' ? await core.cancelQueuedBoletosAction(form) : await core.reconcileReceivedBoletosAction()); }
 if (result.success || result.retired || (operation === 'cancel-batch' && result.failedIds)) { revalidatePath('/financeiro/fila-de-boletos'); revalidatePath('/financeiro/contas-a-receber'); }
 return result;
}
