import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canPerformPermission } from '@/lib/permissions';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import { boletoQueueOperationSchema, boletoQueueInputSchema, boletoQueueOutcomeSchema } from '@/lib/backend/contracts/boleto-queue';
import * as actions from '@/lib/backend/services/boleto-queue-actions';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
 const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
 if (!allowedFrontendOrigin(request.headers.get('origin'),process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
 const operation = boletoQueueOperationSchema.safeParse((await context.params).operation); if (!operation.success) return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
 const auth = await requireArenaAccess();
 if (!canPerformPermission(operation.data === 'generate' ? 'finance:receivable:settle' : 'finance:receivable:edit',auth.arenaRole,auth.systemRole,auth.editPermissions)) return NextResponse.json({ error: 'Sem permissão para executar esta ação.' }, { status: 403, headers });
 let input; try { input = boletoQueueInputSchema(operation.data).parse(await readBoundedJson(request,32*1024)); } catch(error) { return NextResponse.json({ error: 'Selecione os boletos corretamente.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
 const form = new FormData(); if (input.entryIds) for (const id of input.entryIds) form.append('entryId',id); else if (input.entryId) form.set('entryId',input.entryId);
 try {
  const result = operation.data === 'generate' ? await actions.generateQueuedBoletoNowAction(form) : operation.data === 'cancel' ? await actions.cancelQueuedBoletoAction(form) : operation.data === 'cancel-batch' ? await actions.cancelQueuedBoletosAction(form) : await actions.reconcileReceivedBoletosAction();
  return NextResponse.json(boletoQueueOutcomeSchema.parse(result), { headers });
 } catch { return NextResponse.json({ error: 'Não foi possível confirmar a operação. Confira a fila antes de tentar novamente.' }, { status: 500, headers }); }
}
