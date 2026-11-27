import { getFinanceWorkspace } from "@/lib/finance/workspace-page";
import { EmployeePayrollWorkspace } from "@/components/finance/employee-payroll-workspace";
import { requireFinanceView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";


export default async function PayrollPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const auth = await requireFinanceView("payable");
  const { referenceMonth, employees, payroll } = await getFinanceWorkspace(auth.arenaId, 'payroll', (await searchParams)?.mes);
  const allowed = (key: string) => canPerformPermission(key, auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <EmployeePayrollWorkspace referenceMonth={referenceMonth} employees={employees} entries={payroll} canCreate={allowed("finance:payable:create")} canEdit={allowed("finance:payable:edit")} canSettle={allowed("finance:payable:settle")} />;
}
