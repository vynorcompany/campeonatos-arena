"use server";
import { runClientMutation } from '@/lib/clients/mutation';
export async function adjustClientBalanceAction(form: FormData) { await runClientMutation('balance', form); }
export async function mergeClientsAction(form: FormData) {
  const result = await runClientMutation('merge', form);
  return result.error ? { error: result.error } : { success: true as const };
}
export async function archiveClientsAction(form: FormData) { await runClientMutation('archive-many', form); }
export async function importClientsAction(form: FormData) {
  const result = await runClientMutation('import', form);
  if (result.imported === undefined) throw new Error(result.error || 'Não foi possível importar os clientes.');
  return { imported: result.imported };
}
