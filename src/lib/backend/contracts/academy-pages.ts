import { z } from 'zod';
export const academyPageSchema = z.enum(['teachers', 'students', 'register', 'policy']);
export type AcademyPage = z.infer<typeof academyPageSchema>;
const named = z.object({ id: z.string(), name: z.string() }).strict();
export const academyPageDataSchema = z.object({
  teachers: z.array(z.object({ id: z.string(), name: z.string(), phone: z.string(), email: z.string(), active: z.boolean(), player: z.object({ photoUrl: z.string() }).strict().nullable(), studentAssignments: z.array(z.object({ id: z.string() }).strict()), planAssignments: z.array(z.object({ id: z.string() }).strict()) }).strict()),
  clients: z.array(named.extend({ phone: z.string(), email: z.string() }).strict()),
  students: z.array(named.extend({ playerId: z.string().nullable(), phone: z.string(), email: z.string(), notes: z.string(), remainingClasses: z.number().int(), attendedClasses: z.number().int(), missedClasses: z.number().int(), player: z.object({ name: z.string() }).strict().nullable() }).strict()),
  lessons: z.array(z.object({ id: z.string(), title: z.string(), status: z.string(), durationMinutes: z.number().int(), scheduledAt: z.iso.datetime().nullable(), teacher: z.object({ name: z.string() }).strict().nullable(), attendances: z.array(z.object({ id: z.string(), studentId: z.string(), status: z.string(), student: z.object({ name: z.string() }).strict() }).strict()) }).strict()),
  bankAccounts: z.array(named), playerOptions: z.array(named), studentOptions: z.array(named), teacherOptions: z.array(named),
  policy: z.object({ lessonMakeupEnabled: z.boolean(), lessonMakeupLeadHours: z.number().int(), lessonMakeupValidityDays: z.number().int(), lessonMakeupMonthEnd: z.boolean(), lessonMakeupPolicy: z.string(), lessonCreditNoticeDays: z.number().int() }).strict().nullable(),
}).strict();
