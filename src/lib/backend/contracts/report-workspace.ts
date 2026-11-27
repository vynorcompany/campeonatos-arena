import { z } from "zod";
export const reportKeys = ["caixa","lancamentos","produtos","estoque","comandas","dre","planos","reservas","pagamentos-online"] as const;
const text = z.string(), filter = z.string().max(200), identifier = z.string().max(100);
export const reportQuerySchema = z.object({ report: z.enum(reportKeys), inicio: identifier.optional(), fim: identifier.optional(), tipo: filter.optional(), situacao: filter.optional(), categoria: filter.optional(), forma: filter.optional(), banco: identifier.optional(), professor: identifier.optional(), pagamento: filter.optional(), quadra: z.array(identifier).max(500).optional(), quadras: filter.optional() }).strict();
const option = z.object({ id: text, name: text }).strict();
const tableRow = z.object({ key: text, values: z.array(text) }).strict();
const summaryRow = z.object({ label: text, count: z.number(), total: z.number() }).strict();
const volume = z.object({ courtName: text, reservations: z.number() }).strict().nullable();
export const reportReservationInsightsSchema = z.object({
 highestVolumeCourt: volume, lowestVolumeCourt: volume,
 mostUsedService: z.object({ label: text, reservations: z.number() }).strict().nullable(),
 courtInsights: z.array(z.object({ courtId: text, courtName: text, reservations: z.number(), occupiedMinutes: z.number(), availableMinutes: z.number(), occupancyPercent: z.number() }).strict()),
}).strict();
const supplement = z.discriminatedUnion("kind", [
 z.object({ kind: z.literal("none") }).strict(),
 z.object({ kind: z.literal("ledger"), categories: z.array(option), categoryCatalog: z.array(z.object({ value: text, label: text }).strict()), methodNames: z.array(text), accounts: z.array(option), methodRows: z.array(tableRow), dayRows: z.array(tableRow) }).strict(),
 z.object({ kind: z.literal("dre"), statement: z.array(z.object({ label: text, amount: z.number(), subtotal: z.boolean() }).strict()) }).strict(),
 z.object({ kind: z.literal("plans"), teachers: z.array(option), planSales: z.array(summaryRow), monthlySales: z.array(summaryRow) }).strict(),
 z.object({ kind: z.literal("reviews"), description: text, cases: z.array(z.object({ key: text, kind: z.enum(["checkout","entry","registration"]), recordId: text, paymentId: text, clientName: text, canResolve: z.boolean() }).strict()) }).strict(),
 z.object({ kind: z.literal("reservations"), courts: z.array(option.safeExtend({ active: z.boolean() })), selectedIds: z.array(text), insights: reportReservationInsightsSchema }).strict(),
]);
export const reportWorkspaceSchema = z.object({
 report: z.enum(reportKeys), startInput: text, endInput: text,
 metrics: z.array(z.object({ label: text, value: z.union([text,z.number()]), tone: z.enum(["positive","negative"]).optional() }).strict()),
 headers: z.array(text), rows: z.array(tableRow), supplementary: supplement,
}).strict().superRefine((data,ctx)=>{
 const expected: Record<string,string> = { lancamentos:"ledger", dre:"dre", planos:"plans", reservas:"reservations" };
 const kind = expected[data.report] ?? (data.report === "pagamentos-online" ? "reviews" : "none");
 if (data.supplementary.kind !== kind && !(data.report === "pagamentos-online" && data.supplementary.kind === "none")) ctx.addIssue({ code:"custom",message:"Complemento de relatório incompatível." });
 if (data.rows.some(row=>row.values.length!==data.headers.length)) ctx.addIssue({code:"custom",message:"Colunas de relatório inconsistentes."});
});
export type ReportWorkspace = z.infer<typeof reportWorkspaceSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
