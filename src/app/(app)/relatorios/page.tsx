import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireModuleView } from "@/lib/auth/guards";
import { reportLinks } from "@/lib/navigation/report-links";

export default async function ReportsPage() {
  await requireModuleView("finance");
  return <OperationalSubmenuList ariaLabel="Relatórios" items={reportLinks} />;
}
