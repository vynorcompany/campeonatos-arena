import { InvoicesWorkspace } from "@/components/fiscal/invoices-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { withArenaTransaction } from "@/lib/rls";
import { notFound } from "next/navigation";
export default async function InvoicesPage() {
  const auth = await requireModuleView("finance");
  if (!canPerformPermission("finance:settings:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  const documents = await withArenaTransaction(auth.arenaId, tx => tx.fiscalDocument.findMany({ where: { arenaId: auth.arenaId }, include: { _count: { select: { items: true } } }, orderBy: { importedAt: "desc" }, take: 30 }));
  return <InvoicesWorkspace documents={documents}/>;
}
