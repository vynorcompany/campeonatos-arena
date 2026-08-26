import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTeacherAction } from "@/lib/actions/academy";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export default async function TeachersPage() {
  const auth = await requireModuleView("teachers");
  const { start, end } = getMonthRange();
  const teachers = await prisma.teacher.findMany({
    where: {
      arenaId: auth.arenaId
    },
    include: {
      lessons: {
        where: {
          scheduledAt: {
            gte: start,
            lt: end
          }
        },
        include: {
          attendances: { include: { student: { include: { subscriptions: { where: { status: "ACTIVE" }, include: { plan: true } } } } } }
        },
        orderBy: {
          scheduledAt: "desc"
        }
      }
    },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });

  const completedThisMonth = teachers.reduce(
    (total, teacher) => total + teacher.lessons.filter((lesson) => lesson.status === "COMPLETED").length,
    0
  );
  const targetThisMonth = teachers.reduce((total, teacher) => total + teacher.monthlyTarget, 0);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Professores</p>
          <h1>Registro dos professores</h1>
          <p className="muted">
            Controle metas mensais, aulas realizadas, agenda do mês e produtividade de cada professor.
          </p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{teachers.length}</strong>
          <span>professores cadastrados</span>
        </div>
        <div className="stat-card">
          <strong>{completedThisMonth}</strong>
          <span>aulas realizadas no mês</span>
        </div>
        <div className="stat-card">
          <strong>{Math.max(0, targetThisMonth - completedThisMonth)}</strong>
          <span>aulas faltantes para a meta</span>
        </div>
      </div>

      <SectionCard title="Cadastrar professor" description="Defina contato e meta mensal para acompanhar a carga de aulas.">
        <SafeActionForm action={createTeacherAction} className="grid-form" resetOnSuccess successMessage="Professor salvo.">
          <div className="field">
            <label htmlFor="teacher-name">Nome</label>
            <input id="teacher-name" name="name" type="text" placeholder="Ex.: Carlos Lima" required />
          </div>
          <div className="field">
            <label htmlFor="teacher-phone">Telefone</label>
            <input id="teacher-phone" name="phone" type="text" />
          </div>
          <div className="field">
            <label htmlFor="teacher-email">E-mail</label>
            <input id="teacher-email" name="email" type="email" />
          </div>
          <div className="field">
            <label htmlFor="teacher-target">Meta mensal de aulas</label>
            <input id="teacher-target" name="monthlyTarget" type="number" min="0" defaultValue="0" />
          </div>
          <div className="field form-full">
            <label htmlFor="teacher-notes">Observações</label>
            <input id="teacher-notes" name="notes" type="text" placeholder="Disponibilidade, especialidades, observações internas..." />
          </div>
          <div className="field field-submit">
            <SubmitButton label="Cadastrar professor" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Resumo mensal" description="Veja rapidamente quem já bateu a meta e quem ainda precisa completar aulas neste mês.">
        <div className="teacher-grid">
          {teachers.map((teacher) => {
            const completed = teacher.lessons.filter((lesson) => lesson.status === "COMPLETED").length;
            const scheduled = teacher.lessons.filter((lesson) => lesson.status !== "COMPLETED").length;
            const remaining = Math.max(0, teacher.monthlyTarget - completed);
            const progress = teacher.monthlyTarget ? Math.min(100, Math.round((completed / teacher.monthlyTarget) * 100)) : 0;
            const students = Array.from(new Map(teacher.lessons.flatMap((lesson) => lesson.attendances.map((attendance) => [attendance.student.id, attendance.student] as const))).values());
            const plans = [...new Set(students.flatMap((student) => student.subscriptions.map((subscription) => subscription.plan.name)))];

            return (
              <article className="teacher-card" key={teacher.id}>
                <div className="match-card-top">
                  <div>
                    <span className="eyebrow">{teacher.active ? "Ativo" : "Inativo"}</span>
                    <h3>{teacher.name}</h3>
                  </div>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-bar" aria-hidden="true">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="teacher-metrics">
                  <span>{completed} realizadas</span>
                  <span>{scheduled} agendadas</span>
                  <span>{remaining} faltam</span>
                </div>
                <p className="muted">{students.length} aluno(s) · {plans.join(" · ") || "Sem plano vinculado"}</p>
                <p className="muted">{teacher.phone || teacher.email || "Sem contato cadastrado"}</p>
              </article>
            );
          })}
          {!teachers.length ? <p className="muted">Nenhum professor cadastrado ainda.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
