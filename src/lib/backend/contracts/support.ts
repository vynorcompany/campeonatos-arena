import { z } from "zod";

export const supportOperations = ["create", "update", "message"] as const;
export type SupportOperation = typeof supportOperations[number];
export const supportFields = {
  create: ["title", "category", "priority", "description"],
  update: ["ticketId", "status", "priority", "assigneeId"],
  message: ["ticketId", "body", "internal"]
} as const;
const priority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const inputs = {
  create: z.object({title: z.string().trim().min(4).max(1000), category: z.enum(["BUG", "ADJUSTMENT", "QUESTION", "FINANCE", "OTHER"]), priority, description: z.string().trim().min(10).max(100000)}).strict(),
  update: z.object({ticketId: z.string().min(1).max(200), status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]), priority, assigneeId: z.string().max(200).optional().default("")}).strict(),
  message: z.object({ticketId: z.string().min(1).max(200), body: z.string().trim().min(2).max(100000), internal: z.string().max(32).optional().default("")}).strict()
};
export function supportInputSchema(operation: SupportOperation) { return inputs[operation]; }
export const supportOutcomeSchema = z.object({error: z.string().nullable()}).strict();
export const supportWorkspaceSchema = z.object({tickets: z.array(z.object({
  id: z.string(), code: z.string(), title: z.string(), description: z.string(), category: z.string(), priority: z.string(), status: z.string(), updatedAt: z.iso.datetime(), requester: z.object({name:z.string()}).strict(), assignee:z.object({name:z.string()}).strict().nullable(), messages:z.array(z.object({body:z.string()}).strict()).max(1)
}).strict())}).strict();

export const agencySupportWorkspaceSchema = z.object({
  tickets:z.array(z.object({id:z.string(),code:z.string(),title:z.string(),description:z.string(),status:z.string(),priority:z.string(),assigneeId:z.string().nullable(),arena:z.object({name:z.string()}).strict(),requester:z.object({name:z.string()}).strict(),messages:z.array(z.object({id:z.string(),body:z.string(),internal:z.boolean(),author:z.object({name:z.string()}).strict()}).strict()).max(3)}).strict()),
  agencyUsers:z.array(z.object({id:z.string(),name:z.string()}).strict())
}).strict();
