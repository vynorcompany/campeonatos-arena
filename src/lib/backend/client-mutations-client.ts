import 'server-only';
import { headers } from 'next/headers';
import { backendOrigin } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { clientMutationFields, clientMutationInputSchema, clientMutationOutcomeSchema, clientPhotoMaxBytes, clientCsvMaxBytes, type ClientMutationOperation } from '@/lib/backend/contracts/client-mutations';
export async function remoteClientMutation(origin: string, operation: ClientMutationOperation, form: FormData) {
  const fields: Record<string, string[]> = {};
  for (const name of clientMutationFields[operation]) {
    const values = form.getAll(name);
    if (values.some(value => typeof value !== 'string')) throw new Error('Campo inválido.');
    if (values.length) fields[name] = values as string[];
  }
  const file = form.get(operation === 'import' ? 'file' : 'photo');
  let encodedFile;
  if (file instanceof File && file.size) {
    if (!['create', 'update', 'import'].includes(operation)) throw new Error('Arquivo inesperado.');
    const maximum = operation === 'import' ? clientCsvMaxBytes : clientPhotoMaxBytes;
    if (file.size > maximum) throw new Error(operation === 'import' ? 'O CSV deve ter no máximo 16 MB.' : 'A foto deve ter no máximo 4 MB.');
    encodedFile = { name: file.name, type: file.type, base64: Buffer.from(await file.arrayBuffer()).toString('base64') };
  }
  const payload = clientMutationInputSchema(operation).parse({ fields, ...(encodedFile ? { file: encodedFile } : {}) });
  const cookie = await managementCookieHeader();
  const browserOrigin = (await headers()).get('origin');
  // Never retry mutations automatically: a timeout may occur after a committed write.
  const response = await fetch(new URL(`/api/management/clients/actions/${operation}`, backendOrigin(origin)), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(browserOrigin ? { origin: browserOrigin } : {}) },
    body: JSON.stringify(payload), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(90_000),
  });
  const result = clientMutationOutcomeSchema.parse(await response.json());
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a alteração.');
  return result;
}
