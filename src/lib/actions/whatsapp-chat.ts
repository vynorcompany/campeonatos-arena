"use server";
import { runWhatsAppMutation, runWhatsAppAction } from "@/lib/whatsapp/mutation";
export async function openWhatsAppPlayerConversationAction(form: FormData) { try { return await runWhatsAppMutation("open-player", form); } catch { return { error: "Não foi possível abrir a conversa. Atualize a página e tente novamente.", needsConnection: false }; } }
export async function syncWhatsAppContactsAction() { return runWhatsAppAction("sync-contacts", new FormData()); }
export async function openWhatsAppContactConversationAction(form: FormData) { return runWhatsAppAction("open-contact", form); }
export async function reactToWhatsAppMessageAction(form: FormData) { return runWhatsAppAction("react", form); }
export async function sendWhatsAppChatMessageAction(form: FormData) { return runWhatsAppAction("send-text", form); }
export async function sendWhatsAppAudioMessageAction(form: FormData) { return runWhatsAppAction("send-audio", form); }
export async function sendWhatsAppMediaMessageAction(form: FormData) { return runWhatsAppAction("send-media", form); }
export async function markWhatsAppConversationReadAction(form: FormData) { return runWhatsAppAction("read", form); }
export async function linkWhatsAppConversationToClientAction(form: FormData) { return runWhatsAppAction("link-client", form); }
export async function updateWhatsAppSlaAction(form: FormData) { return runWhatsAppAction("sla", form); }
export async function updateWhatsAppConversationAction(form: FormData) { return runWhatsAppAction("conversation", form); }
export async function createWhatsAppContactAction(form: FormData) { return runWhatsAppAction("create-contact", form); }
export async function refreshWhatsAppConversationProfilePhotoAction(form: FormData) { return runWhatsAppAction("profile-photo", form); }
export async function refreshWhatsAppGroupNameAction(form: FormData) { return runWhatsAppAction("group-name", form); }
