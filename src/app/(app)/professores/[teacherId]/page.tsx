import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { assignTeacherPlanStudentAction, createTeacherPlanWithPriceAction, removeTeacherPlanStudentAction } from "@/lib/actions/academy";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export default async function TeacherDetailPage({ params }: { params: { teacherId: string } }) {
  const auth = await requireModuleView("teachers");
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
  const [teacher, students] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: params.teacherId, arenaId: auth.arenaId },
      include: {
        planAssignments: {
          where: { active: true },
          include: {
            plan: {
              include: {
                subscriptions: {
                  where: { status: "ACTIVE" },
                  include: { student: { select: { id: true, name: true, remainingClasses: true } } }
                },
                financialEntries: { where: { status: { not: "VOIDED" } }, select: { counterpartyName: true, status: true, dueDate: true }, orderBy: { dueDate: "desc" } }
              }
            }
          }
        },
        studentAssignments: { where: { active: true }, include: { student: { select: { id: true, name: true, remainingClasses: true } } } },
        lessons: { where: { scheduledAt: { gte: monthStart, lte: monthEnd } }, include: { attendances: true } }
      }
    }),
    prisma.student.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);
  if (!teacher) notFound();
  const planStudentIds = new Set(teacher.planAssignments.flatMap(({ plan }) => plan.subscriptions.map((subscription) => subscription.studentId)));
  const availableStudents = students.filter((student) => !planStudentIds.has(student.id));
  const totalAttendances = teacher.lessons.reduce((total, lesson) => total + lesson.attendances.length, 0);
  const completedLessons = teacher.lessons.filter((lesson) => lesson.status === "COMPLETED").length;

  return <div className="stack-md workspace-page teacher-detail-page">
    <header className="page-header"><div><Link href="/professores" className="back-link">← Professores</Link><p className="eyebrow">PROFESSOR</p><h1>{teacher.name}</h1></div><span className={teacher.active ? "status-badge status-active" : "status-badge"}>{teacher.active ? "Ativo" : "Inativo"}</span></header>
    <section className="teacher-detail-metrics"><article><span>Planos ativos</span><strong>{teacher.planAssignments.length}</strong></article><article><span>Alunos ativos</span><strong>{planStudentIds.size}</strong></article><article><span>Aulas concluídas no mês</span><strong>{completedLessons}</strong></article><article><span>Presenças no mês</span><strong>{totalAttendances}</strong></article></section>
    <div className="teacher-detail-grid">
      <section className="section-card teacher-detail-section"><header><h2>Planos e preços</h2></header><div className="teacher-plan-cards">{teacher.planAssignments.map(({ plan }) => <article key={plan.id}><strong>{plan.name}</strong><span>{plan.classesPerMonth} aulas/mês</span><b>{money(plan.monthlyPriceCents)}</b><small>{plan.subscriptions.length} aluno(s) ativo(s)</small></article>)}{!teacher.planAssignments.length ? <p className="muted">Nenhum plano vinculado.</p> : null}</div><SafeActionForm action={createTeacherPlanWithPriceAction} className="teacher-inline-form" resetOnSuccess successMessage="Plano criado e vinculado ao professor."><input type="hidden" name="teacherId" value={teacher.id} /><label>Plano<input name="name" required placeholder="Ex.: 2x por semana" /></label><label>Aulas/mês<input name="classesPerMonth" type="number" min="1" max="31" defaultValue="8" /></label><label>Preço mensal<input name="monthlyPrice" inputMode="decimal" required placeholder="0,00" /></label><SubmitButton label="Criar plano" pendingLabel="Salvando..." className="button button-primary" /></SafeActionForm></section>
      <section className="section-card teacher-detail-section"><header><h2>Adicionar aluno ao plano</h2></header><SafeActionForm action={assignTeacherPlanStudentAction} className="teacher-inline-form" successMessage="Aluno vinculado ao plano."><input type="hidden" name="teacherId" value={teacher.id} /><label>Plano<select name="planId" defaultValue="" required><option value="" disabled>Selecione</option>{teacher.planAssignments.map(({ plan }) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label>Aluno<select name="studentId" defaultValue="" required><option value="" disabled>Selecione</option>{availableStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><SubmitButton label="Adicionar aluno" pendingLabel="Salvando..." className="button button-primary" /></SafeActionForm></section>
    </div>
    <section className="section-card teacher-detail-section"><header><h2>Alunos ativos</h2></header><div className="teacher-student-plan-list">{teacher.planAssignments.flatMap(({ plan }) => plan.subscriptions.map((subscription) => { const payment = plan.financialEntries.find((entry) => entry.counterpartyName === subscription.student.name); const paid = payment?.status === "PAID"; return <article key={subscription.id}><div><strong>{subscription.student.name}</strong><span>{plan.name}</span></div><span className={paid ? "status-badge status-active" : "status-badge status-pending"}>{paid ? "Pago" : "Em aberto"}</span><strong>Saldo de aulas: {subscription.student.remainingClasses}</strong><SafeActionForm action={removeTeacherPlanStudentAction}><input type="hidden" name="teacherId" value={teacher.id} /><input type="hidden" name="planId" value={plan.id} /><input type="hidden" name="studentId" value={subscription.student.id} /><SubmitButton label="Remover" pendingLabel="Removendo..." className="button button-danger button-small" /></SafeActionForm></article>; }))}{!planStudentIds.size ? <p className="muted">Nenhum aluno ativo nos planos deste professor.</p> : null}</div></section>
    <section className="section-card teacher-detail-section teacher-month-report"><header><h2>Relatório do mês</h2><span>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(monthStart)}</span></header><div><strong>{completedLessons} aulas concluídas</strong><span>{teacher.lessons.length - completedLessons} aulas programadas</span><span>{totalAttendances} presenças registradas</span></div><Link href={`/relatorios/planos?professorId=${teacher.id}`} className="button">Abrir relatório completo</Link></section>
  </div>;
}
