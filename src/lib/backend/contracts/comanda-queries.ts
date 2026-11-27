import { z } from "zod";
import { parseAgendaDay } from "./agenda-day";
const named = z.object({ id: z.string(), name: z.string() }).strict();
const option = z.object({ productId: z.string(), name:z.string(), quantity: z.number(), available: z.boolean() }).strict();
const composition = z.object({ fixed: z.array(option), groups: z.array(z.object({ id: z.string(), label: z.string(), options: z.array(option) }).strict()) }).strict();
export const comandaListQuerySchema = z.object({ date: z.string().refine(value => parseAgendaDay(value) !== null).optional(), search: z.string().max(300).optional(), ids: z.string().max(20000).optional() }).strict();
export type ComandaListQuery = z.infer<typeof comandaListQuerySchema>;
export const bookingServiceSchema = z.object({ id: z.string(), name: z.string(), date: z.string(), amountCents: z.number().int(), chargedAmountCents: z.number().int(), state: z.string(), financialEntryId: z.string().nullable() }).strict();
const item = z.object({ id: z.string(), quantity: z.number().int(), unitPriceCents: z.number().int(), totalCents: z.number().int(), durationMinutes: z.number().int(), compositionLabel: z.string(), product: z.object({ name: z.string() }).strict() }).strict();
export const comandaListSchema = z.object({
 date: z.string(), today: z.string(), openDays: z.array(z.string()), closeRequestRevision: z.string(),
 operational: z.object({ comandaCardsEnabled: z.boolean(), requireFullPayment: z.boolean(), preventOverpayment: z.boolean() }).strict().nullable(),
 openRequests: z.array(z.object({ id: z.string(), message: z.string(), href: z.string() }).strict()),
 players: z.array(named), openComandas: z.array(z.object({ playerId: z.string().nullable(), code: z.string() }).strict()),
 products: z.array(named.extend({ priceCents: z.number().int(), stockQuantity: z.number().int(), isService: z.boolean(), serviceHourly: z.boolean(), category: z.object({name:z.string()}).strict().nullable(), composition: composition.optional() }).strict()),
 paymentMethods: z.array(z.string()), bankAccounts: z.array(named),
 debtsByPlayer: z.record(z.string(), z.array(z.object({ id: z.string(), description: z.string(), amountCents: z.number().int(), dueDate: z.iso.datetime().nullable() }).strict())),
 comandas: z.array(z.object({ id: z.string(), playerId: z.string().nullable(), code: z.string(), cardNumber: z.string().nullable(), closeRequestedAt: z.iso.datetime().nullable(), label: z.string(), type: z.string(), openedByUserName: z.string(), bookingServices: z.array(bookingServiceSchema), playerName: z.string().nullable(), clientCreditCents: z.number().int(), items: z.array(item), requests: z.array(z.object({id:z.string(),quantity:z.number().int(),productName:z.string()}).strict()) }).strict()),
}).strict();
export const comandaDocumentQuerySchema = z.object({ id:z.string().min(1).max(150), view:z.enum(["detail","print"]) }).strict();
export const comandaDocumentSchema = z.object({
 comanda: z.object({label:z.string(),code:z.string(),status:z.string(),openedByUserName:z.string(),items:z.array(z.object({id:z.string(),quantity:z.number().int(),totalCents:z.number().int(),compositionLabel:z.string(),product:z.object({name:z.string()}).strict()}).strict()),financialEntries:z.array(z.object({id:z.string(),amountCents:z.number().int(),status:z.string(),dueDate:z.string().nullable(),paidAt:z.string().nullable()}).strict())}).strict(),
 bookingServices:z.array(bookingServiceSchema),
 arena:z.object({name:z.string(),legalName:z.string(),cnpj:z.string(),address:z.string(),city:z.string(),state:z.string(),phone:z.string()}).strict().nullable(),
 settings:z.object({printerPaper:z.string(),printerCopies:z.number().int()}).strict().nullable(),
}).strict().nullable();
