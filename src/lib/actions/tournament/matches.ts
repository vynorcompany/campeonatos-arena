"use server";
import { runTournamentPlayMutation } from "@/lib/tournament/play-mutation";
export async function updateMatchCourtAction(form:FormData){const state=await runTournamentPlayMutation("match-court",form);if(state.error)throw Error(state.error);}
export async function updateMatchScheduleAction(form:FormData){const state=await runTournamentPlayMutation("match-schedule",form);if(state.error)throw Error(state.error);}
export async function updateMatchResultAction(form:FormData){const state=await runTournamentPlayMutation("match-result",form);if(state.error)throw Error(state.error);}
export async function updateMatchParticipantsAction(form:FormData){const state=await runTournamentPlayMutation("match-participants",form);if(state.error)throw Error(state.error);}
export async function updateMatchManualStatusAction(form:FormData){const state=await runTournamentPlayMutation("match-status",form);if(state.error)throw Error(state.error);}
export async function updateMatchTvVisibilityAction(form:FormData){const state=await runTournamentPlayMutation("match-tv",form);if(state.error)throw Error(state.error);}
