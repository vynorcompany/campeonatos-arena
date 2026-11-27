import { z } from "zod";
const tone = z.enum(['positive', 'negative', 'neutral']);
const detail = z.object({ id: z.string(), title: z.string(), subtitle: z.string().optional(), value: z.string().optional(), date: z.string().optional(), href: z.string().optional(), tone: tone.optional() }).strict();
const card = z.object({
  id: z.string(), label: z.string(), value: z.union([z.string(), z.number()]), caption: z.string(), secondary: z.string().optional(), tone: tone.optional(),
  comparison: z.object({ percent: z.number(), label: z.string().optional(), favorable: z.enum(['up', 'down']).optional() }).strict().optional(),
  title: z.string(), description: z.string(), emptyMessage: z.string(), items: z.array(detail),
}).strict();
const breakdown = z.array(z.object({ id: z.string(), name: z.string(), value: z.number() }).strict());
export const dashboardQuerySchema = z.object({
  dataInicial: z.string().max(10).optional(), dataFinal: z.string().max(10).optional(), visao: z.string().max(20).optional(),
  comparar: z.string().max(20).optional(), compararDataInicial: z.string().max(10).optional(), compararDataFinal: z.string().max(10).optional(),
}).strict();
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export const dashboardOverviewSchema = z.union([
  z.object({ error: z.string() }).strict(),
  z.object({
    analytics: z.object({ cards: z.array(card), cashDays: z.array(z.object({ label: z.string(), income: z.number(), expense: z.number() }).strict()), received: z.number(), paid: z.number(),
      courtRevenue: breakdown, forecastCourts: breakdown, categories: breakdown, methods: breakdown, months: breakdown, lessonsByTeacher: breakdown,
      clients: breakdown, debtors: breakdown, courtReservations: breakdown, products: breakdown,
    }).strict(), fixedCostCents: z.number(), forecastCostCents: z.number(),
  }).strict(),
]);
