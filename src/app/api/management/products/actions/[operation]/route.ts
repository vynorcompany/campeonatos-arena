import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canEditModule } from '@/lib/permissions';
import { productMutationFields, productMutationModules, productMutationInputSchema, type ProductMutationOperation } from '@/lib/backend/contracts/product-mutations';
import { executeProductMutation } from '@/lib/backend/services/product-mutations';
import { FinanceOperationError } from '@/lib/finance/action-error';
import { ProductOperationError } from '@/lib/backend/product-operation-error';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  const raw = (await context.params).operation;
  if (!Object.hasOwn(productMutationFields, raw)) return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
  const operation = raw as ProductMutationOperation; const auth = await requireArenaAccess();
  if (!canEditModule(productMutationModules[operation], auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: 'Você não tem permissão para executar esta operação.' }, { status: 403, headers });
  let input; try { input = productMutationInputSchema(operation).parse(await readBoundedJson(request, 768 * 1024)); } catch (error) { return NextResponse.json({ error: 'Dados inválidos.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const form = new FormData(); for (const [key, value] of Object.entries(input.fields)) form.set(key, value);
  try { return NextResponse.json(await executeProductMutation(operation, form), { headers }); } catch (error) { return NextResponse.json({ error: error instanceof ProductOperationError || error instanceof FinanceOperationError ? error.message : 'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.' }, { status: error instanceof FinanceOperationError ? error.status : error instanceof ProductOperationError ? 400 : 500, headers }); }
}
