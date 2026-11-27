"use server";
import { runTournamentPlayMutation } from "@/lib/tournament/play-mutation";
import type { ActionState } from "./shared";
export async function updateTournamentEntryPointsAction(form:FormData){const state=await runTournamentPlayMutation("entry-points",form);if(state.error)throw Error(state.error);}
export async function syncEntriesAction(form:FormData){const state=await runTournamentPlayMutation("entries",form);if(state.error)throw Error(state.error);}
export async function syncEntriesStateAction(_:ActionState,form:FormData):Promise<ActionState>{return runTournamentPlayMutation("entries",form);}
export async function generatePairsAction(form:FormData){const state=await runTournamentPlayMutation("pairs-generate",form);if(state.error)throw Error(state.error);}
export async function createTournamentPairAction(_:ActionState,form:FormData):Promise<ActionState>{return runTournamentPlayMutation("pair-create",form);}
export async function updateTournamentPairAction(form:FormData){const state=await runTournamentPlayMutation("pair-update",form);if(state.error)throw Error(state.error);}
export async function deleteTournamentPairAction(form:FormData){const state=await runTournamentPlayMutation("pair-delete",form);if(state.error)throw Error(state.error);}
export async function updateTournamentPairPointsAction(form:FormData){const state=await runTournamentPlayMutation("pair-points",form);if(state.error)throw Error(state.error);}
export async function moveTournamentPairGroupAction(form:FormData){const state=await runTournamentPlayMutation("pair-group",form);if(state.error)throw Error(state.error);}
export async function generateGroupsAction(form:FormData){const state=await runTournamentPlayMutation("groups-generate",form);if(state.error)throw Error(state.error);}
export async function generateMatchesAction(form:FormData){const state=await runTournamentPlayMutation("matches-generate",form);if(state.error)throw Error(state.error);}
