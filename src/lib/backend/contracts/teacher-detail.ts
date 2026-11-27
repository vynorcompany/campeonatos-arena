import { z } from 'zod';
const named = z.object({ id: z.string(), name: z.string() }).strict();
const date = z.iso.datetime(); const optionalDate = date.nullable(); const cents = z.number().int();
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const parsed = new Date(`${value}T00:00:00Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; });
export const teacherDetailQuerySchema = z.object({ inicio: calendarDate.optional(), fim: calendarDate.optional() }).strict();
export type TeacherDetailQuery = z.infer<typeof teacherDetailQuerySchema>;
const financialEntry = z.object({ id: z.string(), counterpartyName: z.string(), playerId: z.string().nullable(), amountCents: cents, status: z.string(), paidAt: optionalDate, dueDate: optionalDate }).strict();
export const teacherDetailDataSchema = z.object({
  now: date, reportStart: date, reportEnd: date, canRegisterEnrollmentPayment: z.boolean(), enrollmentBankAccounts: z.array(named),
  clients: z.array(named.extend({ phone: z.string() }).strict()), targetTeachers: z.array(named),
  makeupAttendances: z.array(z.object({ makeupScheduledAt: optionalDate, makeupExpiresAt: optionalDate }).strict()),
  activeStudentFinancialEntries: z.array(z.object({ id: z.string(), planId: z.string().nullable(), playerId: z.string().nullable(), status: z.string(), dueDate: optionalDate, paidAt: optionalDate }).strict()),
  teacher: named.extend({ active: z.boolean(), player: z.object({ photoUrl: z.string() }).strict().nullable(),
    planAssignments: z.array(z.object({ planId: z.string(), monthlyPriceCents: cents, priceChanges: z.array(z.object({ id: z.string(), amountCents: cents, effectiveDate: date }).strict()),
      plan: named.extend({ classesPerMonth: z.number().int(), creditExpiryCycle: z.string(), creditExpiryDays: z.number().int().nullable(), notes: z.string(),
        subscriptions: z.array(z.object({ id: z.string(), studentId: z.string(), dueDay: z.number().int(), student: named.extend({ playerId: z.string().nullable(), remainingClasses: z.number().int() }).strict() }).strict()), financialEntries: z.array(financialEntry),
      }).strict(),
    }).strict()),
    lessons: z.array(z.object({ status: z.string(), attendances: z.array(z.object({ id: z.string() }).strict()) }).strict()),
    classGroups: z.array(named.extend({ notes: z.string(), schedules: z.array(z.object({ id: z.string(), weekday: z.number().int(), startTime: z.string(), capacity: z.number().int() }).strict()), plans: z.array(z.object({ planId: z.string() }).strict()), enrollments: z.array(z.object({ id: z.string(), student: named }).strict()) }).strict()),
  }).strict(),
}).strict().nullable();
