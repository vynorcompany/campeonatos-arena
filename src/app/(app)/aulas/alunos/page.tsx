import { getAcademyPageData } from "@/lib/academy/page-data";


import { SmartEntitySelect } from "@/components/forms/smart-entity-select";


import { viewStyles } from "./page.utilities";
import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { StudentActionsCell } from "@/components/students/student-actions-cell";
import { addStudentCreditsAction, createStudentAction } from "@/lib/actions/academy";
import { requireModuleView } from "@/lib/auth/guards";


function attendanceRate(student: { attendedClasses: number; missedClasses: number }) {
  const total = student.attendedClasses + student.missedClasses;
  return total ? `${Math.round((student.attendedClasses / total) * 100)}%` : "Sem histórico";
}

export default async function StudentsPage() {
  const auth = await requireModuleView("students");
  const { students, playerOptions: players } = await getAcademyPageData(auth.arenaId, 'students');
  const linkedPlayerIds = new Set(students.map((student) => student.playerId).filter(Boolean));
  const availablePlayers = players.filter((player) => !linkedPlayerIds.has(player.id));

  return (
    <div className={viewStyles.stack_md}>
      <WorkspaceHeading title="Alunos" />

      <SectionCard title="Cadastrar aluno" className={viewStyles.panel} hideHeading>
        <SafeActionForm action={createStudentAction} className={viewStyles.grid_form} resetOnSuccess successMessage="Aluno salvo.">
          <div className={viewStyles.field_form_full}>
            <label htmlFor="student-player">Vincular a um jogador existente</label>
            <SmartEntitySelect createKind="client" label="Cliente" id="student-player" name="playerId" defaultValue="">
              <option value="">Sem vínculo com jogador</option>
              {availablePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </SmartEntitySelect>
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="student-name">Nome</label>
            <input id="student-name" name="name" type="text" placeholder="Ex.: Ana Souza" />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="student-phone">Telefone</label>
            <input id="student-phone" name="phone" type="text" placeholder="(00) 00000-0000" />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="student-email">E-mail</label>
            <input id="student-email" name="email" type="email" />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="student-credits">Aulas iniciais</label>
            <input id="student-credits" name="remainingClasses" type="number" min="0" defaultValue="0" />
          </div>
          <div className={viewStyles.field_form_full}>
            <label htmlFor="student-notes">Observações</label>
            <textarea id="student-notes" name="notes" rows={2} placeholder="Preferências, nível, restrições..." />
          </div>
          <div className={viewStyles.field_field_submit}>
            <SubmitButton label="Cadastrar aluno" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Alunos e créditos" className={viewStyles.panel} hideHeading>
        <table role="table" aria-label="Alunos e créditos" className={viewStyles.data_table}>
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
            <>{students.map((student) => (
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
                <td><span aria-hidden="true" className={viewStyles.mobile_column_label}>Aulas restantes</span>{student.remainingClasses}</td>
                <td><span aria-hidden="true" className={viewStyles.mobile_column_label}>Presenças</span>{student.attendedClasses}</td>
                <td><span aria-hidden="true" className={viewStyles.mobile_column_label}>Faltas</span>{student.missedClasses}</td>
                <td><span aria-hidden="true" className={viewStyles.mobile_column_label}>Frequência</span>{attendanceRate(student)}</td>
                <td>
                  <span aria-hidden="true" className={viewStyles.mobile_column_label}>Adicionar aulas</span>
                  <SafeActionForm action={addStudentCreditsAction} className={viewStyles.inline_form} successMessage="Aulas adicionadas.">
                    <input type="hidden" name="studentId" value={student.id} />
                    <input name="quantity" type="number" min="1" defaultValue="1" aria-label={`Quantidade de aulas para ${student.name}`} />
                    <SubmitButton label="Adicionar" pendingLabel="..." className={viewStyles.button} />
                  </SafeActionForm>
                </td>
              </tr>
            ))}</>
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
