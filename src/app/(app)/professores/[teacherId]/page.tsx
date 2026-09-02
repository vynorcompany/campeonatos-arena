import Link from "next/link";
import { notFound } from "next/navigation";
import { TeacherMonthlyReport } from "@/components/teachers/teacher-monthly-report";
import { TeacherClassGroupsPanel } from "@/components/teachers/teacher-class-groups-panel";
import { TeacherPlanEditor } from "@/components/teachers/teacher-plan-editor";
import { TeacherPlanCreateDialog } from "@/components/teachers/teacher-plan-create-dialog";
import { TeacherPlanEnrollmentForm } from "@/components/teachers/teacher-plan-enrollment-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
import {
  archiveTeacherAction,
  deleteTeacherAction,
  moveTeacherClassGroupStudentAction,
} from "@/lib/actions/academy";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
const inputDate = (value: Date) => value.toISOString().slice(0, 10);
type DetailQuery = {
  tab?: string;
  planId?: string;
  inicio?: string;
  fim?: string;
  status?: string;
  percentual?: string;
};

export default async function TeacherDetailPage({
  params,
  searchParams,
}: {
  params: { teacherId: string };
  searchParams?: DetailQuery;
}) {
  const auth = await requireModuleView("teachers");
  const tab =
    searchParams?.tab === "students" ||
    searchParams?.tab === "classes" ||
    searchParams?.tab === "report"
      ? searchParams.tab
      : "plans";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const reportStart = searchParams?.inicio
    ? new Date(`${searchParams.inicio}T00:00:00`)
    : monthStart;
  const reportEnd = searchParams?.fim
    ? new Date(`${searchParams.fim}T23:59:59`)
    : monthEnd;
  const [teacher, clients] = await Promise.all([
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
                  include: {
                    student: {
                      select: { id: true, name: true, remainingClasses: true },
                    },
                  },
                },
                financialEntries: {
                  where: {
                    status: { not: "VOIDED" },
                    OR: [
                      {
                        status: "PAID",
                        paidAt: { gte: reportStart, lte: reportEnd },
                      },
                      {
                        status: { not: "PAID" },
                        dueDate: { gte: reportStart, lte: reportEnd },
                      },
                    ],
                  },
                  select: {
                    id: true,
                    counterpartyName: true,
                    amountCents: true,
                    status: true,
                    paidAt: true,
                    dueDate: true,
                  },
                  orderBy: { dueDate: "desc" },
                },
              },
            },
          },
        },
        lessons: {
          where: { scheduledAt: { gte: monthStart, lte: monthEnd } },
          include: { attendances: true },
        },
        classGroups: {
          where: { active: true },
          include: {
            schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
            plans: { select: { planId: true } },
            enrollments: {
              where: { status: "ACTIVE" },
              include: { student: { select: { id: true, name: true } } },
              orderBy: { student: { name: "asc" } },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.player.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
  ]);
  if (!teacher) notFound();
  const classGroupsBySchedule = [...teacher.classGroups].sort(
    (first, second) => {
      const firstSchedule = first.schedules[0];
      const secondSchedule = second.schedules[0];
      const firstWeekday =
        firstSchedule?.weekday === 0 ? 7 : (firstSchedule?.weekday ?? 8);
      const secondWeekday =
        secondSchedule?.weekday === 0 ? 7 : (secondSchedule?.weekday ?? 8);

      return (
        firstWeekday - secondWeekday ||
        (firstSchedule?.startTime ?? "").localeCompare(
          secondSchedule?.startTime ?? "",
          "pt-BR",
        ) ||
        first.name.localeCompare(second.name, "pt-BR")
      );
    },
  );
  const planStudentIds = new Set(
    teacher.planAssignments.flatMap(({ plan }) =>
      plan.subscriptions.map((subscription) => subscription.studentId),
    ),
  );
  const totalAttendances = teacher.lessons.reduce(
    (total, lesson) => total + lesson.attendances.length,
    0,
  );
  const completedLessons = teacher.lessons.filter(
    (lesson) => lesson.status === "COMPLETED",
  ).length;
  const reportRows = teacher.planAssignments.flatMap(({ plan }) =>
    plan.financialEntries
      .filter((entry) =>
        searchParams?.status === "open"
          ? entry.status !== "PAID"
          : searchParams?.status === "paid"
            ? entry.status === "PAID"
            : true,
      )
      .map((entry) => ({
        id: entry.id,
        studentName: entry.counterpartyName || "Cliente não informado",
        planName: plan.name,
        amountCents: entry.amountCents,
        paidAt: entry.paidAt?.toISOString() ?? null,
        status: entry.status,
      })),
  );
  const percent = Math.max(
    0,
    Math.min(100, Number(searchParams?.percentual ?? 0) || 0),
  );
  const tabHref = (nextTab: string, planId?: string) =>
    `/professores/${teacher.id}?tab=${nextTab}${planId ? `&planId=${planId}` : ""}`;
  const initials = teacher.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`stack-md workspace-page teacher-detail-page ${tab === "students" ? "teacher-students-dashboard" : ""}`}
    >
      <header className="page-header teacher-detail-hero">
        <div>
          <Link href="/professores" className="back-link">
            ← Professores
          </Link>
          <div className="teacher-detail-identity">
            <span className="teacher-detail-avatar" aria-hidden="true">
              {initials}
            </span>
            <div>
              <p className="eyebrow">PROFESSOR</p>
              <h1>{teacher.name}</h1>
            </div>
          </div>
        </div>
        <div className="teacher-page-actions">
          <span
            className={
              teacher.active ? "status-badge status-active" : "status-badge"
            }
          >
            {teacher.active ? (
              <>
                <EventIcon name="check-circle" /> Ativo
              </>
            ) : (
              "Inativo"
            )}
          </span>
          <details className="teacher-actions-menu">
            <summary>
              Ações <EventIcon name="chevron-down" />
            </summary>
            <div className="teacher-actions-menu-content">
              {teacher.active ? (
                <SafeActionForm
                  action={archiveTeacherAction}
                  confirmKeyword="REMOVER"
                  confirmPrompt={`Desativar ${teacher.name}? O histórico de planos, aulas e turmas será preservado.`}
                  className="teacher-archive-form"
                >
                  <input type="hidden" name="teacherId" value={teacher.id} />
                  <SubmitButton
                    label="Desativar professor"
                    pendingLabel="Desativando..."
                    className="button button-small"
                  />
                </SafeActionForm>
              ) : (
                <SafeActionForm
                  action={deleteTeacherAction}
                  successHref="/professores"
                  confirmKeyword="EXCLUIR"
                  confirmPrompt={`Excluir ${teacher.name} definitivamente? Os vínculos de planos sem histórico serão removidos.`}
                  className="teacher-delete-form"
                >
                  <input type="hidden" name="teacherId" value={teacher.id} />
                  <SubmitButton
                    label="Excluir professor"
                    pendingLabel="Excluindo..."
                    className="button button-danger button-small"
                  />
                </SafeActionForm>
              )}
            </div>
          </details>
        </div>
      </header>
      <nav className="teacher-detail-tabs" aria-label="Painel do professor">
        <Link
          href={tabHref("plans")}
          className={tab === "plans" ? "is-active" : ""}
        >
          Planos e preços
        </Link>
        <Link
          href={tabHref("students")}
          className={tab === "students" ? "is-active" : ""}
        >
          Alunos ativos
        </Link>
        <Link
          href={tabHref("classes")}
          className={tab === "classes" ? "is-active" : ""}
        >
          Turmas
        </Link>
        <Link
          href={tabHref("report")}
          className={tab === "report" ? "is-active" : ""}
        >
          Relatório
        </Link>
      </nav>
      <section className="teacher-detail-metrics">
        <article>
          <span
            className="teacher-detail-metric-icon metric-blue"
            aria-hidden="true"
          >
            <EventIcon name="clipboard" />
          </span>
          <div>
            <span>Planos ativos</span>
            <strong>{teacher.planAssignments.length}</strong>
          </div>
        </article>
        <article>
          <span
            className="teacher-detail-metric-icon metric-blue"
            aria-hidden="true"
          >
            <EventIcon name="users" />
          </span>
          <div>
            <span>Alunos ativos</span>
            <strong>{planStudentIds.size}</strong>
          </div>
        </article>
        <article>
          <span
            className="teacher-detail-metric-icon metric-green"
            aria-hidden="true"
          >
            <EventIcon name="calendar" />
          </span>
          <div>
            <span>Aulas concluídas no mês</span>
            <strong>{completedLessons}</strong>
          </div>
        </article>
        <article>
          <span
            className="teacher-detail-metric-icon metric-purple"
            aria-hidden="true"
          >
            <EventIcon name="check-circle" />
          </span>
          <div>
            <span>Presenças no mês</span>
            <strong>{totalAttendances}</strong>
          </div>
        </article>
      </section>
      {tab === "plans" ? (
        <section className="section-card teacher-detail-section teacher-plans-panel">
            <header>
              <h2>Planos e preços</h2>
              <TeacherPlanCreateDialog teacherId={teacher.id} />
            </header>
            <div className="teacher-plan-cards">
              {teacher.planAssignments.map(({ plan }) => (
                <article key={plan.id}>
                  <div>
                    <strong>{plan.name}</strong>
                    <span>{plan.classesPerMonth} aulas/mês</span>
                    <b>{money(plan.monthlyPriceCents)}</b>
                    <small>{plan.subscriptions.length} aluno(s) ativo(s)</small>
                  </div>
                  <TeacherPlanEditor teacherId={teacher.id} plan={plan} />
                </article>
              ))}
              {!teacher.planAssignments.length ? (
                <p className="muted">Nenhum plano vinculado.</p>
              ) : null}
            </div>
        </section>
      ) : null}
      {tab === "students" ? (
        <section className="section-card teacher-detail-section teacher-active-students-panel">
          <header>
            <span className="teacher-active-students-icon" aria-hidden="true">
              ♧
            </span>
            <h2>Alunos ativos</h2>
          </header>
          <TeacherPlanEnrollmentForm
            variant="students"
            teacherId={teacher.id}
            plans={teacher.planAssignments.map(({ plan }) => ({
              id: plan.id,
              name: plan.name,
            }))}
            clients={clients}
            groups={classGroupsBySchedule.map((group) => ({
              id: group.id,
              name: group.name,
              planIds: group.plans.map(({ planId }) => planId),
            }))}
          />
          <div className="teacher-student-plan-list">
            {teacher.planAssignments.flatMap(({ plan }) =>
              plan.subscriptions.map((subscription) => {
                const payment = plan.financialEntries.find(
                  (entry) =>
                    entry.counterpartyName === subscription.student.name,
                );
                const paid = payment?.status === "PAID";
                const studentGroup = teacher.classGroups.find((group) =>
                  group.enrollments.some(
                    ({ student }) => student.id === subscription.student.id,
                  ),
                );
                return (
                  <article key={subscription.id}>
                    <details className="teacher-student-row-link">
                      <summary>
                        <span>
                          <strong>{subscription.student.name}</strong>
                          <small>
                            {plan.name} · {studentGroup?.name ?? "Sem turma"}
                          </small>
                        </span>
                        <em>
                          Saldo de aulas: {subscription.student.remainingClasses}
                        </em>
                      </summary>
                      <SafeActionForm
                        action={moveTeacherClassGroupStudentAction}
                        className="teacher-student-group-move"
                        successMessage="Turma do aluno atualizada."
                      >
                        <input type="hidden" name="teacherId" value={teacher.id} />
                        {studentGroup ? (
                          <input
                            type="hidden"
                            name="sourceClassGroupId"
                            value={studentGroup.id}
                          />
                        ) : null}
                        <input
                          type="hidden"
                          name="studentId"
                          value={subscription.student.id}
                        />
                        <label>
                          Turma
                          <select name="destinationClassGroupId" defaultValue="">
                            <option value="" disabled>
                              {studentGroup ? "Alterar turma" : "Atribuir turma"}
                            </option>
                            {classGroupsBySchedule
                              .filter((group) => group.id !== studentGroup?.id)
                              .filter((group) =>
                                group.plans.some(({ planId }) => planId === plan.id),
                              )
                              .map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <SubmitButton
                          label={studentGroup ? "Alterar" : "Atribuir"}
                          pendingLabel="Salvando..."
                          className="button button-small"
                        />
                      </SafeActionForm>
                    </details>
                    <Link
                      className="teacher-student-financial-link"
                      href={`/financeiro/contas-a-receber?name=${encodeURIComponent(subscription.student.name)}`}
                    >
                      <span
                        className={
                          paid
                            ? "status-badge status-active"
                            : "status-badge status-pending"
                        }
                      >
                        {paid ? "Mensalidade paga" : "Mensalidade em aberto"}
                      </span>
                    </Link>
                  </article>
                );
              }),
            )}
            {!planStudentIds.size ? (
              <div className="teacher-active-students-empty">
                <span aria-hidden="true">▤</span>
                <p className="muted">
                  Nenhum aluno ativo nos planos deste professor.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      {tab === "classes" ? (
        <TeacherClassGroupsPanel
          teacherId={teacher.id}
          plans={teacher.planAssignments.map(({ plan }) => ({
            id: plan.id,
            name: plan.name,
          }))}
          groups={classGroupsBySchedule}
        />
      ) : null}
      {tab === "report" ? (
        <section className="section-card teacher-detail-section">
          <header>
            <h2>Relatório</h2>
          </header>
          <form className="filter-bar-compact teacher-report-filters">
            <input type="hidden" name="tab" value="report" />
            <label>
              De
              <input
                type="date"
                name="inicio"
                defaultValue={inputDate(reportStart)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                name="fim"
                defaultValue={inputDate(reportEnd)}
              />
            </label>
            <label>
              Status
              <select
                name="status"
                defaultValue={searchParams?.status ?? "all"}
              >
                <option value="all">Todos</option>
                <option value="paid">Pagos</option>
                <option value="open">Em aberto</option>
              </select>
            </label>
            <label>
              % professor
              <input
                type="number"
                name="percentual"
                min="0"
                max="100"
                step="0.5"
                defaultValue={percent}
              />
            </label>
            <button type="submit" className="button button-primary">
              Aplicar
            </button>
          </form>
          <TeacherMonthlyReport rows={reportRows} initialPercent={percent} />
        </section>
      ) : null}
    </div>
  );
}
