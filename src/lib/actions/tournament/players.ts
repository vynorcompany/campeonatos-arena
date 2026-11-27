"use server";
import { runClientMutation } from '@/lib/clients/mutation';
import type { ActionState } from '@/lib/actions/tournament/shared';
export async function createPlayerAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const result = await runClientMutation('create', form);
    return { error: result.error, success: result.success ?? null };
  } catch { return { error: 'Não foi possível confirmar o cadastro. Confira a listagem antes de tentar novamente.', success: null }; }
}
export async function updatePlayerAction(form: FormData) { return runClientMutation('update', form); }
export async function archivePlayerAction(form: FormData) { await runClientMutation('archive', form); }
export async function reactivatePlayerAction(form: FormData) { await runClientMutation('reactivate', form); }
export async function deleteAthleteAction(form: FormData) { await runClientMutation('delete', form); }
export async function updatePlayerPointsAction(form: FormData) { await runClientMutation('points', form); }
export async function resetPlayerRankingAction() { await runClientMutation('reset-ranking'); }
