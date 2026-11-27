import "server-only";
import * as actions from "./tournament-events-actions";
import { tournamentEventOutcomeSchema, type TournamentEventOperation } from "../contracts/tournament-events";
const expected = new Set(["Torneio inválido.", "Dados invalidos para atualizacao do status.", "Torneio nao encontrado.", "Ranking individual inválido para esta arena.", "Tipo de inscrição inválido.", "Informe ao menos uma categoria.", "Valor monetário inválido.", "Torneio nÃ£o encontrado ou jÃ¡ finalizado.", "Torneio não encontrado ou não está finalizado.", "O torneio já foi alterado. Atualize a página e tente novamente.", "Torneio nÃ£o encontrado.", "Esta categoria possui inscrições. Use Remover categoria na listagem e confirme o aviso."]);
const uncertain = "Não foi possível confirmar a alteração. Confira o evento antes de tentar novamente.";
function message(error: unknown) { return error instanceof Error && expected.has(error.message) ? error.message : uncertain; }
class EventRedirect extends Error { constructor(readonly path: string) { super("Event redirect"); } }
export async function executeTournamentEventMutation(operation: TournamentEventOperation, fields: Record<string, string>) {
 const form = new FormData(); for (const [key, value] of Object.entries(fields)) form.set(key, value);
 const outcome: { state: { error: string | null; success: string | null; tournamentId?: string } | null; refresh: boolean; paths: Array<{ path: string; type?: "page" | "layout" }>; redirect: string | null } = { state: null, refresh: false, paths: [], redirect: null };
 const effects: typeof actions.defaultTournamentEventEffects = { refreshTournamentRoutes: () => { outcome.refresh = true; }, revalidatePath: (path, type) => { outcome.paths.push({ path, ...(type ? { type } : {}) }); }, redirect: path => { throw new EventRedirect(path); }, errorMessage: message };
 try {
  const state = operation === "create" ? await actions.createTournamentAction({ error: null, success: null }, form, effects)
   : operation === "update" ? await actions.updateTournamentAction({ error: null, success: null }, form, effects)
   : operation === "remove-category" ? await actions.removeTournamentCategoryAction({ error: null, success: null }, form, effects)
   : await ({ "create-category": actions.createTournamentCategoryAction, finish: actions.finishTournamentAction, reopen: actions.reopenTournamentAction, delete: actions.deleteTournamentAction, status: actions.updateTournamentStatusAction })[operation](form, effects);
  if (state) outcome.state = { error: state.error ?? null, success: "success" in state ? state.success : null, ...("tournamentId" in state ? { tournamentId: state.tournamentId } : {}) };
 } catch (error) { if (error instanceof EventRedirect) outcome.redirect = error.path; else if (error instanceof Error && expected.has(error.message)) outcome.state = { error: message(error), success: null }; else throw error; }
 return tournamentEventOutcomeSchema.parse(outcome);
}
