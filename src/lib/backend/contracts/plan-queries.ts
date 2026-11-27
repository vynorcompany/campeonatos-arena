import {z}from"zod";
const named=z.object({id:z.string(),name:z.string()}).strict();
export const planListQuerySchema=z.object({q:z.string().max(300).optional(),type:z.string().max(100).optional(),sort:z.string().max(30).optional(),kind:z.enum(["FIXED_COURT","SPONSORSHIP",""]).optional()}).strict();
export type PlanListQuery=z.infer<typeof planListQuerySchema>;
const plan=z.object({id:z.string(),name:z.string(),kind:z.string(),sponsorshipType:z.string(),monthlyAmountCents:z.number().int(),reservationCredits:z.number().int(),lessonCredits:z.number().int(),prorateFifthWeek:z.boolean()}).strict();
export const planListSchema=z.object({plans:z.array(plan.extend({linkCount:z.number().int().nonnegative()}).strict()),planTypes:z.array(z.string()),courts:z.array(named)}).strict();
export const planDetailQuerySchema=z.object({id:z.string().min(1).max(150)}).strict();
export const planDetailSchema=z.object({
 plan:plan.extend({dueDay:z.number().int(),dueDays:z.array(z.number().int()),sponsors:z.array(z.object({id:z.string(),name:z.string(),logoUrl:z.string(),displayOrder:z.number().int(),installments:z.number().int(),dueDay:z.number().int(),player:z.object({name:z.string()}).strict().nullable()}).strict())}).strict(),
 clients:z.array(named.extend({phone:z.string()}).strict()),planBanks:z.array(named),planMethods:z.array(z.object({name:z.string()}).strict()),
 series:z.array(z.object({id:z.string(),responsiblePlayerId:z.string().nullable(),fixedPlanEnrollmentId:z.string().nullable(),status:z.string(),dueDay:z.number().int().nullable(),startsAt:z.iso.datetime(),endsAt:z.iso.datetime(),responsiblePlayer:z.object({name:z.string()}).strict().nullable(),occurrences:z.array(z.object({occurrenceCourts:z.array(z.object({court:z.object({name:z.string()}).strict()}).strict())}).strict())}).strict()),
 courts:z.array(named.extend({onlineSlotMinutes:z.number().int(),weeklyRules:z.array(z.object({weekday:z.number().int(),startsAtMinute:z.number().int(),endsAtMinute:z.number().int(),available:z.boolean()}).strict())}).strict()),banks:z.array(named),methods:z.array(z.object({name:z.string()}).strict()),
}).strict().nullable();
