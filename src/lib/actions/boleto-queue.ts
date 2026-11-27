"use server";
import { runBoletoQueueMutation } from '@/lib/finance/boleto-queue-mutation';
export async function cancelQueuedBoletoAction(form: FormData) { return runBoletoQueueMutation('cancel',form); }
export async function cancelQueuedBoletosAction(form: FormData) { return runBoletoQueueMutation('cancel-batch',form); }
export async function generateQueuedBoletoNowAction(form: FormData) { return runBoletoQueueMutation('generate',form); }
export async function reconcileReceivedBoletosAction() { const result = await runBoletoQueueMutation('reconcile'); if (result.error || result.retired === undefined || result.failed === undefined) throw new Error('Não foi possível conferir os boletos recebidos.'); return { retired: result.retired, failed: result.failed }; }
