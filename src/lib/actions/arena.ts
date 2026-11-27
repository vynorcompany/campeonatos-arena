"use server";
import {runConfigurationMutation} from "@/lib/arena-configuration/mutation";
import type {ActionState} from "@/lib/actions/tournament";
export async function updateArenaProfileAction(_:ActionState,form:FormData):Promise<ActionState>{return runConfigurationMutation('profile',form);}
export async function updateAthletePortalSettingsAction(form:FormData){return runConfigurationMutation('portal-settings',form);}
