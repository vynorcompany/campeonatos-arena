import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { StudentActionsCell } from "@/components/students/student-actions-cell";
import { ClassGroupWorkspace } from "@/components/teachers/class-group-workspace";
import {
  addStudentCreditsAction,
  completeLessonAction,
  createLessonAction,
  deleteLessonAction,
  createStudentAction
} from "@/lib/actions/academy";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function attendanceRate(student: { attendedClasses: number; missedClasses: number }) {
  const total = student.attendedClasses + student.missedClasses;
  if (!total) {
    return "Sem histórico";
  }

  return `${Math.round((student.attendedClasses / total) * 100)}%`;
}

export default async function LessonsPage() {
  const auth = await requireModuleView("lessons");
  const [students, teachers, lessons, players, plans, classGroups, classGroupRequests] = await Promise.all([
    prisma.student.findMany({
      where: { arenaId: auth.arenaId },
      include: {
        player: true
      },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    }),
    prisma.teacher.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.lesson.findMany({
      where: { arenaId: auth.arenaId },
      include: {
        teacher: true,
        attendances: {
          include: {
            student: true
          },
          orderBy: {
            student: {
              name: "asc"
            }
          }
        }
      },
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      take: 16
    }),
    prisma.player.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.plan.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.classGroup.findMany({
      where: { arenaId: auth.arenaId, active: true },
      include: { teacher: { select: { name: true } }, enrollments: { where: { status: "ACTIVE" }, select: { id: true } }, schedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] } },
      orderBy: { name: "asc" }
    }),
    prisma.classGroupRequest.findMany({ where: { arenaId: auth.arenaId, status: "PENDING" }, include: { student: { select: { name: true } }, classGroup: { include: { plans: { include: { plan: { select: { id: true, name: true } } } } } } }, orderBy: { createdAt: "asc" } })
  ]);

  const activeStudents = students.filter((student) => student.active);
  const linkedPlayerIds = new Set(students.map((student) => student.playerId).filter(Boolean));
  const availablePlayers = players.filter((player) => !linkedPlayerIds.has(player.id));
  const scheduledLessons = lessons.filter((lesson) => lesson.status !== "COMPLETED");
  const completedLessons = lessons.filter((lesson) => lesson.status === "COMPLETED");

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Aulas</p>
          <h1>Controle de aulas</h1>
          <p className="muted">
            Cadastre alunos, registre aulas, acompanhe presenças e veja quantas aulas cada aluno ainda possui.
          </p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{students.length}</strong>
          <span>alunos cadastrados</span>
        </div>
        <div className="stat-card">
          <strong>{scheduledLessons.length}</strong>
          <span>aulas em aberto</span>
        </div>
        <div className="stat-card">
          <strong>{students.reduce((total, student) => total + student.remainingClasses, 0)}</strong>
          <span>aulas restantes vendidas</span>
        </div>
      </div>

      <ClassGroupWorkspace teachers={teachers.map((teacher) => ({ id: teacher.id, name: teacher.name }))} plans={plans} groups={classGroups} requests={classGroupRequests} />

      <SectionCard id="cadastro" title="Cadastrar aluno" description="Use este cadastro para controlar pacotes, frequência e histórico de aulas.">
        <SafeActionForm action={createStudentAction} className="grid-form" resetOnSuccess successMessage="Aluno salvo.">
          <div className="field form-full">
            <label htmlFor="student-player">Vincular a um jogador existente</label>
            <select id="student-player" name="playerId" defaultValue="">
              <option value="">Cadastrar aluno sem vínculo com jogador</option>
              {availablePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="student-name">Nome</label>
            <input id="student-name" name="name" type="text" placeholder="Ex.: Ana Souza" />
          </div>
          <div className="field">
            <label htmlFor="student-phone">Telefone</label>
            <input id="student-phone" name="phone" type="text" placeholder="(00) 00000-0000" />
          </div>
          <div className="field">
            <label htmlFor="student-email">E-mail</label>
            <input id="student-email" name="email" type="email" />
          </div>
          <div className="field">
            <label htmlFor="student-credits">Aulas iniciais</label>
            <input id="student-credits" name="remainingClasses" type="number" min="0" defaultValue="0" />
          </div>
          <div className="field form-full">
            <label htmlFor="student-notes">Observações</label>
            <input id="student-notes" name="notes" type="text" placeholder="Preferências, nível, restrições..." />
          </div>
          <div className="field field-submit">
            <SubmitButton label="Cadastrar aluno" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard id="registro" title="Registrar aula" description="Selecione professor, horário e alunos. Ao concluir a aula, o sistema baixa uma aula dos presentes.">
        <SafeActionForm action={createLessonAction} className="grid-form" resetOnSuccess successMessage="Aula registrada.">
          <div className="field">
            <label htmlFor="lesson-title">Nome da aula</label>
            <input id="lesson-title" name="title" type="text" placeholder="Ex.: Aula em dupla" required />
          </div>
          <div className="field">
            <label htmlFor="lesson-teacher">Professor</label>
            <select id="lesson-teacher" name="teacherId" defaultValue="">
              <option value="">Sem professor definido</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lesson-date">Data e horário</label>
            <input id="lesson-date" name="scheduledAt" type="datetime-local" />
          </div>
          <div className="field">
            <label htmlFor="lesson-duration">Duração</label>
            <input id="lesson-duration" name="durationMinutes" type="number" min="15" step="15" defaultValue="60" />
          </div>
          <label className="check-option lesson-paid-toggle">
            <input name="isPaid" type="checkbox" />
            <span>Registrar como aula paga</span>
          </label>
          <div className="field">
            <label htmlFor="lesson-price">Valor da aula</label>
            <input id="lesson-price" name="price" type="text" placeholder="120,00" />
          </div>
          <div className="field">
            <label htmlFor="lesson-payment-method">Pagamento</label>
            <select id="lesson-payment-method" name="paymentMethod" defaultValue="PIX">
              <option value="PIX">Pix</option>
              <option value="CREDIT_CARD">Cartão de crédito</option>
              <option value="DEBIT_CARD">Cartão de débito</option>
              <option value="CASH">Dinheiro</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>
          <div className="field form-full">
            <label>Alunos da aula</label>
            <div className="check-grid">
              {activeStudents.map((student) => (
                <label key={student.id} className="check-option">
                  <input type="checkbox" name="studentIds" value={student.id} />
                  <span>{student.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field form-full">
            <label htmlFor="lesson-notes">Observações</label>
            <input id="lesson-notes" name="notes" type="text" />
          </div>
          <div className="field field-submit">
            <SubmitButton label="Registrar aula" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Alunos e créditos" description="Acompanhe aulas restantes, presenças e frequência de cada aluno.">
        <table className="data-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Aulas restantes</th>
              <th>Presenças</th>
              <th>Faltas</th>
              <th>Frequência</th>
              <th>Adicionar aulas</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  <StudentActionsCell
                    studentId={student.id}
                    name={student.name}
                    phone={student.phone}
                    email={student.email}
                    remainingClasses={student.remainingClasses}
                    notes={student.notes}
                    linkedPlayerName={student.player?.name}
                  />
                </td>
                <td>{student.remainingClasses}</td>
                <td>{student.attendedClasses}</td>
                <td>{student.missedClasses}</td>
                <td>{attendanceRate(student)}</td>
                <td>
                  <SafeActionForm action={addStudentCreditsAction} className="inline-form" successMessage="Aulas adicionadas.">
                    <input type="hidden" name="studentId" value={student.id} />
                    <input name="quantity" type="number" min="1" defaultValue="1" />
                    <SubmitButton label="Adicionar" pendingLabel="..." className="button" />
                  </SafeActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Histórico e conclusão de aulas" description="Marque faltas antes de concluir. Alunos presentes consomem uma aula do pacote.">
        <div className="lesson-list">
          {lessons.map((lesson) => (
            <article key={lesson.id} className="lesson-item">
              <div>
                <span className="eyebrow">{lesson.status === "COMPLETED" ? "Concluída" : "Em aberto"}</span>
                <h3>{lesson.title}</h3>
                <p className="muted">
                  {formatDate(lesson.scheduledAt)} - {lesson.teacher?.name ?? "Professor não definido"} - {lesson.durationMinutes} min
                </p>
                <p className="muted">
                  {lesson.attendances.map((attendance) => `${attendance.student.name} (${attendance.status === "ABSENT" ? "falta" : "presente"})`).join(", ") || "Sem alunos"}
                </p>
              </div>
              {lesson.status !== "COMPLETED" ? (
                <SafeActionForm action={completeLessonAction} className="lesson-complete-form" successMessage="Aula concluída.">
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <div className="check-grid check-grid-compact">
                    {lesson.attendances.map((attendance) => (
                      <label key={attendance.id} className="check-option">
                        <input type="checkbox" name="absentStudentIds" value={attendance.studentId} />
                        <span>Falta: {attendance.student.name}</span>
                      </label>
                    ))}
                  </div>
                  <SubmitButton label="Concluir aula" pendingLabel="Concluindo..." className="button button-primary" />
                </SafeActionForm>
              ) : null}
              <SafeActionForm
                action={deleteLessonAction}
                className="lesson-complete-form"
                successMessage="Aula excluida."
                confirmKeyword="EXCLUIR"
                confirmPrompt="Digite EXCLUIR para remover esta aula permanentemente."
              >
                <input type="hidden" name="lessonId" value={lesson.id} />
                <SubmitButton label="Excluir aula" pendingLabel="Excluindo..." className="button button-danger" />
              </SafeActionForm>
            </article>
          ))}
          {!lessons.length ? <p className="muted">Nenhuma aula registrada ainda.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
