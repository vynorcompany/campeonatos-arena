import { PaginatedList, PaginatedTableRows } from "@/components/ui/list-pagination";

import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { lessonCreditBalances } from "@/lib/academy/lesson-credits";
import { withArenaTransaction } from "@/lib/rls";
import { viewStyles } from "./page.utilities";
import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { StudentActionsCell } from "@/components/students/student-actions-cell";
import { addStudentCreditsAction, createStudentAction } from "@/lib/actions/academy";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";

function attendanceRate(student: { attendedClasses: number; missedClasses: number }) {
  const total = student.attendedClasses + student.missedClasses;
  return total ? `${Math.round((student.attendedClasses / total) * 100)}%` : "Sem histórico";
}

export default async function StudentsPage() {
  const auth = await requireModuleView("students");
  const prisma = arenaDatabase(auth.arenaId);
  const [students, players] = await Promise.all([
    prisma.student.findMany({
      where: { arenaId: auth.arenaId },
      include: { player: true },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    }),
    prisma.player.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    })
  ]);
  const paidCreditBalances = await withArenaTransaction(auth.arenaId, tx => lessonCreditBalances(tx, auth.arenaId, students.map(student => student.id)));
  for (const student of students) student.remainingClasses = paidCreditBalances.get(student.id) ?? student.remainingClasses;
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
        <table className={viewStyles.data_table}>
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
            <PaginatedTableRows>{students.map((student) => (
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
                  <SafeActionForm action={addStudentCreditsAction} className={viewStyles.inline_form} successMessage="Aulas adicionadas.">
                    <input type="hidden" name="studentId" value={student.id} />
                    <input name="quantity" type="number" min="1" defaultValue="1" aria-label={`Quantidade de aulas para ${student.name}`} />
                    <SubmitButton label="Adicionar" pendingLabel="..." className={viewStyles.button} />
                  </SafeActionForm>
                </td>
              </tr>
            ))}</PaginatedTableRows>
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
