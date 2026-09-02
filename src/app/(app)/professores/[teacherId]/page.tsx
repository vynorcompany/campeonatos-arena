import Link from "next/link";
import { notFound } from "next/navigation";
import { TeacherMonthlyReport } from "@/components/teachers/teacher-monthly-report";
import { TeacherClassGroupsPanel } from "@/components/teachers/teacher-class-groups-panel";
import { TeacherPlanEnrollmentForm } from "@/components/teachers/teacher-plan-enrollment-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  archiveTeacherAction,
  copyTeacherPlansAction,
  createTeacherPlanWithPriceAction,
  deleteTeacherAction,
  removeTeacherPlanStudentAction,
  updateTeacherPlanWithPriceAction,
} from "@/lib/actions/academy";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
const moneyInput = (value: number) =>
  (value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const [teacher, clients, teachers] = await Promise.all([
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
    prisma.teacher.findMany({
      where: {
        arenaId: auth.arenaId,
        active: true,
        NOT: { id: params.teacherId },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!teacher) notFound();
  const activePlanId = teacher.planAssignments.some(
    ({ plan }) => plan.id === searchParams?.planId,
  )
    ? searchParams?.planId!
    : teacher.planAssignments[0]?.plan.id;
  const activePlan = teacher.planAssignments.find(
    ({ plan }) => plan.id === activePlanId,
  )?.plan;
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
            {teacher.active ? "● Ativo" : "Inativo"}
          </span>
          <details className="teacher-actions-menu">
            <summary>
              Ações <span aria-hidden="true">⌄</span>
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
            ▤
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
            ♧
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
            ◇
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
            ▣
          </span>
          <div>
            <span>Presenças no mês</span>
            <strong>{totalAttendances}</strong>
          </div>
        </article>
      </section>
      {tab === "plans" ? (
        <div className="teacher-detail-grid">
          <section className="section-card teacher-detail-section">
            <header>
              <h2>Planos e preços</h2>
            </header>
            <div className="teacher-plan-cards">
              {teacher.planAssignments.map(({ plan }) => (
                <Link
                  key={plan.id}
                  href={tabHref("plans", plan.id)}
                  className={plan.id === activePlanId ? "is-selected" : ""}
                >
                  <strong>{plan.name}</strong>
                  <span>{plan.classesPerMonth} aulas/mês</span>
                  <b>{money(plan.monthlyPriceCents)}</b>
                  <small>{plan.subscriptions.length} aluno(s) ativo(s)</small>
                </Link>
              ))}
              {!teacher.planAssignments.length ? (
                <p className="muted">Nenhum plano vinculado.</p>
              ) : null}
            </div>
            <SafeActionForm
              action={createTeacherPlanWithPriceAction}
              className="teacher-inline-form"
              resetOnSuccess
              successMessage="Plano criado e vinculado ao professor."
            >
              <input type="hidden" name="teacherId" value={teacher.id} />
              <label>
                Plano
                <input name="name" required placeholder="Ex.: 2x por semana" />
              </label>
              <label>
                Aulas/mês
                <input
                  name="classesPerMonth"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue="8"
                />
              </label>
              <label>
                Preço mensal
                <input
                  name="monthlyPrice"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                />
              </label>
              <SubmitButton
                label="Criar plano"
                pendingLabel="Salvando..."
                className="button button-primary"
              />
            </SafeActionForm>
            {teachers.length ? (
              <SafeActionForm
                action={copyTeacherPlansAction}
                className="teacher-copy-plans"
                successMessage="Planos copiados."
              >
                <input
                  type="hidden"
                  name="sourceTeacherId"
                  value={teacher.id}
                />
                <label>
                  Copiar planos para
                  <select name="targetTeacherId" defaultValue="">
                    <option value="" disabled>
                      Selecione o professor
                    </option>
                    {teachers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <SubmitButton
                  label="Copiar planos"
                  pendingLabel="Copiando..."
                  className="button button-secondary"
                />
              </SafeActionForm>
            ) : null}
          </section>
          {activePlan ? (
            <section className="section-card teacher-detail-section">
              <header>
                <div>
                  <h2>{activePlan.name}</h2>
                  <span>{activePlan.subscriptions.length} alunos</span>
                </div>
                <details className="teacher-plan-edit">
                  <summary>Editar plano</summary>
                  <SafeActionForm
                    action={updateTeacherPlanWithPriceAction}
                    className="teacher-plan-edit-form"
                    successMessage="Plano atualizado. Os alunos atuais mantêm seus valores contratados."
                  >
                    <input type="hidden" name="teacherId" value={teacher.id} />
                    <input type="hidden" name="planId" value={activePlan.id} />
                    <label>Nome do plano<input name="name" required minLength={2} defaultValue={activePlan.name} /></label>
                    <label>Aulas/mês<input name="classesPerMonth" type="number" min="1" max="31" defaultValue={activePlan.classesPerMonth} /></label>
                    <label>Preço mensal<input name="monthlyPrice" inputMode="decimal" required defaultValue={moneyInput(activePlan.monthlyPriceCents)} /></label>
                    <SubmitButton label="Salvar plano" pendingLabel="Salvando..." className="button button-primary button-small" />
                  </SafeActionForm>
                </details>
              </header>
              <div className="teacher-student-plan-list">
                {activePlan.subscriptions.map((subscription) => (
                  <article key={subscription.id}>
                    <strong>{subscription.student.name}</strong>
                    <span>
                      Saldo de aulas: {subscription.student.remainingClasses}
                    </span>
                    <SafeActionForm action={removeTeacherPlanStudentAction}>
                      <input
                        type="hidden"
                        name="teacherId"
                        value={teacher.id}
                      />
                      <input
                        type="hidden"
                        name="planId"
                        value={activePlan.id}
                      />
                      <input
                        type="hidden"
                        name="studentId"
                        value={subscription.student.id}
                      />
                      <SubmitButton
                        label="Remover"
                        pendingLabel="Removendo..."
                        className="button button-danger button-small"
                      />
                    </SafeActionForm>
                  </article>
                ))}
              </div>
              <TeacherPlanEnrollmentForm
                teacherId={teacher.id}
                plans={[{ id: activePlan.id, name: activePlan.name }]}
                clients={clients}
              />
            </section>
          ) : null}
        </div>
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
          />
          <div className="teacher-student-plan-list">
            {teacher.planAssignments.flatMap(({ plan }) =>
              plan.subscriptions.map((subscription) => {
                const payment = plan.financialEntries.find(
                  (entry) =>
                    entry.counterpartyName === subscription.student.name,
                );
                const paid = payment?.status === "PAID";
                return (
                  <article key={subscription.id}>
                    <div>
                      <strong>{subscription.student.name}</strong>
                      <Link href={tabHref("plans", plan.id)}>{plan.name}</Link>
                    </div>
                    <span
                      className={
                        paid
                          ? "status-badge status-active"
                          : "status-badge status-pending"
                      }
                    >
                      {paid ? "Pago" : "Em aberto"}
                    </span>
                    <strong>
                      Saldo de aulas: {subscription.student.remainingClasses}
                    </strong>
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
          groups={teacher.classGroups}
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
