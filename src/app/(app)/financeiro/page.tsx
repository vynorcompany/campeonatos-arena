import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireArenaAccess } from "@/lib/auth/session";
import { financeHomeLinks } from "@/lib/navigation/finance-home-links";
import { notFound } from "next/navigation";

export default async function FinancePage() {
  const auth = await requireArenaAccess();
  const items = financeHomeLinks(auth);
  if (!items.length) notFound();
  return <OperationalSubmenuList ariaLabel="Áreas financeiras" items={items} />;
}
