import { z } from "zod";
export const academyMutationFields = {
  "save-lesson-plan-expiry": ["planId", "creditExpiryCycle", "creditExpiryDays"],
  "save-lesson-makeup-policy": ["lessonMakeupEnabled", "lessonMakeupLeadHours", "lessonMakeupValidityDays", "lessonMakeupMonthEnd", "lessonMakeupPolicy", "lessonCreditNoticeDays"],
  "request-lesson-credit-reschedule": ["arenaSlug", "batchId", "message"],
  "resolve-lesson-credit-request": ["requestId", "status", "response", "expiresAt"],
  "resolve-teacher-lesson-credit-request": ["arenaSlug", "requestId", "status", "response", "expiresAt"],

  "create-student": ["email", "name", "notes", "phone", "playerId", "remainingClasses"],
  "add-student-credits": ["quantity", "studentId"],
  "update-student": ["email", "name", "notes", "phone", "remainingClasses", "studentId"],
  "delete-student": ["studentId"],
  "create-teacher": ["monthlyTarget", "notes", "playerId"],
  "archive-teacher": ["teacherId"],
  "delete-teacher": ["teacherId"],
  "create-class-group": ["capacities", "notes", "planIds", "startTimes", "teacherId", "weekdays"],
  "update-teacher-class-group": ["capacities", "classGroupId", "notes", "planIds", "startTimes", "teacherId", "weekdays"],
  "update-teacher-class-group-capacity": ["capacity", "classGroupId", "scheduleId", "teacherId"],
  "move-teacher-class-group-student": ["destinationClassGroupId", "sourceClassGroupId", "studentId", "teacherId"],
  "create-teacher-student": ["newStudentName", "newStudentPhone", "studentId", "teacherId"],
  "transfer-teacher-student": ["sourceTeacherId", "studentId", "targetTeacherId"],
  "create-teacher-plan": ["planId", "teacherId"],
  "create-teacher-plan-with-price": ["classesPerMonth", "creditExpiryCycle", "creditExpiryDays", "monthlyPrice", "name", "notes", "teacherId"],
  "update-teacher-plan-with-price": ["creditExpiryCycle", "creditExpiryDays", "monthlyPrice", "planId", "teacherId"],
  "assign-teacher-plan-student": ["bankAccountId", "classGroupId", "clientId", "discount", "discountApplication", "discountMode", "dueDate", "dueDay", "paid", "paidAt", "paymentMethod", "planId", "startedAt", "teacherId"],
  "copy-teacher-plans": ["sourceTeacherId", "targetTeacherId"],
  "remove-teacher-plan-student": ["cancelOpenBoletos", "clearRemainingClasses", "planId", "studentId", "teacherId"],
  "create-lesson": ["bankAccountId", "durationMinutes", "isPaid", "notes", "paymentMethod", "price", "scheduledAt", "studentIds", "teacherId", "title"],
  "complete-lesson": ["absentStudentIds", "lessonId"],
  "delete-lesson": ["lessonId"],
} as const;
export type AcademyMutationOperation = keyof typeof academyMutationFields;
export const academyMutationModules = {
  "save-lesson-plan-expiry": "teachers",
  "save-lesson-makeup-policy": "teachers",
  "request-lesson-credit-reschedule": "portal",
  "resolve-lesson-credit-request": "students",
  "resolve-teacher-lesson-credit-request": "portal",

  "create-student": "students",
  "add-student-credits": "students",
  "update-student": "students",
  "delete-student": "students",
  "create-teacher": "teachers",
  "archive-teacher": "teachers",
  "delete-teacher": "teachers",
  "create-class-group": "teachers",
  "update-teacher-class-group": "teachers",
  "update-teacher-class-group-capacity": "lessons",
  "move-teacher-class-group-student": "lessons",
  "create-teacher-student": "teachers",
  "transfer-teacher-student": "teachers",
  "create-teacher-plan": "teachers",
  "create-teacher-plan-with-price": "teachers",
  "update-teacher-plan-with-price": "teachers",
  "assign-teacher-plan-student": "teachers",
  "copy-teacher-plans": "teachers",
  "remove-teacher-plan-student": "teachers",
  "create-lesson": "lessons",
  "complete-lesson": "lessons",
  "delete-lesson": "lessons"
} as const;
export const academyMutationOutcomeSchema = z.union([z.object({ error: z.string() }).strict(), z.object({}).strict()]);
export function academyMutationInputSchema(operation: AcademyMutationOperation) {
  return z.object({ fields: z.record(z.string(), z.array(z.string().max(16384)).min(1).max(2000)) }).strict().superRefine((value, ctx) => {
    for (const [key, values] of Object.entries(value.fields)) {
      if (!(academyMutationFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: 'custom', message: 'Unexpected field', path: ['fields', key] });
      if (!['planIds', 'weekdays', 'startTimes', 'capacities', 'studentIds', 'absentStudentIds'].includes(key) && values.length !== 1) ctx.addIssue({ code: 'custom', message: 'Repeated scalar field', path: ['fields', key] });
    }
  });
}

export const portalAcademyOperations: readonly AcademyMutationOperation[] = ['request-lesson-credit-reschedule', 'resolve-teacher-lesson-credit-request'];
export const lessonCreditSettingsOperations: readonly AcademyMutationOperation[] = ['save-lesson-plan-expiry', 'save-lesson-makeup-policy', 'request-lesson-credit-reschedule', 'resolve-lesson-credit-request', 'resolve-teacher-lesson-credit-request'];
