"use client";

import { useMemo, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  adjustTeacherStudentBalanceAction,
  moveClassGroupStudentAction,
  notifyTeacherStudentAction,
  registerClassGroupMakeupAction,
} from "@/lib/actions/class-groups";

type ClassGroup = { id: string; name: string };
type Student = {
  id: string;
  name: string;
  remainingClasses: number;
  planName: string;
  classGroup: ClassGroup | null;
};

export function TeacherPortalStudentList({
  arenaSlug,
  students,
  classGroups,
}: {
  arenaSlug: string;
  students: Student[];
  classGroups: ClassGroup[];
}) {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("all");
  const plans = useMemo(
    () => [...new Set(students.map((student) => student.planName))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [students],
  );
  const visibleStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return students.filter((student) =>
      (plan === "all" || student.planName === plan) &&
      (!normalizedQuery || student.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery)),
    );
  }, [plan, query, students]);

  return <>
    <div className="teacher-portal-student-filters">
      <label><span>Buscar aluno</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome" type="search" /></label>
      <label><span>Plano</span><select value={plan} onChange={(event) => setPlan(event.target.value)}><option value="all">Todos os planos</option>{plans.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      <small>{visibleStudents.length} de {students.length} aluno(s)</small>
    </div>
    <div className="teacher-portal-student-list">
      {visibleStudents.map((student) => <details className="teacher-portal-student-row" key={student.id}>
        <summary><span><strong>{student.name}</strong><small>{student.planName} · saldo mensal: {student.remainingClasses} aula(s){student.classGroup ? ` · ${student.classGroup.name}` : ""}</small></span><i aria-hidden="true">⌄</i></summary>
        <div className="teacher-student-portal-actions">
          <SafeActionForm action={adjustTeacherStudentBalanceAction}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="studentId" value={student.id} /><label><span>Ajuste de saldo mensal</span><input name="classesDelta" type="number" min="-99" max="99" placeholder="Ex.: +1 ou -1" required /></label><label><span>Motivo</span><input name="reason" placeholder="Motivo do ajuste" required /></label><SubmitButton label="Salvar" pendingLabel="Salvando..." className="button button-small" /></SafeActionForm>
          <SafeActionForm action={notifyTeacherStudentAction}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="studentId" value={student.id} /><label><span>Aviso ao aluno</span><input name="message" placeholder="Escreva uma mensagem" required /></label><SubmitButton label="Enviar" pendingLabel="Enviando..." className="button button-small" /></SafeActionForm>
          {student.classGroup ? <><SafeActionForm action={moveClassGroupStudentAction}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="studentId" value={student.id} /><input type="hidden" name="sourceClassGroupId" value={student.classGroup.id} /><label><span>Nova turma</span><select name="destinationClassGroupId" defaultValue=""><option value="" disabled>Selecione uma turma</option>{classGroups.filter((group) => group.id !== student.classGroup?.id).map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><SubmitButton label="Transferir" pendingLabel="Movendo..." className="button button-small" /></SafeActionForm><SafeActionForm action={registerClassGroupMakeupAction} className="teacher-student-makeup-form"><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="studentId" value={student.id} /><input type="hidden" name="sourceClassGroupId" value={student.classGroup.id} /><label><span>Turma da reposição</span><select name="destinationClassGroupId" defaultValue=""><option value="" disabled>Selecione uma turma</option>{classGroups.filter((group) => group.id !== student.classGroup?.id).map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><label><span>Data da reposição</span><input name="scheduledFor" type="date" required /></label><SubmitButton label="Registrar" pendingLabel="Salvando..." className="button button-small" /></SafeActionForm></> : null}
        </div>
      </details>)}
      {!visibleStudents.length ? <p className="teacher-portal-empty-filter">Nenhum aluno corresponde à busca.</p> : null}
    </div>
  </>;
}
