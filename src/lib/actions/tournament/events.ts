"use server";
import type { ActionState } from "./shared";
import { runTournamentEventMutation } from "@/lib/tournament/event-mutation";
export async function createTournamentAction(_: ActionState, form: FormData): Promise<ActionState> { return runTournamentEventMutation("create", form); }
export async function updateTournamentAction(_: ActionState, form: FormData): Promise<ActionState> { return runTournamentEventMutation("update", form); }
export async function removeTournamentCategoryAction(_: ActionState, form: FormData): Promise<ActionState> { return runTournamentEventMutation("remove-category", form); }
export async function createTournamentCategoryAction(form: FormData) { return runTournamentEventMutation("create-category", form); }
export async function finishTournamentAction(form: FormData) { return runTournamentEventMutation("finish", form); }
export async function reopenTournamentAction(form: FormData) { return runTournamentEventMutation("reopen", form); }
export async function deleteTournamentAction(form: FormData) { return runTournamentEventMutation("delete", form); }
export async function updateTournamentStatusAction(form: FormData) { return runTournamentEventMutation("status", form); }
