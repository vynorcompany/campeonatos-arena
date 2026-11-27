import { z } from 'zod';
export const regulationCreateInputSchema=z.object({content:z.string().max(20000)}).strict();
export const regulationAcceptInputSchema=z.object({regulationDocumentId:z.string().max(200),accepted:z.string().max(32).optional()}).strict();
export const regulationOutcomeSchema=z.object({error:z.string().nullable(),success:z.string().nullable(),publicUrl:z.url().refine(value=>{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;}).optional(),publicSlug:z.string().max(200).optional()}).strict();
export type RegulationActionState=z.infer<typeof regulationOutcomeSchema>;
export const regulationHistoryDataSchema=z.object({documents:z.array(z.object({id:z.string(),content:z.string(),publicSlug:z.string(),createdAt:z.iso.datetime(),createdBy:z.object({name:z.string(),email:z.string()}).strict().nullable(),_count:z.object({acceptances:z.number().int().min(0)}).strict()}).strict()).max(10)}).strict();
export const regulationPublicDataSchema=z.object({id:z.string(),content:z.string(),arena:z.object({name:z.string(),logoUrl:z.string()}).strict()}).strict().nullable();
