"use server";
import {runConfigurationMutation} from "@/lib/arena-configuration/mutation";
export async function createPortalAnnouncementAction(form:FormData){return runConfigurationMutation('announcement-create',form);}
export async function togglePortalAnnouncementAction(form:FormData){return runConfigurationMutation('announcement-toggle',form);}
export async function togglePortalAnnouncementPinAction(form:FormData){return runConfigurationMutation('announcement-pin',form);}
export async function deletePortalAnnouncementAction(form:FormData){return runConfigurationMutation('announcement-delete',form);}
export async function togglePortalEventFeatureAction(form:FormData){return runConfigurationMutation('calendar-feature',form);}
export async function createPortalEventPostAction(form:FormData){return runConfigurationMutation('post-create',form);}
export async function updatePortalEventPostAction(form:FormData){return runConfigurationMutation('post-update',form);}
export async function togglePortalEventPostAction(form:FormData){return runConfigurationMutation('post-toggle',form);}
export async function togglePortalEventPostPinAction(form:FormData){return runConfigurationMutation('post-pin',form);}
export async function deletePortalEventPostAction(form:FormData){return runConfigurationMutation('post-delete',form);}
export async function replacePortalEventPostImageAction(form:FormData){return runConfigurationMutation('post-image',form);}
