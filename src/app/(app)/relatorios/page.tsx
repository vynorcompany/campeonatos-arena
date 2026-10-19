import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireFinanceView } from "@/lib/auth/guards";
import { reportLinks } from "@/lib/navigation/report-links";

export default async function ReportsPage() {
  await requireFinanceView("reports");
  return <OperationalSubmenuList ariaLabel="Relatórios" items={reportLinks} />;
}
