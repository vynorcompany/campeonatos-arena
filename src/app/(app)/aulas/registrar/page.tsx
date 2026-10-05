import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { completeLessonAction, createLessonAction, deleteLessonAction } from "@/lib/actions/academy";
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

export default async function RegisterLessonPage() {
  const auth = await requireModuleView("lessons");
  const [students, teachers, lessons] = await Promise.all([
    prisma.student.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.teacher.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.lesson.findMany({
      where: { arenaId: auth.arenaId },
      include: {
        teacher: true,
        attendances: { include: { student: true }, orderBy: { student: { name: "asc" } } }
      },
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      take: 16
    })
  ]);

  return (
    <div className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Aulas</p>
          <h1>Registrar aula</h1>
          <p className={viewStyles.muted}>Registre aulas, marque pagamento avulso e conclua presença ou falta dos alunos.</p>
        </div>
      </header>

      <SectionCard title="Nova aula" description="Se a aula for paga, o valor já entra automaticamente no financeiro.">
        <SafeActionForm action={createLessonAction} className={viewStyles.grid_form} resetOnSuccess successMessage="Aula registrada.">
          <div className={viewStyles.field}>
            <label htmlFor="lesson-title">Nome da aula</label>
            <input id="lesson-title" name="title" type="text" placeholder="Ex.: Aula em dupla" required />
          </div>
          <div className={viewStyles.field}>
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
          <div className={viewStyles.field}>
            <label htmlFor="lesson-date">Data e horário</label>
            <input id="lesson-date" name="scheduledAt" type="datetime-local" />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="lesson-duration">Duração</label>
            <input id="lesson-duration" name="durationMinutes" type="number" min="15" step="15" defaultValue="60" />
          </div>
          <label className={viewStyles.check_option}>
            <input name="isPaid" type="checkbox" />
            <span>Registrar como aula paga</span>
          </label>
          <div className={viewStyles.field}>
            <label htmlFor="lesson-price">Valor da aula</label>
            <input id="lesson-price" name="price" type="text" placeholder="120,00" />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="lesson-payment-method">Pagamento</label>
            <select id="lesson-payment-method" name="paymentMethod" defaultValue="PIX">
              <option value="PIX">Pix</option>
              <option value="CREDIT_CARD">Cartão de crédito</option>
              <option value="DEBIT_CARD">Cartão de débito</option>
              <option value="CASH">Dinheiro</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>
          <div className={viewStyles.field_form_full}>
            <label>Alunos da aula</label>
            <div className={viewStyles.check_grid}>
              {students.map((student) => (
                <label key={student.id} className={viewStyles.check_option_2}>
                  <input type="checkbox" name="studentIds" value={student.id} />
                  <span>{student.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={viewStyles.field_form_full}>
            <label htmlFor="lesson-notes">Observações</label>
            <input id="lesson-notes" name="notes" type="text" />
          </div>
          <div className={viewStyles.field_field_submit}>
            <SubmitButton label="Registrar aula" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Histórico e conclusão" description="Marque faltas antes de concluir. Alunos presentes consomem uma aula do pacote.">
        <div className={viewStyles.lesson_list}>
          {lessons.map((lesson) => (
            <article key={lesson.id} className={viewStyles.lesson_item}>
              <div>
                <span className={viewStyles.eyebrow}>{lesson.status === "COMPLETED" ? "Concluída" : "Em aberto"}</span>
                <h3>{lesson.title}</h3>
                <p className={viewStyles.muted}>
                  {formatDate(lesson.scheduledAt)} - {lesson.teacher?.name ?? "Professor não definido"} - {lesson.durationMinutes} min
                </p>
                <p className={viewStyles.muted}>
                  {lesson.attendances.map((attendance) => `${attendance.student.name} (${attendance.status === "ABSENT" ? "falta" : "presente"})`).join(", ") || "Sem alunos"}
                </p>
              </div>
              {lesson.status !== "COMPLETED" ? (
                <SafeActionForm action={completeLessonAction} className={viewStyles.lesson_complete_form} successMessage="Aula concluída.">
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <div className={viewStyles.check_grid_check_grid_compact}>
                    {lesson.attendances.map((attendance) => (
                      <label key={attendance.id} className={viewStyles.check_option_2}>
                        <input type="checkbox" name="absentStudentIds" value={attendance.studentId} />
                        <span>Falta: {attendance.student.name}</span>
                      </label>
                    ))}
                  </div>
                  <SubmitButton label="Concluir aula" pendingLabel="Concluindo..." className={viewStyles.button_button_primary} />
                </SafeActionForm>
              ) : null}
              <SafeActionForm
                action={deleteLessonAction}
                className={viewStyles.lesson_complete_form}
                successMessage="Aula excluida."
                confirmKeyword="EXCLUIR"
                confirmPrompt="Digite EXCLUIR para remover esta aula permanentemente."
              >
                <input type="hidden" name="lessonId" value={lesson.id} />
                <SubmitButton label="Excluir aula" pendingLabel="Excluindo..." className={viewStyles.button_button_danger} />
              </SafeActionForm>
            </article>
          ))}
          {!lessons.length ? <p className={viewStyles.muted}>Nenhuma aula registrada ainda.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
