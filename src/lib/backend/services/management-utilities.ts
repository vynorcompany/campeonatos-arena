import "server-only";
import { requireAuth, requireArenaAccess } from "./management-session";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { getAgencyDelinquency } from "@/lib/finance/agency-delinquency";
import { accessUnavailableSchema, printerTestSchema } from "../contracts/management-utilities";
export async function resolveAccessUnavailable() {
  // Deliberately authenticate without the arena access gate: a blocked user must
  // be able to see this page, rather than redirecting back to it indefinitely.
  const auth = await requireAuth();
  const [subscription, delinquency] = auth.arenaId ? await Promise.all([
    prisma.agencySubscription.findUnique({ where: { arenaId: auth.arenaId }, select: { plan: { select: { isTrial: true } }, trialEndsAt: true, invoices: { where: { status: "PENDING" }, orderBy: { dueAt: "asc" }, take: 1, select: { checkoutUrl: true } } } }),
    getAgencyDelinquency(auth.arenaId),
  ]) : [null, null];
  return accessUnavailableSchema.parse({
    reason: delinquency?.blocked ? "OVERDUE" : subscription?.plan.isTrial && subscription.trialEndsAt && subscription.trialEndsAt <= new Date() ? "TRIAL_ENDED" : "UNAVAILABLE",
    checkoutUrl: subscription?.invoices[0]?.checkoutUrl || null,
  });
}
export async function resolvePrinterTest() {
  const auth = await requireArenaAccess();
  const settings = await arenaDatabase(auth.arenaId).arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { printerPaper: true, printerCopies: true } });
  return printerTestSchema.parse({ printerPaper: settings?.printerPaper ?? "80MM", printerCopies: settings?.printerCopies ?? 1 });
}
