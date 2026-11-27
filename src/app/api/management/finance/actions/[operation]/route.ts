import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canDeleteFinancialEntries, canPerformPermission } from '@/lib/permissions';
import { financialMutationOperations, financialMutationInputSchema, type FinancialMutationOperation } from '@/lib/backend/contracts/financial-mutations';
import { executeFinancialMutation } from '@/lib/backend/services/financial-mutations';
import { FinanceOperationError } from '@/lib/finance/action-error';
import { StaleRecordError } from '@/lib/record-version';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  const { operation: raw } = await context.params;
  if (!(financialMutationOperations as readonly string[]).includes(raw)) return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
  const operation = raw as FinancialMutationOperation;
  const auth = await requireArenaAccess();
  const may = (key: string) => canPerformPermission(key, auth.arenaRole, auth.systemRole, auth.editPermissions);
  const capability = ['create', 'recurrence'].includes(operation) ? 'create' : ['settle', 'settle-bulk', 'charge'].includes(operation) ? 'settle' : 'edit';
  const permitted = operation === 'academy-create-plan' ? may('finance:settings:manage')
    : operation === 'academy-create-subscription' ? may('finance:receivable:create')
    : operation === 'academy-record-plan-payment' ? may('finance:receivable:settle')
    : operation === 'payroll-create-teacher-monthly-payable' ? may('teachers:payable') || may('finance:payable:create')
    : operation === 'payroll-upsert-payroll-entry' ? may('finance:payable:create') || may('finance:payable:edit')
    : operation.startsWith('settings-') ? may('finance:settings:manage') : operation.startsWith('delete') ? canDeleteFinancialEntries(auth.arenaRole, auth.systemRole, auth.editPermissions)
    : operation === 'charge' ? may('finance:receivable:settle') : may(`finance:receivable:${capability}`) || may(`finance:payable:${capability}`);
  if (!permitted) return NextResponse.json({ error: 'Sem permissão para executar esta ação financeira.' }, { status: 403, headers });
  let input;
  try { input = financialMutationInputSchema(operation).parse(await readBoundedJson(request, 768 * 1024)); }
  catch (error) { return NextResponse.json({ error: 'Dados financeiros inválidos.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const form = new FormData();
  for (const [name, values] of Object.entries(input.fields)) for (const value of values) form.append(name, value);
  // Services check the actual entry type inside their transaction, including
  // every type in a mixed bulk operation. This gate is only the early denial.
  try { return NextResponse.json(await executeFinancialMutation(operation, form), { headers }); }
  catch (error) {
    const domain = error instanceof FinanceOperationError || error instanceof StaleRecordError;
    return NextResponse.json({ error: domain ? error.message : 'Não foi possível confirmar a alteração financeira. Confira os lançamentos antes de tentar novamente.' }, { status: error instanceof FinanceOperationError ? error.status : error instanceof StaleRecordError ? 409 : 500, headers });
  }
}
