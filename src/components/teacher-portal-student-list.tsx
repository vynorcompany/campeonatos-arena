"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./teacher-portal-student-list.utilities";

import { useMemo, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { adjustTeacherStudentBalanceAction, moveClassGroupStudentAction, notifyTeacherStudentAction } from "@/lib/actions/class-groups";

type ClassGroup = { id: string; name: string };
type Student = { id: string; name: string; remainingClasses: number; initialMonthlyClasses: number; planName: string; classGroup: ClassGroup | null };
type StudentAction = "balance" | "notice" | "class";

function StudentCard({ arenaSlug, student, classGroups }: { arenaSlug: string; student: Student; classGroups: ClassGroup[] }) {
  const [action, setAction] = useState<StudentAction>("balance");
  const [notice, setNotice] = useState("");
  return <details className={viewStyles.teacher_portal_student_row}>
    <summary><span><strong>{student.name}</strong><small>{student.planName} · {student.remainingClasses}/{student.initialMonthlyClasses} aulas neste mês</small></span><i aria-hidden="true">⌄</i></summary>
    <div className={viewStyles.teacher_student_workspace}>
      <nav aria-label={`Ações para ${student.name}`}><button className={cx(action === "balance" ? "active" : "")} onClick={() => setAction("balance")} type="button">Saldo</button><button className={cx(action === "notice" ? "active" : "")} onClick={() => setAction("notice")} type="button">Aviso</button>{student.classGroup ? <button className={cx(action === "class" ? "active" : "")} onClick={() => setAction("class")} type="button">Turma</button> : null}</nav>
      {action === "balance" ? <section className={viewStyles.teacher_student_action_panel}><header><span>Saldo do ciclo atual</span><strong>{student.remainingClasses} <small>de {student.initialMonthlyClasses} aulas</small></strong></header><div className={viewStyles.teacher_student_balance_actions}><SafeActionForm action={adjustTeacherStudentBalanceAction}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="studentId" value={student.id} /><input type="hidden" name="classesDelta" value="1" /><SubmitButton label="Adicionar 1 aula" pendingLabel="Adicionando..." className={viewStyles.button_button_small} /></SafeActionForm><SafeActionForm action={adjustTeacherStudentBalanceAction}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="studentId" value={student.id} /><input type="hidden" name="classesDelta" value="-1" /><SubmitButton label="Remover 1 aula" pendingLabel="Removendo..." className={viewStyles.button_button_small_button_secondary} /></SafeActionForm></div></section> : null}
      {action === "notice" ? <section className={viewStyles.teacher_student_action_panel}><header><span>Aviso particular</span><small>Somente {student.name} receberá esta notificação.</small></header><SafeActionForm action={notifyTeacherStudentAction} className={viewStyles.teacher_student_notice_form}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="studentId" value={student.id} /><textarea name="message" value={notice} onChange={(event) => setNotice(event.target.value.slice(0, 500))} placeholder="Escreva um aviso para o aluno…" required /><footer><small>{notice.length}/500</small><SubmitButton label="Publicar aviso" pendingLabel="Enviando..." className={viewStyles.button_button_small} /></footer></SafeActionForm></section> : null}
      {action === "class" && student.classGroup ? <section className={viewStyles.teacher_student_action_panel}><header><span>Turma atual</span><strong>{student.classGroup.name}</strong></header><SafeActionForm action={moveClassGroupStudentAction} className={viewStyles.teacher_student_class_form}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="studentId" value={student.id} /><label><span>Nova turma</span><select name="destinationClassGroupId" defaultValue=""><option value="" disabled>Selecione uma turma</option>{classGroups.filter((group) => group.id !== student.classGroup?.id).map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><SubmitButton label="Transferir" pendingLabel="Movendo..." className={viewStyles.button_button_small} /></SafeActionForm></section> : null}
    </div>
  </details>;
}

export function TeacherPortalStudentList({ arenaSlug, students, classGroups }: { arenaSlug: string; students: Student[]; classGroups: ClassGroup[] }) {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("all");
  const plans = useMemo(() => [...new Set(students.map((student) => student.planName))].sort((a, b) => a.localeCompare(b, "pt-BR")), [students]);
  const visibleStudents = useMemo(() => { const normalized = query.trim().toLocaleLowerCase("pt-BR"); return students.filter((student) => (plan === "all" || student.planName === plan) && (!normalized || student.name.toLocaleLowerCase("pt-BR").includes(normalized))); }, [plan, query, students]);
  return <><div className={viewStyles.teacher_portal_student_filters}><label><span>Buscar aluno</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome" type="search" /></label><label><span>Plano</span><select value={plan} onChange={(event) => setPlan(event.target.value)}><option value="all">Todos os planos</option>{plans.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><small>{visibleStudents.length} de {students.length} aluno(s)</small></div><div className={viewStyles.teacher_portal_student_list}>{visibleStudents.map((student) => <StudentCard key={student.id} arenaSlug={arenaSlug} student={student} classGroups={classGroups} />)}{!visibleStudents.length ? <p className={viewStyles.teacher_portal_empty_filter}>Nenhum aluno corresponde à busca.</p> : null}</div></>;
}
