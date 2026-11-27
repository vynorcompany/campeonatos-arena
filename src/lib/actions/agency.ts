"use server";
import {runAgencyMutation} from "@/lib/agency/mutation";
export async function connectArenaWhatsAppAction(form:FormData){return runAgencyMutation("whatsapp-connect",form);}
export async function refreshArenaWhatsAppConnectionStatusAction(form:FormData){return runAgencyMutation("whatsapp-status",form);}
export async function resetArenaWhatsAppSessionAction(form:FormData){return runAgencyMutation("whatsapp-reset",form);}
export async function refreshArenaWhatsAppQrAction(form:FormData){return runAgencyMutation("whatsapp-qr",form);}
export async function updateUserSystemRoleAction(form:FormData){return runAgencyMutation("system-role",form);}
export async function updateAgencyArenaAction(form:FormData){return runAgencyMutation("arena-update",form);}
export async function updateAgencyArenaStatusAction(form:FormData){return runAgencyMutation("arena-status",form);}
export async function deleteAgencyArenaAction(form:FormData){return runAgencyMutation("arena-archive",form);}
