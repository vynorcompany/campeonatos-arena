import { z } from 'zod';
const option = z.object({ id: z.string(), name: z.string() }).strict();
export const clientDirectoryQuerySchema = z.object({
  q: z.string().max(256).optional(), phone: z.string().max(64).optional(), financial: z.string().max(20).optional(),
  planId: z.string().max(256).optional(), active: z.string().max(20).optional(), teacherId: z.string().max(256).optional(),
}).strict();
export type ClientDirectoryQuery = z.infer<typeof clientDirectoryQuerySchema>;
const client = z.object({
  guardianId: z.string().nullable(), guardianName: z.string(), dependents: z.array(option), personType: z.string(), cnpj: z.string(), allowOverdueComandas: z.boolean(),
  id: z.string(), name: z.string(), photoUrl: z.string(), phone: z.string(), email: z.string(), cpf: z.string(),
  addressZipCode: z.string(), addressStreet: z.string(), addressNumber: z.string(), addressNeighborhood: z.string(), addressCity: z.string(), addressState: z.string(),
  birthDate: z.string(), gender: z.string(), class: z.string(), isTeacher: z.boolean(), points: z.number().int(), leagueTier: z.string(), active: z.boolean(),
  financialStatus: z.enum(['Saudável', 'Com débitos em aberto', 'Em atraso']), moneyBalanceCents: z.number().int(), classBalance: z.number().int(),
  plans: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), startedAt: z.string().datetime(), endedAt: z.string().datetime().nullable(), classesPerMonth: z.number().int(), dueDay: z.number().int() }).strict()),
  balanceMovements: z.array(z.object({ id: z.string(), kind: z.string(), amountCents: z.number().int(), classesDelta: z.number().int(), reason: z.string(), createdAt: z.string().datetime() }).strict()),
}).strict();
export const clientDirectorySchema = z.object({
  clients: z.array(client), plans: z.array(option), teachers: z.array(option), guardians: z.array(option),
  mergeClients: z.array(z.object({ id: z.string(), name: z.string(), phone: z.string(), cpf: z.string(), active: z.boolean(), guardianId: z.string().nullable() }).strict()),
  loyaltySettings: z.object({ loyaltyEnabled: z.boolean(), loyaltyStartedAt: z.string().datetime().nullable(), loyaltyVisitsRequired: z.number().int(), loyaltyRewardLabel: z.string() }).strict(),
}).strict();
