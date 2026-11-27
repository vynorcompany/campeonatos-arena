import { z } from "zod";
export const assistantCommandInputSchema = z.object({input:z.string().max(2000).refine(value=>value.trim().length>0)}).strict();
export const assistantReplySchema = z.object({ok:z.boolean(),message:z.string(),createdAt:z.iso.datetime()}).strict();
export type AssistantReply = z.infer<typeof assistantReplySchema>;
export const assistantOutcomeSchema = assistantReplySchema.extend({refreshFinance:z.boolean().optional()}).strict();
export const assistantFailureSchema = z.object({error:z.string()}).strict();
export const assistantHistorySchema = z.object({messages:z.array(z.object({id:z.string(),role:z.string(),content:z.string(),createdAt:z.iso.datetime()}).strict()).max(80)}).strict();
