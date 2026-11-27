import 'server-only';
import { revalidatePath } from 'next/cache';
import { remoteClientMutation } from '@/lib/backend/client-mutations-client';
import { refreshTournamentRoutes } from '@/lib/tournament/revalidation';
import type { ClientMutationOperation } from '@/lib/backend/contracts/client-mutations';
export async function runClientMutation(operation: ClientMutationOperation, form = new FormData()) {
  const result = process.env.VX4_BACKEND_ORIGIN
    ? await remoteClientMutation(process.env.VX4_BACKEND_ORIGIN, operation, form)
    : await (await import('@/lib/backend/services/client-mutations')).executeClientMutation(operation, form);
  if (!result.error) {
    if (operation.startsWith('loyalty-')) { revalidatePath('/jogadores'); }
    else if (['dependent', 'balance', 'merge', 'archive-many', 'import'].includes(operation)) {
      revalidatePath('/jogadores'); revalidatePath('/agenda'); revalidatePath('/aulas');
    } else {
      refreshTournamentRoutes();
      if (operation === 'create') { revalidatePath('/aulas'); revalidatePath('/financeiro'); }
    }
  }
  return result;
}
