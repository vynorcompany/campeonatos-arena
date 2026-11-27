"use server";
import {runUpcomingMutation} from "@/lib/tv/mutation";
export async function createManualUpcomingMatchAction(form:FormData){const result=await runUpcomingMutation("manual-create",form);if(result.error)throw new Error(result.error);}
export async function updateManualUpcomingMatchAction(form:FormData){const result=await runUpcomingMutation("manual-update",form);if(result.error)throw new Error(result.error);}
export async function deleteManualUpcomingMatchAction(form:FormData){const result=await runUpcomingMutation("manual-delete",form);if(result.error)throw new Error(result.error);}
export async function upsertTvPresentationSettingsAction(form:FormData){const result=await runUpcomingMutation("settings",form);if(result.error)throw new Error(result.error);}
export async function createTvSponsorAction(form:FormData){const result=await runUpcomingMutation("sponsor-create",form);if(result.error)throw new Error(result.error);}
export async function createSponsorshipPlanAction(form:FormData){const result=await runUpcomingMutation("plan-create",form);if(result.error)throw new Error(result.error);}
export async function insertSponsorInPlanAction(form:FormData){const result=await runUpcomingMutation("plan-insert-sponsor",form);if(result.error)throw new Error(result.error);}
export async function deleteSponsorshipPlanAction(form:FormData){const result=await runUpcomingMutation("plan-delete",form);return result.error?{error:result.error}:undefined;}
export async function updateTvSponsorAction(form:FormData){const result=await runUpcomingMutation("sponsor-update",form);if(result.error)throw new Error(result.error);}
export async function deleteTvSponsorAction(form:FormData){const result=await runUpcomingMutation("sponsor-delete",form);if(result.error)throw new Error(result.error);}
