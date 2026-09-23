import "server-only";
import { prisma } from "@/lib/prisma";
import { agencyInvoiceDeadline } from "@/lib/finance/agency-billing-dates";

export async function getAgencyDelinquency(arenaId: string, now = new Date()) {
  const [settings, invoice] = await Promise.all([
    prisma.agencyPaymentConnection.findUnique({ where: { id: "platform" }, select: { graceDays: true } }),
    prisma.agencyInvoice.findFirst({ where: { arenaId, status: "PENDING", dueAt: { lt: now } }, orderBy: { dueAt: "asc" }, select: { id: true, dueAt: true, checkoutUrl: true, period: true } })
  ]);
  if (settings?.graceDays == null || !invoice) return null;
  const deadline = agencyInvoiceDeadline(invoice.dueAt, settings.graceDays);
  return {
    ...invoice,
    deadline,
    graceDays: settings.graceDays,
    blocked: now > deadline,
    daysRemaining: Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000))
  };
}
