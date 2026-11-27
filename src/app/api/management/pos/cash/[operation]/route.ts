import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canPerformPermission } from '@/lib/permissions';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import { cashMutationFields, cashMutationInputSchema, type CashMutation } from '@/lib/backend/contracts/cash-register';
import { executeCashMutation } from '@/lib/backend/services/cash-mutations';
import { FinanceOperationError } from '@/lib/finance/action-error';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  const raw = (await context.params).operation;
  if (!Object.hasOwn(cashMutationFields, raw)) return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
  const operation = raw as CashMutation; const auth = await requireArenaAccess();
  if (!canPerformPermission('pos:command:finish', auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: 'Sem permissão para executar esta ação.' }, { status: 403, headers });
  let input; try { input = cashMutationInputSchema(operation).parse(await readBoundedJson(request, 16 * 1024)); } catch (error) { return NextResponse.json({ error: 'Dados inválidos.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const form = new FormData(); for (const [key, value] of Object.entries(input.fields)) form.set(key, value);
  try { return NextResponse.json(await executeCashMutation(operation, form), { headers }); } catch (error) { return NextResponse.json({ error: error instanceof FinanceOperationError ? error.message : 'Não foi possível confirmar a operação. Confira o caixa antes de tentar novamente.' }, { status: error instanceof FinanceOperationError ? error.status : 500, headers }); }
}
