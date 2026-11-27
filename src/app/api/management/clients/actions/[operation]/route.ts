import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canEditModule, canPerformPermission } from '@/lib/permissions';
import { clientMutationOperations, clientMutationInputSchema, clientMutationOutcomeSchema, clientMutationBodyLimit, clientPhotoMaxBytes, clientCsvMaxBytes, type ClientMutationOperation } from '@/lib/backend/contracts/client-mutations';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import { executeClientMutation } from '@/lib/backend/services/client-mutations';
import { ClientOperationError } from '@/lib/backend/client-operation-error';
export const dynamic = 'force-dynamic';
const permission = { balance: 'players:balance', merge: 'players:merge', 'archive-many': 'players:edit', import: 'players:import' } as const;
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  const { operation: rawOperation } = await context.params;
  if (!(clientMutationOperations as readonly string[]).includes(rawOperation)) return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
  const operation = rawOperation as ClientMutationOperation;
  const auth = await requireArenaAccess();
  const specific = permission[operation as keyof typeof permission];
  if (!(specific ? canPerformPermission(specific, auth.arenaRole, auth.systemRole, auth.editPermissions) : canEditModule('players', auth.arenaRole, auth.systemRole, auth.editPermissions))) return NextResponse.json({ error: 'Sem permissão para alterar clientes.' }, { status: 403, headers });
  let input;
  try { input = clientMutationInputSchema(operation).parse(await readBoundedJson(request, clientMutationBodyLimit(operation))); }
  catch (error) { return NextResponse.json({ error: 'Dados inválidos ou arquivo acima do limite.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const form = new FormData();
  for (const [name, values] of Object.entries(input.fields)) for (const value of values) form.append(name, value);
  if (input.file) {
    const bytes = Buffer.from(input.file.base64, 'base64');
    if (bytes.toString('base64') !== input.file.base64 || bytes.length > (operation === 'import' ? clientCsvMaxBytes : clientPhotoMaxBytes)) return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400, headers });
    form.set(operation === 'import' ? 'file' : 'photo', new File([bytes], input.file.name, { type: input.file.type }));
  }
  try { return NextResponse.json(clientMutationOutcomeSchema.parse(await executeClientMutation(operation, form)), { headers }); }
  catch (error) { return NextResponse.json({ error: error instanceof ClientOperationError ? error.message : 'Não foi possível concluir a alteração.' }, { status: error instanceof ClientOperationError ? 400 : 500, headers }); }
}
