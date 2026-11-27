import 'server-only';
import { cookies, headers } from 'next/headers';
import { backendOrigin } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { portalAcademyOperations, academyMutationFields, academyMutationInputSchema, academyMutationOutcomeSchema, type AcademyMutationOperation } from '@/lib/backend/contracts/academy-mutations';
export async function remoteAcademyMutation(origin: string, operation: AcademyMutationOperation, form: FormData) {
  const fields: Record<string, string[]> = {};
  for (const name of academyMutationFields[operation]) {
    const values = form.getAll(name);
    if (values.some(value => typeof value !== 'string')) throw new Error('Campo de academia inválido.');
    if (values.length) fields[name] = values as string[];
  }
  const payload = academyMutationInputSchema(operation).parse({ fields });
  const portal = portalAcademyOperations.includes(operation);
  const playerToken = portal ? (await cookies()).get('arena_player_session')?.value : undefined;
  const cookie = portal ? playerToken ? `arena_player_session=${encodeURIComponent(playerToken)}` : undefined : await managementCookieHeader();
  const browserOrigin = (await headers()).get('origin');
  // A timeout may follow a committed enrollment or credit change. Never retry a write.
  const response = await fetch(new URL(`/api/${portal ? 'portal' : 'management'}/academy/actions/${operation}`, backendOrigin(origin)), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { cookie } : {}), ...(browserOrigin ? { origin: browserOrigin } : {}) },
    body: JSON.stringify(payload), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(90_000),
  });
  const result = academyMutationOutcomeSchema.parse(await response.json());
  if (!response.ok) throw new Error('error' in result ? result.error : 'Não foi possível confirmar a alteração de academia. Confira os dados antes de tentar novamente.');
  return result;
}
