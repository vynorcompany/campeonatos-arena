import { AgencyPlansContent } from "@/components/agency/agency-plans-content";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AgencyPlansPage({ searchParams }: { searchParams: Promise<{ connected?: string; connectionError?: string }> }) {
  await requireAgencyAccess();
  const notice = await searchParams;
  const [plans, arenas, subscriptions, invoices, connection] = await Promise.all([
    prisma.agencyPlan.findMany({ orderBy: [{ isTrial: "desc" }, { name: "asc" }] }),
    prisma.arena.findMany({ select: { id: true, name: true, accountStatus: true }, orderBy: { name: "asc" } }),
    prisma.agencySubscription.findMany({ include: { plan: true }, orderBy: { arena: { name: "asc" } } }),
    prisma.agencyInvoice.findMany({ include: { arena: { select: { name: true } } }, orderBy: { dueAt: "desc" }, take: 50 }),
    prisma.agencyPaymentConnection.findUnique({ where: { id: "platform" } })
  ]);
  return <AgencyPlansContent plans={plans} arenas={arenas} subscriptions={subscriptions} invoices={invoices} connection={connection} notice={notice} />;
}
