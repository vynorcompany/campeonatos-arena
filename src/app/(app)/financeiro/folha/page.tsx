import { EmployeePayrollWorkspace } from "@/components/finance/employee-payroll-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";

export default async function PayrollPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const auth = await requireModuleView("finance");
  const requested = (await searchParams)?.mes;
  const current = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0, 7);
  const referenceMonth = requested && /^(?:20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(requested) ? requested : current;
  const [members, rows] = await withArenaTransaction(auth.arenaId, tx => Promise.all([
    tx.arenaMember.findMany({ where: { arenaId: auth.arenaId }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
    tx.employeePayrollEntry.findMany({ where: { arenaId: auth.arenaId, referenceMonth }, include: { financialEntry: { include: { settlements: { select: { amountCents: true, interestCents: true } } } } }, orderBy: { employeeName: "asc" } }),
  ]));
  return <EmployeePayrollWorkspace referenceMonth={referenceMonth} employees={members.map(member => member.user)} entries={rows.map(row => ({ ...row, financialEntry: row.financialEntry ? { ...row.financialEntry, dueDate: row.financialEntry.dueDate?.toISOString().slice(0, 10) ?? "", paidAt: row.financialEntry.paidAt?.toISOString().slice(0, 10) ?? "" } : null }))} />;
}
