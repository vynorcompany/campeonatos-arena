import { z } from 'zod';
export const stockWorkspaceSchema = z.enum(['new-product', 'balance', 'balance-detail']);
export type StockWorkspace = z.infer<typeof stockWorkspaceSchema>;
export const stockSnapshotSchema = z.object({ title: z.string(), reason: z.string(), items: z.array(z.object({ productId: z.string(), name: z.string(), sku: z.string(), systemQuantity: z.number().int(), countedQuantity: z.number().int(), difference: z.number().int() })) });
export const stockWorkspaceQuerySchema = z.object({ creating: z.enum(['0','1']).optional(), history: z.enum(['0','1']).optional(), id: z.string().min(1).max(100).optional() }).strict();
export const stockWorkspaceDataSchema = z.object({
  categories: z.array(z.object({ id: z.string(), name: z.string() }).strict()),
  products: z.array(z.object({ id: z.string(), name: z.string(), sku: z.string(), stockQuantity: z.number().int(), minStock: z.number().int() }).strict()),
  movements: z.array(z.object({ id: z.string(), productName: z.string(), reason: z.string(), createdAt: z.iso.datetime() }).strict()),
  balances: z.array(z.object({ id: z.string(), title: z.string(), actorName: z.string(), createdAt: z.iso.datetime() }).strict()),
  snapshot: stockSnapshotSchema.nullable(),
}).strict();
export type StockWorkspaceQuery = z.infer<typeof stockWorkspaceQuerySchema>;
