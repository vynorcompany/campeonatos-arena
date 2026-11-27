"use server";
import {runCourtSettingsMutation} from "@/lib/court-settings/mutation";
export async function updateOnlineBookingSettingsAction(form:FormData){return runCourtSettingsMutation("online",form);}
export async function createBookingTypeAction(form:FormData){return runCourtSettingsMutation("booking-type",form);}
export async function createCourtWeeklyRuleAction(form:FormData){return runCourtSettingsMutation("rule-create",form);}
export async function updateCourtWeeklyRuleAction(form:FormData){return runCourtSettingsMutation("rule-update",form);}
export async function deleteCourtWeeklyRuleAction(form:FormData){return runCourtSettingsMutation("rule-delete",form);}
export async function copyCourtWeeklyRuleAction(form:FormData){return runCourtSettingsMutation("rule-copy",form);}
export async function updateScheduleSettingsAction(form:FormData){return runCourtSettingsMutation("schedule",form);}
export async function createCourtAction(form:FormData){return runCourtSettingsMutation("court-create",form);}
export async function updateCourtSettingsAction(form:FormData){return runCourtSettingsMutation("court-update",form);}
export async function moveCourtAction(form:FormData){return runCourtSettingsMutation("court-move",form);}
export async function copyCourtConfigurationAction(form:FormData){return runCourtSettingsMutation("court-copy",form);}
