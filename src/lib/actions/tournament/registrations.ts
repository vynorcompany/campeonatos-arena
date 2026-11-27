"use server";
import {runTournamentRegistrationMutation} from "@/lib/tournament/registration-mutation";
import type {ActionState} from "./shared";
export async function updateTournamentRegistrationPhaseAction(form:FormData){const state=await runTournamentRegistrationMutation("phase",form);if(state.error)throw Error(state.error);}
export async function generateCategoryBracketAction(form:FormData){const state=await runTournamentRegistrationMutation("bracket-generate",form);if(state.error)throw Error(state.error);}
export async function updateCategoryBracketMatchScheduleAction(form:FormData){const state=await runTournamentRegistrationMutation("bracket-schedule",form);if(state.error)throw Error(state.error);}
export async function updateTournamentCategoryFormatAction(form:FormData){const state=await runTournamentRegistrationMutation("category-format",form);if(state.error)throw Error(state.error);}
export async function deleteTournamentRegistrationAction(form:FormData){const state=await runTournamentRegistrationMutation("delete",form);if(state.error)throw Error(state.error);}
export async function createManualTournamentRegistrationAction(_:ActionState,form:FormData):Promise<ActionState>{return runTournamentRegistrationMutation("create",form);}
export async function receiveOnsiteTournamentRegistrationAction(_:ActionState,form:FormData):Promise<ActionState>{return runTournamentRegistrationMutation("receive-onsite",form);}
export async function updateTournamentRegistrationAction(stateOrForm:ActionState|FormData,maybeForm?:FormData):Promise<ActionState>{const form=stateOrForm instanceof FormData?stateOrForm:maybeForm;if(!form)return{error:"Dados invalidos.",success:null};return runTournamentRegistrationMutation("update",form);}
