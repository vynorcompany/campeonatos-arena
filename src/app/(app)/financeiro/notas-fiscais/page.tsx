import { InvoicesWorkspace } from "@/components/fiscal/invoices-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { getFiscalInvoices } from "@/lib/fiscal/invoice-data";
import { notFound } from "next/navigation";
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ documentId?: string }> }) {
  const target = (await searchParams).documentId?.slice(0,200);
  const auth = await requireModuleView("finance");
  if (!canPerformPermission("finance:settings:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  const { documents } = await getFiscalInvoices(auth.arenaId, target);
  return <InvoicesWorkspace documents={documents} filtered={Boolean(target)}/>;
}
