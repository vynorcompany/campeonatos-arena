import 'server-only';
import { headers } from 'next/headers';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { backendOrigin } from '@/lib/backend/http-client';
import { boletoQueueInputSchema, boletoQueueOutcomeSchema, type BoletoQueueOperation } from '@/lib/backend/contracts/boleto-queue';
export async function remoteBoletoQueueMutation(origin: string, operation: BoletoQueueOperation, form: FormData) {
 const values = form.getAll('entryId'); if (values.some(value => typeof value !== 'string') || (operation !== 'cancel-batch' && values.length > 1)) throw new Error('Seleção inválida.');
 const input = boletoQueueInputSchema(operation).parse(operation === 'reconcile' ? {} : operation === 'cancel-batch' ? { entryIds: [...new Set(values)] } : { entryId: values[0] });
 const cookie = await managementCookieHeader(); const requestOrigin = (await headers()).get('origin');
 // Provider acceptance can precede a connection failure. Never replay automatically.
 const response = await fetch(new URL(`/api/management/finance/boleto-queue/${operation}`,backendOrigin(origin)), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(requestOrigin ? { origin: requestOrigin } : {}) }, body: JSON.stringify(input), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(150000) });
 const result = boletoQueueOutcomeSchema.parse(await response.json());
 return response.ok ? result : { error: result.error ?? 'Não foi possível confirmar a operação.' };
}
