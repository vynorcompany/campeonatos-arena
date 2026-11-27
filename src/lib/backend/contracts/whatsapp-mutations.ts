import { z } from "zod";
export const whatsAppMutationFields = {
 "open-player": ["playerId"], "sync-contacts": [], "open-contact": ["accountJid", "remoteJid", "name"], react: ["messageId", "emoji"],
 "send-text": ["conversationId", "body", "replyToId"], "send-audio": ["conversationId", "audio", "replyToId"], "send-media": ["conversationId", "file", "caption", "replyToId"],
 read: ["conversationId"], "link-client": ["conversationId", "playerId"], sla: ["minutes"], conversation: ["conversationId", "action", "listName"],
 "create-contact": ["name", "phone"], "profile-photo": ["conversationId"], "group-name": ["conversationId"],
} as const;
export type WhatsAppMutationOperation = keyof typeof whatsAppMutationFields;
export { whatsAppUncertainMessage } from "@/lib/whatsapp-send-feedback";
export function projectWhatsAppMutation(operation: WhatsAppMutationOperation, form: FormData, strict = false) {
 const result = new FormData(), allowed: readonly string[] = whatsAppMutationFields[operation];
 if (strict) for (const key of form.keys()) if (!allowed.includes(key)) throw Error("Campo inesperado.");
 for (const key of allowed) {
  const values = form.getAll(key); if (values.length > 1) throw Error("Campo repetido.");
  if (!values.length) continue; const value = values[0];
  const fileField = operation === "send-audio" && key === "audio" || operation === "send-media" && key === "file";
  if (fileField ? typeof value === "string" || value.size > 16 * 1024 * 1024 : typeof value !== "string" || value.length > 65536) throw Error("Campo inválido.");
  result.set(key, value);
 }
 return result;
}
const reaction = z.object({ actorJid: z.string(), emoji: z.string() }).strict();
const sentMessage = z.object({ id: z.string(), direction: z.string(), body: z.string(), senderName: z.string(), quotedProviderId: z.string(), quotedBody: z.string(), quotedAuthor: z.string(), reactions: z.array(reaction), mediaType: z.string(), mediaMimeType: z.string(), mediaFileName: z.string(), mediaUrl: z.literal(""), sentAt: z.iso.datetime() }).strict();
const sent = z.union([sentMessage, z.object({ acceptedButUnsynced: z.literal(true) }).strict()]);
const conversationId = z.object({ id: z.string().min(1) }).strict();
export const whatsAppMutationResults = {
 "open-player": z.union([conversationId, z.object({error:z.string(),needsConnection:z.boolean()}).strict()]),
 "sync-contacts": z.object({ contacts: z.array(z.object({remoteJid:z.string(),name:z.string(),phone:z.string()}).strict()), truncated:z.boolean(),eventsEnabled:z.boolean(),updated:z.number().int().nonnegative(),accountJid:z.string() }).strict(),
 "open-contact": conversationId, react:z.object({messageId:z.string(),reactions:z.array(reaction)}).strict(),
 "send-text":sent,"send-audio":sent,"send-media":sent,read:z.null(),"link-client":z.null(),sla:z.null(),conversation:z.null(),
 "create-contact":z.object({id:z.string(),name:z.string()}).strict(),"profile-photo":z.object({profilePhotoUrl:z.string()}).strict(),"group-name":z.object({name:z.string()}).strict(),
} as const;
export type WhatsAppMutationResult<T extends WhatsAppMutationOperation> = z.output<(typeof whatsAppMutationResults)[T]>;
export const whatsAppMutationPathsSchema = z.array(z.object({path:z.enum(["/whatsapp","/"]),type:z.enum(["page","layout"]).optional()}).strict()).max(2);
export function whatsAppMutationOutcomeSchema<T extends WhatsAppMutationOperation>(operation:T) {
 return z.object({result:whatsAppMutationResults[operation].nullable(),error:z.string().nullable(),paths:whatsAppMutationPathsSchema}).strict().superRefine((data,ctx)=>{
  const empty=["read","link-client","sla","conversation"].includes(operation);
  if(data.error===null && data.result===null && !empty || data.error!==null && data.result!==null) ctx.addIssue({code:"custom",message:"Resultado inconsistente."});
 });
}

export type WhatsAppActionReply<T> = { ok: true; value: T } | { ok: false; error: string };
