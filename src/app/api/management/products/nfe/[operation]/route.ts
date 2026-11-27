import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canEditModule } from '@/lib/permissions';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import { nfeImportInputSchema, nfePreviewInputSchema, nfeMaxFileBytes } from '@/lib/backend/contracts/nfe-import';
import { executeNfeOperation } from '@/lib/backend/services/nfe-mutations';
import { ProductOperationError } from '@/lib/backend/product-operation-error';
import { NfeXmlValidationError } from '@/lib/fiscal/nfe-error';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  const operation = (await context.params).operation;
  if (operation !== 'preview' && operation !== 'import') return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
  const auth = await requireArenaAccess();
  if (!canEditModule('stock', auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: 'Sem permissão para importar NF-e.' }, { status: 403, headers });
  let input;
  try { input = (operation === 'preview' ? nfePreviewInputSchema : nfeImportInputSchema).parse(await readBoundedJson(request, 10 * 1024 * 1024)); } catch (error) { return NextResponse.json({ error: 'Arquivo ou conciliação inválidos.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const bytes = Buffer.from(input.file.data, 'base64');
  if (!bytes.length || bytes.length > nfeMaxFileBytes || bytes.toString('base64') !== input.file.data) return NextResponse.json({ error: 'O XML deve ter até 5 MB e uma codificação válida.' }, { status: 400, headers });
  const form = new FormData(); form.set('xml', new File([bytes], input.file.name, { type: input.file.type }));
  if ('items' in input) form.set('items', JSON.stringify(input.items));
  try { return NextResponse.json(await executeNfeOperation(operation, form), { headers }); } catch (error) { const known = error instanceof ProductOperationError || error instanceof NfeXmlValidationError; return NextResponse.json({ error: known ? error.message : 'Não foi possível confirmar a importação. Confira o estoque antes de tentar novamente.' }, { status: known ? 400 : 500, headers }); }
}
