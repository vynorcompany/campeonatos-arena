import { z } from "zod";
export const checkinFields = {
 configure: ["enabled", "checkinMode", "lessonDebtPolicy", "lessonCheckinBlockOverdue", "rotate"],
 court: ["arenaSlug", "token", "occurrenceId", "courtId", "playerIds", "selectionMode", "joinOwnGame"],
 lesson: ["arenaSlug", "token", "lessonId"],
 share: ["arenaSlug", "occurrenceId"],
} as const;
export type CheckinOperation = keyof typeof checkinFields;
export function checkinInputSchema(operation: CheckinOperation) {
 return z.object({fields: z.record(z.string(), z.array(z.string().max(512)).min(1).max(64))}).strict().superRefine(({fields}, ctx) => {
  for (const [key, values] of Object.entries(fields)) {
   if (!(checkinFields[operation] as readonly string[]).includes(key) || (key !== "playerIds" && values.length !== 1)) ctx.addIssue({code:"custom", message:"Campo inválido.", path:["fields",key]});
  }
  if (operation !== "configure" && !fields.arenaSlug?.[0]?.trim()) ctx.addIssue({code:"custom",message:"Arena obrigatória.",path:["fields","arenaSlug"]});
 });
}
export const checkinOutcomeSchema = z.object({error:z.string().max(2000).nullable(),path:z.string().max(2048).refine(value=>value.startsWith("/checkin/")&&!value.includes("\\")&&!/[\r\n]/.test(value)).optional()}).strict();
export const checkinSettingsSchema = z.object({slug:z.string(),checkinEnabled:z.boolean(),checkinMode:z.enum(["SELF","GROUP"]),checkinToken:z.string().nullable(),blockOverdueLessons:z.boolean()}).strict();
export const checkinViewInputSchema=z.object({arenaSlug:z.string().min(1).max(160),token:z.string().length(64),focusId:z.string().max(160).default("")}).strict();
export const checkinViewSchema=z.object({arena:z.object({name:z.string(),logoUrl:z.string(),checkinMode:z.enum(["SELF","GROUP"])}).strict(),auth:z.object({playerId:z.string(),name:z.string()}).strict().nullable(),slots:z.array(z.object({id:z.string(),time:z.string(),end:z.string(),date:z.string(),responsibleName:z.string(),isResponsible:z.boolean(),canManage:z.boolean(),opensAt:z.number().finite(),closesAt:z.number().finite(),courts:z.array(z.object({id:z.string(),name:z.string(),color:z.string()}).strict()),participants:z.array(z.object({playerId:z.string(),name:z.string(),checkedIn:z.boolean()}).strict())}).strict()),lessons:z.array(z.object({id:z.string(),time:z.string(),title:z.string(),teacherName:z.string(),checkedIn:z.boolean()}).strict())}).strict().nullable();
