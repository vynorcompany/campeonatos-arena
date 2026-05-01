import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { StudentActionsCell } from "@/components/students/student-actions-cell";
import { addStudentCreditsAction, createStudentAction } from "@/lib/actions/academy";
import { requireArenaAccess } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function attendanceRate(student: { attendedClasses: number; missedClasses: number }) {
  const total = student.attendedClasses + student.missedClasses;
  return total ? `${Math.round((student.attendedClasses / total) * 100)}%` : "Sem histórico";
}

export default async function StudentsPage() {
  const auth = await requireArenaAccess();
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
  const linkedPlayerIds = new Set(students.map((student) => student.playerId).filter(Boolean));
  const availablePlayers = players.filter((player) => !linkedPlayerIds.has(player.id));

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Aulas</p>
          <h1>Alunos</h1>
          <p className="muted">Cadastre alunos, vincule jogadores existentes e acompanhe créditos, presença e frequência.</p>
        </div>
      </header>

      <SectionCard title="Cadastrar aluno" description="Use este cadastro para controlar pacotes, frequência e histórico de aulas.">
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
    </div>
  );
}
