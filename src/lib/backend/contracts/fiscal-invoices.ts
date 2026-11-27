import { z } from 'zod';
import { focusBaseUrl } from '@/lib/fiscal/focus-document-url';
export const fiscalInvoicesQuerySchema = z.object({ documentId: z.string().max(200).optional() }).strict();
export const fiscalInvoicesDataSchema = z.object({ documents: z.array(z.object({ id: z.string(), number: z.string(), series: z.string(), supplierName: z.string(), issuedAt: z.iso.datetime().nullable(), totalCents: z.number().int(), documentType: z.string(), direction: z.string(), provider: z.string(), status: z.string(), environment: z.string(), providerMessage: z.string(), hasXml: z.boolean(), hasPrint: z.boolean(), _count: z.object({ items: z.number().int().min(0) }).strict() }).strict()).max(30) }).strict();
export const fiscalFileKindSchema = z.enum(['xml','print']);
export type FiscalFileKind = z.infer<typeof fiscalFileKindSchema>;
export const fiscalFileTargetSchema = z.object({ url: z.url().refine(value => { const url = new URL(value); return !url.username && !url.password && [focusBaseUrl('PRODUCTION'),focusBaseUrl('SANDBOX')].includes(url.origin); }) }).strict().nullable();
export const fiscalConsultInputSchema = z.object({ fields: z.object({ documentId: z.string().max(200), cancelReason: z.string().max(4096).optional() }).strict() }).strict();
export const fiscalConsultOutcomeSchema = z.union([z.object({}).strict(),z.object({ error: z.string() }).strict()]);
