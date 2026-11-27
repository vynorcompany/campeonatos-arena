import 'server-only';
import { headers } from 'next/headers';
import { backendOrigin } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { nfeImportInputSchema, nfePreviewInputSchema, nfeOutcomeSchema, nfeErrorSchema, nfeMaxFileBytes, nfeMaxMappingBytes, type NfeOperation } from '@/lib/backend/contracts/nfe-import';
export async function remoteNfeOperation(origin: string, operation: NfeOperation, form: FormData) {
  const files = form.getAll('xml'); const file = files[0];
  if (files.length !== 1 || !(file instanceof File) || !file.size) return { error: 'Selecione um único XML da NF-e.' };
  if (file.size > nfeMaxFileBytes) return { error: 'O XML excede o limite de 5 MB.' };
  const itemFields = form.getAll('items'); if (itemFields.length > 1 || itemFields.some(value => typeof value !== 'string')) return { error: 'A conciliação dos produtos é inválida.' };
  if (typeof itemFields[0] === 'string' && Buffer.byteLength(itemFields[0], 'utf8') > nfeMaxMappingBytes) return { error: 'A conciliação excede o limite permitido.' };
  let items;
  try { const value = itemFields[0]; items = typeof value === 'string' && value.trim() ? JSON.parse(value) : []; } catch { return { error: 'A conciliação dos produtos é inválida.' }; }
  const payload = { file: { name: file.name, type: file.type, data: Buffer.from(await file.arrayBuffer()).toString('base64') }, ...(operation === 'import' ? { items } : {}) };
  const parsed = (operation === 'preview' ? nfePreviewInputSchema : nfeImportInputSchema).safeParse(payload);
  if (!parsed.success) return { error: 'Revise o arquivo e a conciliação dos produtos.' };
  const cookie = await managementCookieHeader(); const originHeader = (await headers()).get('origin');
  // An import can commit before a timeout: never retry it automatically.
  const response = await fetch(new URL(`/api/management/products/nfe/${operation}`, backendOrigin(origin)), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(originHeader ? { origin: originHeader } : {}) }, body: JSON.stringify(parsed.data), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(90000) });
  return response.ok ? nfeOutcomeSchema(operation).parse(await response.json()) : nfeErrorSchema.parse(await response.json());
}
