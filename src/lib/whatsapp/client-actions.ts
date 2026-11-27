"use client";
import * as actions from "@/lib/actions/whatsapp-chat";
import type { WhatsAppActionReply } from "@/lib/backend/contracts/whatsapp-mutations";
import { whatsAppUncertainMessage } from "@/lib/whatsapp-send-feedback";
async function invoke<T>(request:Promise<WhatsAppActionReply<T>>):Promise<T> {
 let reply;try{reply=await request;}catch{throw Error(whatsAppUncertainMessage);}
 if(!reply || typeof reply!=="object" || !("ok" in reply))throw Error(whatsAppUncertainMessage);
 if(!reply.ok)throw Error(reply.error);return reply.value;
}
export async function syncWhatsAppContactsAction() {return invoke(actions.syncWhatsAppContactsAction());}
export async function openWhatsAppContactConversationAction(form:FormData) {return invoke(actions.openWhatsAppContactConversationAction(form));}
export async function reactToWhatsAppMessageAction(form:FormData) {return invoke(actions.reactToWhatsAppMessageAction(form));}
export async function sendWhatsAppChatMessageAction(form:FormData) {return invoke(actions.sendWhatsAppChatMessageAction(form));}
export async function sendWhatsAppAudioMessageAction(form:FormData) {return invoke(actions.sendWhatsAppAudioMessageAction(form));}
export async function sendWhatsAppMediaMessageAction(form:FormData) {return invoke(actions.sendWhatsAppMediaMessageAction(form));}
export async function markWhatsAppConversationReadAction(form:FormData) {return invoke(actions.markWhatsAppConversationReadAction(form));}
export async function linkWhatsAppConversationToClientAction(form:FormData) {return invoke(actions.linkWhatsAppConversationToClientAction(form));}
export async function updateWhatsAppSlaAction(form:FormData) {return invoke(actions.updateWhatsAppSlaAction(form));}
export async function updateWhatsAppConversationAction(form:FormData) {return invoke(actions.updateWhatsAppConversationAction(form));}
export async function createWhatsAppContactAction(form:FormData) {return invoke(actions.createWhatsAppContactAction(form));}
export async function refreshWhatsAppConversationProfilePhotoAction(form:FormData) {return invoke(actions.refreshWhatsAppConversationProfilePhotoAction(form));}
export async function refreshWhatsAppGroupNameAction(form:FormData) {return invoke(actions.refreshWhatsAppGroupNameAction(form));}
