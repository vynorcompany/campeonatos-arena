import { z } from "zod";
import { arenaWallClockToInstant, instantToArenaWallClock } from "../calendar/arena-wall-clock";
export const expiryPolicySchema = z.object({ creditExpiryCycle: z.enum(["NONE", "FORTNIGHT", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"]).default("NONE"), creditExpiryDays: z.preprocess(v => v === "" || v == null ? null : Number(v), z.number().int().min(1).max(3650).nullable().default(null)) }).superRefine((v, ctx) => { if (v.creditExpiryCycle === "CUSTOM" && !v.creditExpiryDays) ctx.addIssue({ code: "custom", path: ["creditExpiryDays"], message: "Informe a validade em dias." }); });
export type CreditExpiryPolicy = z.infer<typeof expiryPolicySchema>;
export const expiryLabels: Record<string, string> = { NONE: "Não expiram", FORTNIGHT: "15 dias", MONTHLY: "Mensal", QUARTERLY: "Trimestral", YEARLY: "Anual", CUSTOM: "Personalizado" };
export function creditExpiration(issuedAt: Date, policy: CreditExpiryPolicy) {
  if (policy.creditExpiryCycle === "NONE") return null;
  const local = instantToArenaWallClock(issuedAt);
  const months = ({ MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 } as Record<string, number>)[policy.creditExpiryCycle];
  if (months) { const day = local.getDate(); local.setDate(1); local.setMonth(local.getMonth() + months); local.setDate(Math.min(day, new Date(local.getFullYear(), local.getMonth() + 1, 0).getDate())); }
  else local.setDate(local.getDate() + (policy.creditExpiryCycle === "FORTNIGHT" ? 15 : policy.creditExpiryDays!));
  return arenaWallClockToInstant(local);
}
export function readExpiryPolicy(form: FormData) { return expiryPolicySchema.parse({ creditExpiryCycle: form.get("creditExpiryCycle") ?? "NONE", creditExpiryDays: form.get("creditExpiryDays") }); }
