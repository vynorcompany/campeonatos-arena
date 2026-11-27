import { z } from 'zod';
import { serviceBookingRulesSchema } from '@/lib/calendar/service-booking-rules';
export const productPageSchema = z.enum(['services', 'stock']);
export type ProductPage = z.infer<typeof productPageSchema>;
const named = z.object({ id: z.string(), name: z.string() }).strict();
export const productPageDataSchema = z.object({
  products: z.array(named.extend({ sku: z.string(), priceCents: z.number().int(), stockQuantity: z.number().int(), minStock: z.number().int(), active: z.boolean(), category: z.object({ name: z.string() }).strict().nullable() }).strict()),
  categories: z.array(named), courts: z.array(named), prices: z.array(z.object({ serviceCode: z.string(), priceCents: z.number().int() }).strict()),
  services: z.array(named.extend({ sku: z.string(), active: z.boolean(), priceCents: z.number().int(), serviceHourly: z.boolean(), showOnAgenda: z.boolean(), showOnComandas: z.boolean(), showOnPortalBooking: z.boolean(), bookingConcurrentLimit: z.number().int(), bookingRules: serviceBookingRulesSchema }).strict()),
}).strict();
