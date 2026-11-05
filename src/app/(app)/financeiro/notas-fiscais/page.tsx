import { InvoicesWorkspace } from "@/components/fiscal/invoices-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { withArenaTransaction } from "@/lib/rls";
import { notFound } from "next/navigation";
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ documentId?: string }> }) {
  const target = (await searchParams).documentId?.slice(0,200);
  const auth = await requireModuleView("finance");
  if (!canPerformPermission("finance:settings:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  const documents = await withArenaTransaction(auth.arenaId, tx => tx.fiscalDocument.findMany({ where: { arenaId: auth.arenaId, ...(target ? { id: target } : {}) }, select: { id: true, number: true, series: true, supplierName: true, issuedAt: true, totalCents: true, documentType: true, direction: true, provider: true, status: true, environment: true, providerMessage: true, xmlUrl: true, printUrl: true, _count: { select: { items: true } } }, orderBy: { importedAt: "desc" }, take: 30 }));
  return <InvoicesWorkspace documents={documents} filtered={Boolean(target)}/>;
}
