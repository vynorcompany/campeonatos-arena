import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { financeWorkspacePageSchema, type FinanceWorkspace } from '@/lib/backend/contracts/finance-workspaces';
const planSelect = { id: true, name: true, active: true, monthlyPriceCents: true, classesPerMonth: true, creditExpiryCycle: true, creditExpiryDays: true } as const;
export async function resolveFinanceWorkspace(arenaId: string, workspace: FinanceWorkspace, month?: string) {
  const data = financeWorkspacePageSchema.parse({ referenceMonth: '', plans: [], students: [], bankAccounts: [], subscriptions: [], employees: [], payroll: [] });
  await withArenaTransaction(arenaId, async tx => {
    if (workspace === 'plans') data.plans = await tx.plan.findMany({ where: { arenaId }, select: { ...planSelect, teacherAssignments: { where: { active: true }, select: { teacher: { select: { name: true } } }, orderBy: { teacher: { name: 'asc' } } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] });
    if (workspace === 'monthly') {
      const [students, plans, subscriptions, banks] = await Promise.all([
        tx.student.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        tx.plan.findMany({ where: { arenaId, active: true }, select: planSelect, orderBy: { name: 'asc' } }),
        tx.studentSubscription.findMany({ where: { arenaId, status: 'ACTIVE' }, select: { id: true, startedAt: true, dueDay: true, monthlyPriceCents: true, classesPerMonth: true, student: { select: { name: true } }, plan: { select: { name: true } } }, orderBy: { dueDay: 'asc' } }),
        tx.bankAccount.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      ]);
      data.students = students; data.plans = plans.map(plan => ({ ...plan, teacherAssignments: [] })); data.subscriptions = subscriptions.map(row => ({ ...row, startedAt: row.startedAt.toISOString() })); data.bankAccounts = banks;
    }
    if (workspace === 'payroll') {
      const current = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7);
      data.referenceMonth = month && /^(?:20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(month) ? month : current;
      const [members, rows] = await Promise.all([
        tx.arenaMember.findMany({ where: { arenaId }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: 'asc' } } }),
        tx.employeePayrollEntry.findMany({ where: { arenaId, referenceMonth: data.referenceMonth }, include: { financialEntry: { select: { updatedAt: true, amountCents: true, status: true, dueDate: true, paidAt: true, settlements: { select: { amountCents: true, interestCents: true, discountCents: true } } } } }, orderBy: { employeeName: 'asc' } }),
      ]);
      data.employees = members.map(member => member.user);
      data.payroll = rows.map(row => ({ id: row.id, updatedAt: row.updatedAt.toISOString(), userId: row.userId, employeeName: row.employeeName, referenceMonth: row.referenceMonth, notes: row.notes,
        fixedSalaryCents: row.fixedSalaryCents, monthlyMinutes: row.monthlyMinutes, overtimeMinutes: row.overtimeMinutes, overtimePercentage: row.overtimePercentage, nightMinutes: row.nightMinutes, nightOvertimeMinutes: row.nightOvertimeMinutes, nightPercentage: row.nightPercentage, nightHourMinutes: row.nightHourMinutes, bonusCents: row.bonusCents, benefitsCents: row.benefitsCents, discountCents: row.discountCents, advanceCents: row.advanceCents,
        financialEntry: row.financialEntry ? { ...row.financialEntry, updatedAt: row.financialEntry.updatedAt.toISOString(), dueDate: row.financialEntry.dueDate?.toISOString().slice(0, 10) ?? '', paidAt: row.financialEntry.paidAt?.toISOString().slice(0, 10) ?? '' } : null }));
    }
  });
  return financeWorkspacePageSchema.parse(data);
}
